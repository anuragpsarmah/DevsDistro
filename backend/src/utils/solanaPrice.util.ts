import axios from "axios";
import { redisClient } from "..";
import logger from "../logger/logger";

const REDIS_KEY = "coingecko_sol_usd_rate";
// 5-minute cache: SOL/USD doesn't move meaningfully within 5 minutes, and users
// can always click "Refresh Quote" to get a fresh rate. This keeps us well under
// the CoinGecko free-tier rate limit (30 req/min shared across all users).
const CACHE_TTL_SECONDS = 300;
// Stale-cache last resort: if all live oracles fail, serve a cached rate up to
// 30 minutes old rather than returning 503. This keeps purchases working during
// brief oracle outages. The buy-price may be slightly off (mitigated by ±5 lamport
// tolerance and the fact that the user can always refresh the quote).
const STALE_CACHE_MAX_AGE_SECONDS = 1800; // 30 minutes

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
// Binance public ticker — no API key required, high reliability
const BINANCE_URL =
  "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT";

interface SolanaRateResult {
  rate: number;
  source: string;
  fetched_at: Date;
}

// ── Internal: try a single oracle URL, return rate or throw ──────────────────

async function fetchFromCoinGecko(): Promise<number> {
  const response = await axios.get<{ solana: { usd: number } }>(COINGECKO_URL, {
    timeout: 5000,
  });
  const rate = response.data?.solana?.usd;
  if (!rate || typeof rate !== "number" || rate <= 0) {
    throw new Error("Invalid rate from CoinGecko");
  }
  return rate;
}

async function fetchFromBinance(): Promise<number> {
  const response = await axios.get<{ price: string }>(BINANCE_URL, {
    timeout: 5000,
  });
  const rate = parseFloat(response.data?.price);
  if (!rate || isNaN(rate) || rate <= 0) {
    throw new Error("Invalid rate from Binance");
  }
  return rate;
}

// ── Public: fetch with fallback chain ────────────────────────────────────────

export async function getSolanaUsdRate(): Promise<SolanaRateResult> {
  // ── 1. Redis cache (primary, fast path) ──────────────────────────────────
  let cachedStr: string | null = null;
  try {
    cachedStr = await redisClient.get(REDIS_KEY);
  } catch (redisError) {
    logger.warn("Redis read failed for SOL rate cache", redisError);
  }

  if (cachedStr) {
    try {
      const cached = JSON.parse(cachedStr);
      return {
        rate: cached.rate,
        source: cached.source ?? "CoinGecko",
        fetched_at: new Date(cached.fetched_at),
      };
    } catch {
      // Corrupted cache — fall through to live fetch
    }
  }

  const fetched_at = new Date();
  let rate: number | null = null;
  let source: string | null = null;

  // ── 2. CoinGecko (primary oracle) ────────────────────────────────────────
  try {
    rate = await fetchFromCoinGecko();
    source = "CoinGecko";
  } catch (cgErr) {
    logger.warn(
      "CoinGecko SOL/USD fetch failed, trying Binance fallback",
      cgErr
    );
  }

  // ── 3. Binance (fallback oracle) ──────────────────────────────────────────
  if (rate === null) {
    try {
      rate = await fetchFromBinance();
      source = "Binance";
    } catch (binanceErr) {
      logger.warn("Binance SOL/USD fetch failed", binanceErr);
    }
  }

  // ── 4. Stale-cache last resort ────────────────────────────────────────────
  // If all live oracles fail, serve a stale cached rate (up to 30 min old)
  // so that brief outages don't block all purchases.
  if (rate === null) {
    try {
      const staleKey = `${REDIS_KEY}_stale`;
      const staleStr = await redisClient.get(staleKey);
      if (staleStr) {
        const stale = JSON.parse(staleStr);
        const ageSeconds =
          (Date.now() - new Date(stale.fetched_at).getTime()) / 1000;
        if (ageSeconds <= STALE_CACHE_MAX_AGE_SECONDS && stale.rate > 0) {
          logger.warn(
            `All live oracles unavailable — serving stale SOL/USD rate (age: ${Math.round(ageSeconds)}s)`,
            { rate: stale.rate }
          );
          return {
            rate: stale.rate,
            source: `${stale.source ?? "cached"} (stale, ${Math.round(ageSeconds / 60)}min ago)`,
            fetched_at: new Date(stale.fetched_at),
          };
        }
      }
    } catch (staleErr) {
      logger.warn("Failed to read stale SOL rate cache", staleErr);
    }

    throw new Error("Price oracle unavailable, please try again shortly");
  }

  // ── Cache result (primary TTL + stale backup) ─────────────────────────────
  const cachePayload = JSON.stringify({
    rate,
    source,
    fetched_at: fetched_at.toISOString(),
  });

  try {
    await Promise.all([
      redisClient.setex(REDIS_KEY, CACHE_TTL_SECONDS, cachePayload),
      // Stale backup key has no TTL — it's always overwritten with the latest
      // successful fetch and is only served when both live oracles are down.
      redisClient.set(`${REDIS_KEY}_stale`, cachePayload),
    ]);
  } catch (redisError) {
    logger.warn("Redis write failed for SOL rate cache", redisError);
  }

  return { rate: rate!, source: source!, fetched_at };
}

/**
 * Compute lamport split for a given total SOL amount.
 * Seller receives 99%, platform receives 1%.
 * sellerLamports + platformLamports always equals totalLamports exactly.
 */
export function computeLamportSplit(priceSolTotal: number): {
  totalLamports: number;
  sellerLamports: number;
  platformLamports: number;
  priceSolSeller: number;
  priceSolPlatform: number;
} {
  const LAMPORTS_PER_SOL = 1_000_000_000;
  const totalLamports = Math.round(priceSolTotal * LAMPORTS_PER_SOL);
  const sellerLamports = Math.floor((totalLamports * 99) / 100);
  const platformLamports = totalLamports - sellerLamports;

  return {
    totalLamports,
    sellerLamports,
    platformLamports,
    priceSolSeller: sellerLamports / LAMPORTS_PER_SOL,
    priceSolPlatform: platformLamports / LAMPORTS_PER_SOL,
  };
}
