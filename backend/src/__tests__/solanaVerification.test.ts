/**
 * Unit tests for verifySolanaTransaction.
 *
 * This is the core security function of the payment flow. It inspects
 * an on-chain transaction and decides whether to grant access to a project.
 * Every rejection path must be tested — a bug here means either money is
 * accepted without a valid payment, or valid payments are incorrectly rejected.
 *
 * The Solana RPC call (axios.post) is mocked so no network is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock axios before importing the module under test.
// vi.mock calls are hoisted above imports by Vitest.
vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("../logger/logger", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import axios from "axios";
import { verifySolanaTransaction } from "../utils/solanaVerification.util";

// ─── Constants (taken from the real test purchase in the DB) ─────────────────
const BUYER = "BZMkpMcJYbsu2UZdHaGquTWsvXAuX3G9mcJHA5TsDqXK";
const SELLER = "ppjF9VR27TTxWCgWiGnjzEjuMBZDtyY9WQD5eCvyzNk";
const TREASURY = "AP3T1RCrTYSyC2Zq9Tq8ZJiKvWmatzbpzJgNZyET4Z4B";
const REF = "c77d331a28821988c457876559e43f9430371c1262ca59d6222837ab48b98078";
const TX_SIG =
  "4CttUS628uKGA3tDSp45KrvoFDqckYaZkVmAEhWfMp6XxNwYF8ueq4xZyaFGVznoKDetwoLR8DnvQgUik4MhVgkr";
const RPC_URL = "https://api.devnet.solana.com";

const SELLER_LAMPORTS = 11_454_356;
const TREASURY_LAMPORTS = 115_701;

// ─── Default params object ───────────────────────────────────────────────────
const BASE_PARAMS = {
  txSignature: TX_SIG,
  expectedBuyerWallet: BUYER,
  expectedSellerWallet: SELLER,
  expectedTreasuryWallet: TREASURY,
  expectedSellerLamports: SELLER_LAMPORTS,
  expectedTreasuryLamports: TREASURY_LAMPORTS,
  purchaseReference: REF,
  rpcUrl: RPC_URL,
};

// ─── Mock RPC response builder ───────────────────────────────────────────────
//
// Constructs a mock axios response that looks like a real Solana jsonParsed
// getTransaction result. Individual fields can be overridden per test.
interface MockTxOptions {
  buyerPubkey?: string;
  sellerPubkey?: string;
  treasuryPubkey?: string;
  sellerReceived?: number;
  treasuryReceived?: number;
  memo?: string | null; // null = omit memo instruction entirely
  metaErr?: unknown; // non-null = transaction failed on-chain
}

function buildRpcResponse({
  buyerPubkey = BUYER,
  sellerPubkey = SELLER,
  treasuryPubkey = TREASURY,
  sellerReceived = SELLER_LAMPORTS,
  treasuryReceived = TREASURY_LAMPORTS,
  memo = REF as string | null,
  metaErr = null,
}: MockTxOptions = {}) {
  const instructions: unknown[] = [
    // Two SystemProgram transfers (buyer → seller, buyer → treasury)
    { programId: "11111111111111111111111111111111" },
    { programId: "11111111111111111111111111111111" },
  ];

  if (memo !== null) {
    instructions.push({ program: "spl-memo", parsed: memo });
  }

  return {
    data: {
      result: {
        meta: {
          err: metaErr,
          // Indices align with accountKeys below
          preBalances: [1_000_000_000, 0, 0],
          postBalances: [
            1_000_000_000 - sellerReceived - treasuryReceived - 5_000,
            sellerReceived,
            treasuryReceived,
          ],
        },
        transaction: {
          message: {
            accountKeys: [
              { pubkey: buyerPubkey }, // index 0 = fee payer
              { pubkey: sellerPubkey }, // index 1
              { pubkey: treasuryPubkey }, // index 2
            ],
            instructions,
          },
        },
      },
    },
  };
}

const mockPost = vi.mocked(axios.post);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("verifySolanaTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it("returns valid: true for a fully correct transaction", async () => {
    mockPost.mockResolvedValueOnce(buildRpcResponse());
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // ── Network / RPC failures ──────────────────────────────────────────────────

  it("returns valid: false when the RPC call throws a network error", async () => {
    mockPost.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Failed to reach Solana network");
  });

  it("returns valid: false when the transaction is not found (null result)", async () => {
    mockPost.mockResolvedValueOnce({ data: { result: null } });
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  // ── On-chain failure ────────────────────────────────────────────────────────

  it("returns valid: false when the transaction failed on-chain (meta.err !== null)", async () => {
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({
        metaErr: { InstructionError: [0, "InvalidAccountData"] },
      })
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/failed on-chain/i);
  });

  // ── Wallet identity checks ──────────────────────────────────────────────────

  it("returns valid: false when the fee payer (index 0) is not the expected buyer", async () => {
    // Attacker uses their own wallet as fee payer but claims to be BUYER
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({ buyerPubkey: SELLER }) // SELLER is at index 0 instead
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/fee payer/i);
  });

  it("returns valid: false when the seller wallet is absent from the transaction", async () => {
    // The transaction doesn't include the seller — money didn't go to them
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({ sellerPubkey: BUYER }) // seller replaced with another account
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/seller wallet not found/i);
  });

  it("returns valid: false when the treasury wallet is absent from the transaction", async () => {
    // The transaction doesn't include the treasury — platform fee wasn't paid
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({ treasuryPubkey: BUYER }) // treasury replaced with another account
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/treasury wallet not found/i);
  });

  // ── Lamport amount checks ───────────────────────────────────────────────────

  it("returns valid: false when seller is underpaid by more than the 5-lamport tolerance", async () => {
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({ sellerReceived: SELLER_LAMPORTS - 6 })
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/insufficient SOL/i);
  });

  it("returns valid: true when seller receives exactly at the tolerance boundary (expected - 5)", async () => {
    // Boundary test: exactly 5 lamports short should still pass
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({ sellerReceived: SELLER_LAMPORTS - 5 })
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(true);
  });

  it("returns valid: false when treasury is underpaid by more than the 5-lamport tolerance", async () => {
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({ treasuryReceived: TREASURY_LAMPORTS - 6 })
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/platform fee not received/i);
  });

  it("returns valid: true when treasury receives exactly at the tolerance boundary (expected - 5)", async () => {
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({ treasuryReceived: TREASURY_LAMPORTS - 5 })
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(true);
  });

  it("returns valid: false when seller received 0 lamports (theft attempt)", async () => {
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({ sellerReceived: 0, treasuryReceived: 0 })
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
  });

  // ── Memo / anti-replay checks ───────────────────────────────────────────────

  it("returns valid: false when there is no memo instruction in the transaction", async () => {
    mockPost.mockResolvedValueOnce(buildRpcResponse({ memo: null }));
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/memo instruction not found/i);
  });

  it("returns valid: false when the memo contains the reference as a substring (not exact match)", async () => {
    // This directly tests the includes() → strict === fix.
    // An attacker could embed our reference inside a longer memo if we used includes().
    const embeddedMemo = `malicious_prefix_${REF}_malicious_suffix`;
    mockPost.mockResolvedValueOnce(buildRpcResponse({ memo: embeddedMemo }));
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/does not match/i);
  });

  it("returns valid: false when the memo is a completely different string", async () => {
    mockPost.mockResolvedValueOnce(
      buildRpcResponse({
        memo: "aaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666gggg7777hhhh8888",
      })
    );
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
  });

  it("returns valid: true when the memo has surrounding whitespace (SPL Memo sometimes appends newlines)", async () => {
    // Verifies the .trim() in our memo check handles whitespace padding
    mockPost.mockResolvedValueOnce(buildRpcResponse({ memo: `  ${REF}\n` }));
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(true);
  });

  it("returns valid: true when memo uses the base64 data field instead of the parsed field", async () => {
    // Some RPC nodes return memo data as base64 instead of parsed string
    const memoAsBase64 = Buffer.from(REF, "utf-8").toString("base64");
    const response = buildRpcResponse({ memo: null }); // start with no memo
    // Manually inject a base64 memo instruction
    (response.data.result.transaction.message.instructions as unknown[]).push({
      programId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      data: memoAsBase64,
    });
    mockPost.mockResolvedValueOnce(response);
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(true);
  });

  // ── Malformed RPC response edge cases ──────────────────────────────────────

  it("returns valid: false when accountKeys is an empty array (buyer check fails gracefully)", async () => {
    // If the RPC returns no account keys, accountKeys[0] is undefined,
    // which !== expectedBuyerWallet, so the fee-payer check must catch it.
    const response = buildRpcResponse();
    response.data.result.transaction.message.accountKeys = [];
    mockPost.mockResolvedValueOnce(response);
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/fee payer/i);
  });

  it("returns valid: false when preBalances and postBalances have mismatched lengths", async () => {
    // The balance arrays being out of sync indicates a malformed RPC response.
    const response = buildRpcResponse();
    response.data.result.meta.preBalances = [1_000_000_000]; // length 1
    response.data.result.meta.postBalances = [900_000_000, 50_000]; // length 2
    mockPost.mockResolvedValueOnce(response);
    const result = await verifySolanaTransaction(BASE_PARAMS);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/malformed/i);
  });

  it("documents behavior when seller and treasury are the same wallet (single wallet receives both splits)", async () => {
    // If seller === treasury, sellerIndex === treasuryIndex and both delta checks
    // operate on the same balance entry. The combined delta (sellerReceived in this
    // mock) must satisfy BOTH the seller AND treasury minimum checks individually.
    // A single transfer of sellerLamports alone would fail the treasury check.
    // This test documents the current behavior so any change is intentional.
    const sameWallet = SELLER; // treasury is same as seller
    const params = { ...BASE_PARAMS, expectedTreasuryWallet: sameWallet };

    // The mock places seller at index 1; treasury (now same wallet) also resolves to index 1.
    // Combined delta at index 1 = SELLER_LAMPORTS.
    // seller check: SELLER_LAMPORTS >= SELLER_LAMPORTS - 5 → passes.
    // treasury check: SELLER_LAMPORTS >= TREASURY_LAMPORTS - 5 → passes (SELLER > TREASURY).
    // So a single payment to that wallet passes both — this is the expected (if unusual) outcome.
    mockPost.mockResolvedValueOnce(buildRpcResponse());
    const result = await verifySolanaTransaction(params);
    // Document result: currently passes because seller delta satisfies treasury minimum too.
    // If this behavior is ever changed (e.g., require distinct wallets), update this test.
    expect(result.valid).toBe(true);
  });
});
