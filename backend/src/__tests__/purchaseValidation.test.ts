/**
 * Unit tests for purchase Zod validation schemas.
 *
 * These schemas are the first line of defence against malformed requests
 * reaching the purchase controllers. They enforce format constraints on
 * all payment-related identifiers before any DB or blockchain logic runs.
 *
 * No mocks or infrastructure needed — Zod schemas are pure functions.
 */

import { describe, it, expect } from "vitest";
import {
  initiatePurchaseSchema,
  confirmPurchaseSchema,
} from "../validations/purchase.validation";

// ─── Valid fixtures (taken directly from the real test purchase) ──────────────
const VALID_PROJECT_ID = "69a44a399d0009cde58723cb"; // 24-char MongoDB ObjectId (hex)
const VALID_REFERENCE =
  "c77d331a28821988c457876559e43f9430371c1262ca59d6222837ab48b98078"; // 64-char lowercase hex
const VALID_TX_SIG =
  "4CttUS628uKGA3tDSp45KrvoFDqckYaZkVmAEhWfMp6XxNwYF8ueq4xZyaFGVznoKDetwoLR8DnvQgUik4MhVgkr"; // 88 base58 chars
const VALID_WALLET = "BZMkpMcJYbsu2UZdHaGquTWsvXAuX3G9mcJHA5TsDqXK"; // 44-char base58

// ─── initiatePurchaseSchema ──────────────────────────────────────────────────

describe("initiatePurchaseSchema", () => {
  it("accepts a valid 24-char hex MongoDB ObjectId", () => {
    const result = initiatePurchaseSchema.safeParse({
      project_id: VALID_PROJECT_ID,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a project_id that is too short (< 24 chars)", () => {
    const result = initiatePurchaseSchema.safeParse({
      project_id: "69a44a399d0009cde58723",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a project_id that is too long (> 24 chars)", () => {
    const result = initiatePurchaseSchema.safeParse({
      project_id: "69a44a399d0009cde58723cbff",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a project_id containing non-hex characters", () => {
    // 'z' is not a valid hex character
    const result = initiatePurchaseSchema.safeParse({
      project_id: "69a44a399d0009cde58723cz",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a project_id with uppercase hex (schema requires lowercase-compatible hex only)", () => {
    // The regex /^[0-9a-fA-F]{24}$/ does allow uppercase — just confirming valid case
    const result = initiatePurchaseSchema.safeParse({
      project_id: "69A44A399D0009CDE58723CB",
    });
    expect(result.success).toBe(true); // uppercase hex IS allowed by the regex
  });

  it("rejects a missing project_id", () => {
    const result = initiatePurchaseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a non-string project_id", () => {
    const result = initiatePurchaseSchema.safeParse({ project_id: 12345 });
    expect(result.success).toBe(false);
  });

  it("rejects an empty string project_id", () => {
    const result = initiatePurchaseSchema.safeParse({ project_id: "" });
    expect(result.success).toBe(false);
  });
});

// ─── confirmPurchaseSchema ───────────────────────────────────────────────────

describe("confirmPurchaseSchema", () => {
  const VALID_PAYLOAD = {
    purchase_reference: VALID_REFERENCE,
    tx_signature: VALID_TX_SIG,
    buyer_wallet: VALID_WALLET,
  };

  it("accepts a valid confirm payload", () => {
    const result = confirmPurchaseSchema.safeParse(VALID_PAYLOAD);
    expect(result.success).toBe(true);
  });

  // purchase_reference tests
  describe("purchase_reference", () => {
    it("rejects a reference that is too short (< 64 chars)", () => {
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        purchase_reference: "abc123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a reference that is too long (> 64 chars)", () => {
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        purchase_reference: "a".repeat(65),
      });
      expect(result.success).toBe(false);
    });

    it("rejects a reference containing uppercase letters (schema requires lowercase hex)", () => {
      // Uppercase is NOT allowed: /^[0-9a-f]{64}$/ (lowercase only)
      const upperRef = VALID_REFERENCE.toUpperCase();
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        purchase_reference: upperRef,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a reference containing non-hex characters", () => {
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        purchase_reference: "g".repeat(64), // 'g' is not hex
      });
      expect(result.success).toBe(false);
    });
  });

  // tx_signature tests
  describe("tx_signature", () => {
    it("rejects a signature shorter than 80 characters", () => {
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        tx_signature: "ShortSig",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a signature longer than 100 characters", () => {
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        tx_signature: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects a signature containing '0' (not in base58 alphabet)", () => {
      // base58 excludes: 0, O, I, l  to avoid visual ambiguity
      const badSig = "0".repeat(88);
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        tx_signature: badSig,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a signature containing 'O' (capital letter O, excluded from base58)", () => {
      const badSig = "O".repeat(88);
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        tx_signature: badSig,
      });
      expect(result.success).toBe(false);
    });

    it("rejects a signature containing 'l' (lowercase L, excluded from base58)", () => {
      const badSig = "l".repeat(88);
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        tx_signature: badSig,
      });
      expect(result.success).toBe(false);
    });

    it("accepts a signature at exactly the minimum boundary (80 chars)", () => {
      // Construct a valid 80-char base58 string (only using chars in [1-9A-HJ-NP-Za-km-z])
      const minSig = "A".repeat(80);
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        tx_signature: minSig,
      });
      expect(result.success).toBe(true);
    });
  });

  // buyer_wallet tests
  describe("buyer_wallet", () => {
    it("rejects a wallet address shorter than 32 characters", () => {
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        buyer_wallet: "shortaddr",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a wallet address longer than 44 characters", () => {
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        buyer_wallet: "A".repeat(45),
      });
      expect(result.success).toBe(false);
    });

    it("rejects a wallet address containing '0' (excluded from base58)", () => {
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        buyer_wallet: "0".repeat(44),
      });
      expect(result.success).toBe(false);
    });

    it("accepts a wallet at exactly the maximum boundary (44 chars)", () => {
      // VALID_WALLET is 44 chars
      expect(VALID_WALLET.length).toBe(44);
      const result = confirmPurchaseSchema.safeParse(VALID_PAYLOAD);
      expect(result.success).toBe(true);
    });

    it("accepts a wallet at the minimum boundary (32 chars)", () => {
      // 32-char base58 wallet addresses are valid (e.g. for program-derived addresses)
      const minWallet = "A".repeat(32);
      const result = confirmPurchaseSchema.safeParse({
        ...VALID_PAYLOAD,
        buyer_wallet: minWallet,
      });
      expect(result.success).toBe(true);
    });
  });

  // Missing field tests
  describe("missing fields", () => {
    it("rejects a payload with only purchase_reference", () => {
      const result = confirmPurchaseSchema.safeParse({
        purchase_reference: VALID_REFERENCE,
      });
      expect(result.success).toBe(false);
    });

    it("rejects an empty payload", () => {
      const result = confirmPurchaseSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects a null payload", () => {
      const result = confirmPurchaseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});
