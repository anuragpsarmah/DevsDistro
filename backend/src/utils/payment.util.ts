import { DEFAULT_PAYMENT_CURRENCY, USDC_DECIMALS } from "../types/constants";

export type PaymentCurrency = "USDC" | "SOL";

const MAINNET_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const DEVNET_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export function normalizePaymentCurrency(
  currency?: string | null
): PaymentCurrency {
  return currency === "SOL" ? "SOL" : DEFAULT_PAYMENT_CURRENCY;
}

export function resolveStoredPaymentCurrency(payment: {
  payment_currency?: string | null;
  payment_mint?: string | null;
  payment_decimals?: number | null;
  payment_total?: number | null;
  payment_seller?: number | null;
  payment_platform?: number | null;
  price_sol_total?: number | null;
  price_sol_seller?: number | null;
  price_sol_platform?: number | null;
}): PaymentCurrency {
  if (
    payment.payment_currency === "USDC" ||
    payment.payment_currency === "SOL"
  ) {
    return payment.payment_currency;
  }

  const hasLegacySolAmounts =
    (payment.price_sol_total ?? 0) > 0 ||
    (payment.price_sol_seller ?? 0) > 0 ||
    (payment.price_sol_platform ?? 0) > 0;

  if (hasLegacySolAmounts) {
    return "SOL";
  }

  const hasExplicitUsdcMetadata =
    Boolean(payment.payment_mint) ||
    payment.payment_decimals === USDC_DECIMALS ||
    payment.payment_total != null ||
    payment.payment_seller != null ||
    payment.payment_platform != null;

  if (hasExplicitUsdcMetadata) {
    return "USDC";
  }

  return DEFAULT_PAYMENT_CURRENCY;
}

export function resolveUsdcMintAddress(
  networkRaw?: string,
  envMint?: string
): string | null {
  if (envMint) {
    return envMint;
  }

  const network = (networkRaw || "").toLowerCase();
  if (network === "mainnet" || network === "mainnet-beta") {
    return MAINNET_USDC_MINT;
  }
  if (network === "devnet") {
    return DEVNET_USDC_MINT;
  }

  return null;
}

export function computeUsdcSplit(priceUsd: number): {
  totalAtomic: number;
  sellerAtomic: number;
  platformAtomic: number;
  paymentTotal: number;
  paymentSeller: number;
  paymentPlatform: number;
} {
  const scale = 10 ** USDC_DECIMALS;
  const totalAtomic = Math.round(priceUsd * scale);
  const sellerAtomic = Math.floor((totalAtomic * 99) / 100);
  const platformAtomic = totalAtomic - sellerAtomic;

  return {
    totalAtomic,
    sellerAtomic,
    platformAtomic,
    paymentTotal: totalAtomic / scale,
    paymentSeller: sellerAtomic / scale,
    paymentPlatform: platformAtomic / scale,
  };
}

export function derivePaymentSummary(payment: {
  payment_currency?: string | null;
  payment_total?: number | null;
  payment_seller?: number | null;
  payment_platform?: number | null;
  payment_mint?: string | null;
  payment_decimals?: number | null;
  price_sol_total?: number | null;
  price_sol_seller?: number | null;
  price_sol_platform?: number | null;
}) {
  const paymentCurrency = resolveStoredPaymentCurrency(payment);

  return {
    payment_currency: paymentCurrency,
    payment_total:
      payment.payment_total ??
      (paymentCurrency === "SOL" ? (payment.price_sol_total ?? 0) : 0),
    payment_seller:
      payment.payment_seller ??
      (paymentCurrency === "SOL" ? (payment.price_sol_seller ?? 0) : 0),
    payment_platform:
      payment.payment_platform ??
      (paymentCurrency === "SOL" ? (payment.price_sol_platform ?? 0) : 0),
    payment_mint: payment.payment_mint ?? null,
    payment_decimals:
      payment.payment_decimals ??
      (paymentCurrency === "USDC" ? USDC_DECIMALS : 9),
  };
}
