/**
 * Integration tests for the purchase controller (all 5 endpoints).
 *
 * Each handler is exercised with mocked DB, Redis, S3, and Solana utilities so
 * no real infrastructure is required. Tests verify:
 *   1. Happy paths produce the right DB writes and HTTP responses
 *   2. All validation rejection paths return the correct status codes
 *   3. Security invariants: buyer identity, idempotency, anti-replay
 *   4. Retry safety: a user whose TX is confirmed on-chain can always recover
 *      even if the backend 500'd on the first attempt
 *
 * ── DESIGN NOTE: retryConfirm safety ────────────────────────────────────────
 * The /confirm endpoint is designed so that the on-chain TX can always be
 * recovered:
 *
 *   1. tx_signature idempotency check runs FIRST (before touching Redis).
 *      If the purchase is already in the DB (first attempt succeeded but
 *      response was lost), we return 200 immediately without re-processing.
 *
 *   2. Redis intent is read with GET (non-destructive), not GETDEL.
 *      The intent is only deleted with DEL AFTER Purchase.create succeeds.
 *      If create fails, the intent stays in Redis so the user can retry.
 *
 *   3. A race-check (second Purchase.findOne) runs when Redis has no intent,
 *      in case a concurrent request won the race and already saved the purchase.
 *
 * This eliminates the previous GETDEL-first bug where a user could pay
 * on-chain, have the backend fail to write to DB, and be stuck with a 410
 * forever on retry because the intent was already consumed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks (hoisted above imports by Vitest) ─────────────────────────────────

vi.mock("..", () => ({
  redisClient: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
  },
  s3Service: {
    createSignedDownloadUrl: vi.fn(),
  },
}));

vi.mock("../models/project.model", () => ({
  Project: { findById: vi.fn() },
}));

vi.mock("../models/user.model", () => ({
  User: { findById: vi.fn(), updateOne: vi.fn() },
}));

vi.mock("../models/githubAppInstallation.model", () => ({
  GitHubAppInstallation: { findOne: vi.fn() },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: { findOne: vi.fn(), find: vi.fn(), create: vi.fn() },
}));

vi.mock("../models/sales.model", () => {
  return {
    Sales: Object.assign(vi.fn(), {
      // Step 1a: upsert the Sales document itself
      // Step 1b: push current year entry if absent
      // Step 2:  atomic $inc
      // All three calls use updateOne — mock it to succeed by default.
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    }),
  };
});

vi.mock("../utils/solanaPrice.util", () => ({
  getSolanaUsdRate: vi.fn(),
  computeLamportSplit: vi.fn(),
}));

// Minimal PDFDocument stub: tracks text() calls and pipes to the response.
vi.mock("pdfkit", () => {
  function MockPDFDocument(this: any) {
    this._texts = [] as string[];
    this.page = { width: 595, height: 841 };
    const self = this;
    const chain = () => self;
    this.pipe = vi.fn().mockImplementation((dest: any) => {
      self._dest = dest;
    });
    this.end = vi.fn().mockImplementation(() => {
      /* no-op */
    });
    this.font = vi.fn().mockReturnValue(self);
    this.fontSize = vi.fn().mockReturnValue(self);
    this.fillColor = vi.fn().mockReturnValue(self);
    this.text = vi.fn().mockImplementation((t: string) => {
      self._texts.push(t);
      return self;
    });
    this.moveTo = vi.fn().mockReturnValue(self);
    this.lineTo = vi.fn().mockReturnValue(self);
    this.lineWidth = vi.fn().mockReturnValue(self);
    this.stroke = vi.fn().mockReturnValue(self);
    this.path = vi.fn().mockReturnValue(self);
    this.clip = vi.fn().mockReturnValue(self);
    this.save = vi.fn().mockReturnValue(self);
    this.restore = vi.fn().mockReturnValue(self);
    this.fill = vi.fn().mockReturnValue(self);
    this.addPage = vi.fn().mockReturnValue(self);
    this.moveDown = vi.fn().mockReturnValue(self);
    this.y = 150;
  }
  return { default: vi.fn().mockImplementation(MockPDFDocument) };
});

vi.mock("../utils/solanaVerification.util", () => ({
  verifySolanaTransaction: vi.fn(),
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  initiatePurchase,
  confirmPurchase,
  getPurchasedProjects,
  downloadProject,
  downloadReceipt,
} from "../controllers/purchase.controller";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { Purchase } from "../models/purchase.model";
import { Sales } from "../models/sales.model";
import {
  getSolanaUsdRate,
  computeLamportSplit,
} from "../utils/solanaPrice.util";
import { verifySolanaTransaction } from "../utils/solanaVerification.util";
import { redisClient, s3Service } from "..";

// ─── Test utilities ───────────────────────────────────────────────────────────

/** Wait for all pending microtasks / Promise callbacks to settle. */
const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

const makeReq = (overrides: Record<string, unknown> = {}) =>
  ({
    user: { _id: BUYER_ID, username: "testbuyer" },
    body: {},
    query: {},
    cookies: {},
    get: vi.fn().mockReturnValue(undefined),
    ...overrides,
  }) as any;

/**
 * Returns a chainable mock that simulates `.select().lean()`.
 * Used for Mongoose query chains like Model.findById(id).select('...').lean()
 */
function mockSelectLean(value: unknown) {
  const leanFn = vi.fn().mockResolvedValue(value);
  const selectFn = vi.fn().mockReturnValue({ lean: leanFn });
  return { select: selectFn, lean: leanFn };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_ID = "507f1f77bcf86cd799439011";
const SELLER_ID = "507f1f77bcf86cd799439022";
const PROJECT_ID = "507f1f77bcf86cd799439033";
const PURCHASE_ID = "507f1f77bcf86cd799439044";
const TREASURY_ADDR = "AP3T1RCrTYSyC2Zq9Tq8ZJiKvWmatzbpzJgNZyET4Z4B";
const SELLER_WALLET = "ppjF9VR27TTxWCgWiGnjzEjuMBZDtyY9WQD5eCvyzNk";
const BUYER_WALLET = "BZMkpMcJYbsu2UZdHaGquTWsvXAuX3G9mcJHA5TsDqXK";
const TX_SIG =
  "4CttUS628uKGA3tDSp45KrvoFDqckYaZkVmAEhWfMp6XxNwYF8ueq4xZyaFGVznoKDetwoLR8DnvQgUik4MhVgkr";
const PURCHASE_REF =
  "c77d331a28821988c457876559e43f9430371c1262ca59d6222837ab48b98078";

const MOCK_PROJECT = {
  _id: PROJECT_ID,
  userid: { toString: () => SELLER_ID }, // ObjectId-like
  price: 10,
  isActive: true,
  github_access_revoked: false,
  repo_zip_status: "SUCCESS",
  repo_zip_s3_key: "zips/project-abc.zip",
  scheduled_deletion_at: null,
  title: "Test Project",
  project_type: "Web App",
  github_installation_id: "inst-123",
};

const MOCK_SELLER = {
  wallet_address: SELLER_WALLET,
  name: "Test Seller",
  username: "testseller",
  profile_image_url: "",
};

const MOCK_RATE_RESULT = {
  rate: 100,
  source: "CoinGecko",
  fetched_at: new Date("2024-01-01"),
};

const MOCK_LAMPORT_SPLIT = {
  totalLamports: 100_000_000,
  sellerLamports: 99_000_000,
  platformLamports: 1_000_000,
  priceSolSeller: 0.099,
  priceSolPlatform: 0.001,
};

const MOCK_INTENT_OBJ = {
  buyerId: BUYER_ID,
  sellerId: SELLER_ID,
  projectId: PROJECT_ID,
  price_usd: 10,
  price_sol_total: 0.1,
  price_sol_seller: 0.099,
  price_sol_platform: 0.001,
  total_lamports: 100_000_000,
  seller_lamports: 99_000_000,
  treasury_lamports: 1_000_000,
  sol_usd_rate: 100,
  exchange_rate_source: "CoinGecko",
  exchange_rate_fetched_at: "2024-01-01T00:00:00.000Z",
  seller_wallet: SELLER_WALLET,
  treasury_wallet: TREASURY_ADDR,
};

const VALID_INITIATE_BODY = { project_id: PROJECT_ID };
const VALID_CONFIRM_BODY = {
  purchase_reference: PURCHASE_REF,
  tx_signature: TX_SIG,
  buyer_wallet: BUYER_WALLET,
};

// ─────────────────────────────────────────────────────────────────────────────
// initiatePurchase
// ─────────────────────────────────────────────────────────────────────────────

describe("initiatePurchase", () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SOLANA_TREASURY_WALLET = TREASURY_ADDR;
    process.env.SOLANA_RPC_URL = "https://api.devnet.solana.com";
    process.env.PLATFORM_FEE_PERCENT = "1";

    // Happy-path defaults
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean(MOCK_PROJECT) as any
    );
    vi.mocked(Purchase.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);
    vi.mocked(User.findById).mockReturnValue(
      mockSelectLean(MOCK_SELLER) as any
    );
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue(
      mockSelectLean({ suspended_at: null }) as any
    );
    vi.mocked(getSolanaUsdRate).mockResolvedValue(MOCK_RATE_RESULT as any);
    vi.mocked(computeLamportSplit).mockReturnValue(MOCK_LAMPORT_SPLIT as any);
    vi.mocked(redisClient.setex).mockResolvedValue("OK" as any);
  });

  it("returns 200 with a purchase intent when all preconditions are met", async () => {
    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const body = vi.mocked(res.json).mock.calls[0][0];
    expect(body.data).toMatchObject({
      price_usd: 10,
      seller_wallet: SELLER_WALLET,
      treasury_wallet: TREASURY_ADDR,
      expires_in: 600,
    });
    expect(body.data.purchase_reference).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stores the intent in Redis with exactly 600-second TTL", async () => {
    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(redisClient.setex).toHaveBeenCalledWith(
      expect.stringMatching(/^purchase_intent_[0-9a-f]{64}$/),
      600,
      expect.any(String)
    );
  });

  it("returns 400 for an invalid project_id (not a 24-char hex ObjectId)", async () => {
    const req = makeReq({ body: { project_id: "not-an-objectid" } });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when the project does not exist", async () => {
    vi.mocked(Project.findById).mockReturnValue(mockSelectLean(null) as any);

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when the project is inactive (isActive = false)", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({ ...MOCK_PROJECT, isActive: false }) as any
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /not currently active/i
    );
  });

  it("returns 400 when GitHub repository access has been revoked", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({ ...MOCK_PROJECT, github_access_revoked: true }) as any
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(/revoked/i);
  });

  it("returns 400 when repo_zip_status is not SUCCESS (e.g. PROCESSING)", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({ ...MOCK_PROJECT, repo_zip_status: "PROCESSING" }) as any
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(/not ready/i);
  });

  it("returns 400 when the project price is 0 (free project)", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({ ...MOCK_PROJECT, price: 0 }) as any
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(/free/i);
  });

  it("returns 400 when the buyer is attempting to purchase their own project", async () => {
    // The project's seller IS the authenticated buyer
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        ...MOCK_PROJECT,
        userid: { toString: () => BUYER_ID },
      }) as any
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /cannot purchase your own/i
    );
  });

  it("returns 409 when the buyer has already purchased this project", async () => {
    vi.mocked(Purchase.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: "existing-purchase-id" }),
    } as any);

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /already purchased/i
    );
  });

  it("returns 400 when the seller has not connected a Solana wallet", async () => {
    vi.mocked(User.findById).mockReturnValue(
      mockSelectLean({ ...MOCK_SELLER, wallet_address: "" }) as any
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /not connected a payment wallet/i
    );
  });

  it("returns 400 when the seller's GitHub App installation is suspended", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue(
      mockSelectLean({ suspended_at: new Date("2024-06-01") }) as any
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(/suspended/i);
  });

  it("returns 503 when the CoinGecko price oracle is unavailable", async () => {
    vi.mocked(getSolanaUsdRate).mockRejectedValue(
      new Error("Price oracle unavailable, please try again shortly")
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it("returns 500 when SOLANA_TREASURY_WALLET env var is missing", async () => {
    delete process.env.SOLANA_TREASURY_WALLET;

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /configuration error/i
    );
  });

  it("returns 500 when Redis fails to store the intent", async () => {
    vi.mocked(redisClient.setex).mockRejectedValue(
      new Error("Redis unavailable")
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("each purchase intent has a unique purchase_reference", async () => {
    const res1 = makeRes();
    const res2 = makeRes();

    initiatePurchase(makeReq({ body: VALID_INITIATE_BODY }), res1, next);
    initiatePurchase(makeReq({ body: VALID_INITIATE_BODY }), res2, next);
    await flushPromises();

    const ref1 = vi.mocked(res1.json).mock.calls[0][0].data.purchase_reference;
    const ref2 = vi.mocked(res2.json).mock.calls[0][0].data.purchase_reference;
    expect(ref1).not.toBe(ref2);
  });

  it("includes seller_lamports and treasury_lamports in the response for exact frontend TX construction", async () => {
    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const body = vi.mocked(res.json).mock.calls[0][0];
    expect(typeof body.data.seller_lamports).toBe("number");
    expect(typeof body.data.treasury_lamports).toBe("number");
    expect(body.data.seller_lamports).toBe(MOCK_LAMPORT_SPLIT.sellerLamports);
    expect(body.data.treasury_lamports).toBe(
      MOCK_LAMPORT_SPLIT.platformLamports
    );
  });

  // Fix #10: repo_zip_s3_key null even when status is SUCCESS — fail fast at initiate time
  it("returns 400 when repo_zip_s3_key is null despite SUCCESS status (data inconsistency)", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        ...MOCK_PROJECT,
        repo_zip_status: "SUCCESS",
        repo_zip_s3_key: null,
      }) as any
    );

    const req = makeReq({ body: VALID_INITIATE_BODY });
    const res = makeRes();

    initiatePurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(/not ready/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// confirmPurchase
// ─────────────────────────────────────────────────────────────────────────────

describe("confirmPurchase", () => {
  const next = vi.fn();

  const MOCK_PURCHASE_DOC = {
    _id: PURCHASE_ID,
    buyerId: BUYER_ID,
    sellerId: SELLER_ID,
    projectId: PROJECT_ID,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SOLANA_RPC_URL = "https://api.devnet.solana.com";
    process.env.PLATFORM_FEE_PERCENT = "1";

    // Intent exists in Redis by default (GET, not GETDEL — new behaviour)
    vi.mocked(redisClient.get).mockResolvedValue(
      JSON.stringify(MOCK_INTENT_OBJ) as any
    );

    // DEL intent after successful create
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);

    // Reset the queue (vi.clearAllMocks above only clears call counts, not mockReturnValueOnce queues)
    vi.mocked(Purchase.findOne).mockReset();

    // No existing purchase by tx_signature (first call) or (buyerId, projectId) (second call)
    vi.mocked(Purchase.findOne)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any)
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(null) } as any);

    // Solana verification passes
    vi.mocked(verifySolanaTransaction).mockResolvedValue({ valid: true });

    // Snapshot lookups
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({ title: "Test Project", project_type: "Web App" }) as any
    );
    vi.mocked(User.findById).mockReturnValue(
      mockSelectLean({
        name: "Test Seller",
        username: "testseller",
        profile_image_url: "",
      }) as any
    );

    // Purchase saved successfully
    vi.mocked(Purchase.create).mockResolvedValue(MOCK_PURCHASE_DOC as any);

    // Wishlist update succeeds
    vi.mocked(User.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    // Sales updateOne: all three atomic steps succeed by default.
    // Explicitly reset here because vi.clearAllMocks() does not clear mock implementations
    // (only call history), so a mockRejectedValue from a prior test would otherwise persist.
    vi.mocked((Sales as any).updateOne).mockResolvedValue({ modifiedCount: 1 });
  });

  it("returns 200 with projectId on a fully successful confirmation", async () => {
    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const body = vi.mocked(res.json).mock.calls[0][0];
    expect(body.data.projectId).toBe(PROJECT_ID);
  });

  it("creates a Purchase document with the correct fields (status, wallet, amounts, reference)", async () => {
    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(Purchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tx_signature: TX_SIG,
        purchase_reference: PURCHASE_REF,
        buyer_wallet: BUYER_WALLET,
        seller_wallet: SELLER_WALLET,
        treasury_wallet: TREASURY_ADDR,
        status: "CONFIRMED",
        price_usd: MOCK_INTENT_OBJ.price_usd,
        price_sol_total: MOCK_INTENT_OBJ.price_sol_total,
        project_snapshot: expect.objectContaining({ title: "Test Project" }),
        seller_snapshot: expect.objectContaining({ username: "testseller" }),
      })
    );
  });

  it("passes the correct wallet addresses and expected lamports to verifySolanaTransaction", async () => {
    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(verifySolanaTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        txSignature: TX_SIG,
        expectedBuyerWallet: BUYER_WALLET,
        expectedSellerWallet: SELLER_WALLET,
        expectedTreasuryWallet: TREASURY_ADDR,
        expectedSellerLamports: MOCK_INTENT_OBJ.seller_lamports,
        expectedTreasuryLamports: MOCK_INTENT_OBJ.treasury_lamports,
        purchaseReference: PURCHASE_REF,
      })
    );
  });

  it("returns 410 when the purchase intent has expired and no purchase exists in DB", async () => {
    // Intent is gone from Redis AND no purchase recorded (genuine expiry, not a retry)
    vi.mocked(redisClient.get).mockResolvedValue(null as any);

    // Both tx_sig checks (Step 1 + Step 3 race check) use .select().lean().
    // Reset first so beforeEach's lean()-only Mock #2 doesn't break Step 3.
    vi.mocked(Purchase.findOne).mockReset();
    vi.mocked(Purchase.findOne)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any);

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(410);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(/expired/i);
  });

  it("returns 403 when the authenticated user is not the buyer who initiated the purchase", async () => {
    const attacker = "507f1f77bcf86cd799439099";
    const req = makeReq({
      body: VALID_CONFIRM_BODY,
      user: { _id: attacker, username: "attacker" },
    });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /does not match your session/i
    );
  });

  it("returns 200 (idempotent) when the tx_signature was already confirmed (checked before Redis)", async () => {
    // tx_signature check is now the FIRST operation — it runs before any Redis call.
    // This is the fix for the retryConfirm bug: the idempotency check is always reachable.
    vi.mocked(Purchase.findOne).mockReset();
    const existing = { _id: "already-confirmed", projectId: PROJECT_ID };
    // First findOne call (upfront tx_sig check) → finds existing purchase
    vi.mocked(Purchase.findOne).mockReturnValueOnce({
      select: vi
        .fn()
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(existing) }),
    } as any);

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Purchase.create).not.toHaveBeenCalled();
    // Critically: Redis is never touched on the idempotent path
    expect(redisClient.get).not.toHaveBeenCalled();
  });

  it("returns 409 when the buyer already has a confirmed purchase for this project", async () => {
    vi.mocked(Purchase.findOne).mockReset();
    // Step 1: upfront tx_sig check → null (not yet confirmed by this TX)
    // Step 6: duplicate (buyerId + projectId) check → existing purchase → 409
    // Note: the race-check (Step 3) is only reached when Redis has no intent,
    // which is not this path (intent is present), so only 2 mocks are needed.
    vi.mocked(Purchase.findOne)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any)
      .mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue({ _id: "dup-purchase" }),
      } as any);

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(409);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /already purchased/i
    );
  });

  it("returns 400 with the verification error message when Solana TX verification fails", async () => {
    vi.mocked(verifySolanaTransaction).mockResolvedValue({
      valid: false,
      error:
        "Seller received insufficient SOL. Expected 99000000 lamports, got 50000000",
    });

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /insufficient SOL/i
    );
    expect(Purchase.create).not.toHaveBeenCalled();
  });

  it("returns 200 (idempotent) when Purchase.create fails with a duplicate-key error (race condition) and deletes intent", async () => {
    const duplicateKeyErr = Object.assign(new Error("E11000 duplicate key"), {
      code: 11000,
    });
    vi.mocked(Purchase.create).mockRejectedValue(duplicateKeyErr);

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /already confirmed/i
    );
    // Race winner already saved the purchase, so intent should be cleaned up
    expect(redisClient.del).toHaveBeenCalledWith(
      `purchase_intent_${PURCHASE_REF}`
    );
  });

  it("returns 500 when Purchase.create fails with a generic database error", async () => {
    vi.mocked(Purchase.create).mockRejectedValue(
      new Error("MongoDB write timeout")
    );

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /contact support/i
    );
  });

  it("still returns 200 when the Sales document update fails (non-fatal)", async () => {
    // Simulate all three Sales.updateOne calls (step 1a, 1b, step 2) failing.
    // The purchase is confirmed on-chain — Sales being unavailable must not fail it.
    vi.mocked((Sales as any).updateOne).mockRejectedValue(
      new Error("Sales DB connection lost")
    );

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    // Sales failure must not fail the purchase — buyer already paid on-chain
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("calls Sales.updateOne three times on a successful confirmation (upsert doc, push year, $inc)", async () => {
    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    // Step 1a: upsert Sales doc, step 1b: push year if absent, step 2: $inc
    expect(vi.mocked((Sales as any).updateOne)).toHaveBeenCalledTimes(3);

    const calls = vi.mocked((Sales as any).updateOne).mock.calls;

    // Step 2 ($inc): the third call should increment total_sales and the monthly bucket
    const incCall = calls[2];
    expect(incCall[1]).toMatchObject({
      $inc: expect.objectContaining({
        total_sales: MOCK_INTENT_OBJ.price_usd,
      }),
    });
    expect(incCall[2]).toMatchObject({
      arrayFilters: expect.arrayContaining([
        expect.objectContaining({ "yr.year": expect.any(Number) }),
        expect.objectContaining({ "mo.month": expect.any(Number) }),
      ]),
    });
  });

  it("removes the purchased project from the buyer's wishlist on success", async () => {
    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Object) },
      { $pull: { wishlist: expect.any(Object) } }
    );
  });

  it("still returns 200 when wishlist cleanup fails after the purchase is already recorded", async () => {
    vi.mocked(User.updateOne).mockRejectedValue(
      new Error("wishlist collection temporarily unavailable")
    );

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Purchase.create).toHaveBeenCalledTimes(1);
    expect(redisClient.del).toHaveBeenCalledWith(
      `purchase_intent_${PURCHASE_REF}`
    );
  });

  /**
   * FIXED: retryConfirm now works correctly because:
   *   - tx_signature idempotency check runs BEFORE Redis GET
   *   - Redis intent is only deleted AFTER successful Purchase.create
   *   - On DB failure the intent remains, so retry can reuse it
   */

  it("FIX: returns 200 (idempotent) on retry when the first attempt saved the purchase but the response was lost", async () => {
    // Scenario: first confirm → Purchase.create succeeds → DEL intent → but response
    // was lost in transit. User retries: tx_sig check finds the existing purchase → 200.
    vi.mocked(Purchase.findOne).mockReset();

    const savedPurchase = { _id: PURCHASE_ID, projectId: PROJECT_ID };

    // Retry attempt: upfront tx_sig check FINDS the purchase (saved on first attempt)
    vi.mocked(Purchase.findOne).mockReturnValueOnce({
      select: vi
        .fn()
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(savedPurchase) }),
    } as any);

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();
    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Purchase.create).not.toHaveBeenCalled();
    // Redis is never touched — short-circuited at the idempotency check
    expect(redisClient.get).not.toHaveBeenCalled();
  });

  it("FIX: returns 200 on retry when Purchase.create failed initially (DB recovered, intent still in Redis)", async () => {
    // Scenario: first confirm → Purchase.create fails (DB down) → 500.
    //           Intent is NOT deleted (new behaviour). DB recovers.
    //           Retry: tx_sig not in DB → GET intent (still valid) → create succeeds → 200.
    vi.mocked(Purchase.findOne).mockReset();

    // Upfront tx_sig check → null (first attempt's create failed, nothing in DB)
    vi.mocked(Purchase.findOne)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any)
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue(null) } as any); // (buyerId, projectId) check

    // Intent still available in Redis (was not deleted on failure)
    vi.mocked(redisClient.get).mockResolvedValue(
      JSON.stringify(MOCK_INTENT_OBJ) as any
    );
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);

    vi.mocked(verifySolanaTransaction).mockResolvedValue({ valid: true });
    vi.mocked(Purchase.create).mockResolvedValue({
      _id: PURCHASE_ID,
      projectId: PROJECT_ID,
    } as any);

    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({ title: "Test Project", project_type: "Web App" }) as any
    );
    vi.mocked(User.findById).mockReturnValue(
      mockSelectLean({
        name: "Test Seller",
        username: "testseller",
        profile_image_url: "",
      }) as any
    );
    vi.mocked(User.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();
    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Purchase.create).toHaveBeenCalledTimes(1);
    // Intent must be deleted after successful create
    expect(redisClient.del).toHaveBeenCalledWith(
      `purchase_intent_${PURCHASE_REF}`
    );
  });

  it("returns 500 and does NOT delete intent when Purchase.create fails (intent preserved for retry)", async () => {
    vi.mocked(Purchase.create).mockRejectedValue(
      new Error("MongoDB connection timeout")
    );

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();
    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /contact support/i
    );
    // Intent must NOT be deleted — user needs it to retry
    expect(redisClient.del).not.toHaveBeenCalled();
  });

  it("deletes the Redis intent atomically after a successful Purchase.create", async () => {
    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(redisClient.del).toHaveBeenCalledWith(
      `purchase_intent_${PURCHASE_REF}`
    );
  });

  // ── Gap #6: Input validation (controller integration level) ─────────────────

  it("returns 400 when purchase_reference is not a 64-char hex string (too short)", async () => {
    const req = makeReq({
      body: { ...VALID_CONFIRM_BODY, purchase_reference: "abc123" },
    });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    // Redis and DB must not be touched when validation fails
    expect(redisClient.get).not.toHaveBeenCalled();
  });

  it("returns 400 when tx_signature contains disallowed base58 chars (0, O, I, l)", async () => {
    // '0' and 'O' are excluded from base58 encoding — any string with them is invalid
    const badSig = "0".repeat(88); // 88 chars but all-zero is invalid base58
    const req = makeReq({
      body: { ...VALID_CONFIRM_BODY, tx_signature: badSig },
    });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when buyer_wallet is too short to be a valid Solana base58 address", async () => {
    const req = makeReq({
      body: { ...VALID_CONFIRM_BODY, buyer_wallet: "tooshort" },
    });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── Gap #7: Race-check (Step 3) — intent expired but concurrent confirm saved it ─

  it("returns 200 (idempotent) when intent is expired but a concurrent confirm already saved the purchase", async () => {
    // Scenario: two requests race to confirm the same TX.
    // Request A wins: saves the Purchase, deletes the Redis intent.
    // Request B arrives after: GET returns null (intent gone), but the
    //   race-check (second findOne by tx_sig) finds the purchase saved by A → 200.
    vi.mocked(Purchase.findOne).mockReset();
    const savedByA = { _id: PURCHASE_ID, projectId: PROJECT_ID };

    // Step 1: upfront tx_sig check → null (not already confirmed from THIS request's perspective)
    vi.mocked(Purchase.findOne).mockReturnValueOnce({
      select: vi
        .fn()
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    } as any);
    // Redis GET: intent is gone (deleted by Request A)
    vi.mocked(redisClient.get).mockResolvedValue(null as any);
    // Step 3: race-check → finds the purchase saved by Request A
    vi.mocked(Purchase.findOne).mockReturnValueOnce({
      select: vi
        .fn()
        .mockReturnValue({ lean: vi.fn().mockResolvedValue(savedByA) }),
    } as any);

    const req = makeReq({ body: VALID_CONFIRM_BODY });
    const res = makeRes();

    confirmPurchase(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Purchase.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getPurchasedProjects
// ─────────────────────────────────────────────────────────────────────────────

describe("getPurchasedProjects", () => {
  const next = vi.fn();

  function mockPurchaseFind(purchases: unknown[]) {
    vi.mocked(Purchase.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(purchases),
        }),
      }),
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with a formatted list of purchases", async () => {
    mockPurchaseFind([
      {
        _id: PURCHASE_ID,
        projectId: {
          title: "Test Project",
          project_images: ["img1.jpg", "img2.jpg"],
        },
        price_usd: 10,
        price_sol_total: 0.1,
        buyer_wallet: BUYER_WALLET,
        tx_signature: TX_SIG,
        createdAt: new Date(),
        project_snapshot: { title: "Test Project", project_type: "Web App" },
        seller_snapshot: {
          name: "Seller",
          username: "seller",
          profile_image_url: "",
        },
      },
    ]);

    const req = makeReq();
    const res = makeRes();

    getPurchasedProjects(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const { purchases } = vi.mocked(res.json).mock.calls[0][0].data;
    expect(purchases).toHaveLength(1);
  });

  it("normalises project_images to only the first image", async () => {
    mockPurchaseFind([
      {
        _id: PURCHASE_ID,
        projectId: { project_images: ["first.jpg", "second.jpg", "third.jpg"] },
        price_usd: 10,
        project_snapshot: { title: "P", project_type: "Web" },
        seller_snapshot: { name: "S", username: "s", profile_image_url: "" },
        createdAt: new Date(),
      },
    ]);

    const req = makeReq();
    const res = makeRes();

    getPurchasedProjects(req, res, next);
    await flushPromises();

    const { purchases } = vi.mocked(res.json).mock.calls[0][0].data;
    expect(purchases[0].projectId.project_images).toBe("first.jpg");
  });

  it("returns projectId as null for hard-deleted projects (snapshot still present)", async () => {
    mockPurchaseFind([
      {
        _id: PURCHASE_ID,
        projectId: null, // project was hard-deleted
        price_usd: 10,
        project_snapshot: { title: "Deleted Project", project_type: "Web App" },
        seller_snapshot: {
          name: "Seller",
          username: "seller",
          profile_image_url: "",
        },
        createdAt: new Date(),
      },
    ]);

    const req = makeReq();
    const res = makeRes();

    getPurchasedProjects(req, res, next);
    await flushPromises();

    const { purchases } = vi.mocked(res.json).mock.calls[0][0].data;
    expect(purchases[0].projectId).toBeNull();
    expect(purchases[0].project_snapshot.title).toBe("Deleted Project");
  });

  it("returns an empty array when the buyer has no purchases", async () => {
    mockPurchaseFind([]);

    const req = makeReq();
    const res = makeRes();

    getPurchasedProjects(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(vi.mocked(res.json).mock.calls[0][0].data.purchases).toHaveLength(0);
  });

  it("returns 500 when the database query throws", async () => {
    vi.mocked(Purchase.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockRejectedValue(new Error("DB connection lost")),
        }),
      }),
    });

    const req = makeReq();
    const res = makeRes();

    getPurchasedProjects(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// downloadProject
// ─────────────────────────────────────────────────────────────────────────────

describe("downloadProject", () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // The BUG test in confirmPurchase leaves unconsumed mockReturnValueOnce
    // entries (retry path short-circuits before findOne). Reset to clear them.
    vi.mocked(Purchase.findOne).mockReset();

    // Purchase exists
    vi.mocked(Purchase.findOne).mockReturnValue(
      mockSelectLean({ _id: PURCHASE_ID }) as any
    );

    // Project has a ready zip
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: null,
        repo_zip_status: "SUCCESS",
        repo_zip_s3_key: "zips/project-abc.zip",
        title: "Test Project",
        price: 99,
      }) as any
    );

    // S3 URL generated successfully
    vi.mocked(s3Service.createSignedDownloadUrl).mockResolvedValue(
      "https://s3.example.com/bucket/zips/project-abc.zip?X-Amz-Signature=xxx"
    );
  });

  it("returns 200 with a presigned S3 download URL", async () => {
    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const { download_url } = vi.mocked(res.json).mock.calls[0][0].data;
    expect(download_url).toContain("s3.example.com");
  });

  it("calls S3 with the correct key, 900-second expiry, and a sanitised filename", async () => {
    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(s3Service.createSignedDownloadUrl).toHaveBeenCalledWith(
      "zips/project-abc.zip",
      900,
      "test-project.zip" // title lowercased, spaces→hyphens, .zip appended
    );
  });

  it("returns 400 when project_id query param is absent", async () => {
    const req = makeReq({ query: {} });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when project_id is not a valid MongoDB ObjectId", async () => {
    const req = makeReq({ query: { project_id: "not-an-objectid" } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when the buyer has not purchased this project", async () => {
    vi.mocked(Purchase.findOne).mockReturnValue(mockSelectLean(null) as any);

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /not purchased/i
    );
  });

  it("verifies confirmed purchase ownership before generating a paid download URL", async () => {
    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(Purchase.findOne).toHaveBeenCalledWith({
      buyerId: expect.any(Object),
      projectId: expect.any(Object),
      status: "CONFIRMED",
    });
    expect(s3Service.createSignedDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when paid-project purchase verification fails", async () => {
    vi.mocked(Purchase.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error("purchase lookup failed")),
      }),
    } as any);

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(s3Service.createSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("allows a free project download without requiring any purchase record", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: null,
        repo_zip_status: "SUCCESS",
        repo_zip_s3_key: "zips/free-project.zip",
        title: "Free Project",
        price: 0,
      }) as any
    );

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Purchase.findOne).not.toHaveBeenCalled();
    expect(s3Service.createSignedDownloadUrl).toHaveBeenCalledWith(
      "zips/free-project.zip",
      900,
      "free-project.zip"
    );
  });

  it("blocks a free project download when the project is no longer marketplace-visible", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        isActive: false,
        github_access_revoked: false,
        scheduled_deletion_at: null,
        repo_zip_status: "SUCCESS",
        repo_zip_s3_key: "zips/free-project.zip",
        title: "Free Project",
        price: 0,
      }) as any
    );

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /not currently available for download/i
    );
    expect(Purchase.findOne).not.toHaveBeenCalled();
    expect(s3Service.createSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("treats free-project downloads as project-specific and does not let the frontend override which file is signed", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: null,
        repo_zip_status: "SUCCESS",
        repo_zip_s3_key: "zips/free-catalog-item.zip",
        title: "Free Catalog Item",
        price: 0,
      }) as any
    );

    const req = makeReq({
      query: {
        project_id: PROJECT_ID,
        repo_zip_s3_key: "zips/paid-secret.zip",
      },
    });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(s3Service.createSignedDownloadUrl).toHaveBeenCalledWith(
      "zips/free-catalog-item.zip",
      900,
      "free-catalog-item.zip"
    );
  });

  it("still blocks free-project downloads when the zip is unavailable", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: null,
        repo_zip_status: "PROCESSING",
        repo_zip_s3_key: null,
        title: "Free Project",
        price: 0,
      }) as any
    );

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Purchase.findOne).not.toHaveBeenCalled();
    expect(s3Service.createSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("blocks a paid project download when it is no longer marketplace-visible and not purchased", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: new Date("2026-03-27T00:00:00.000Z"),
        repo_zip_status: "SUCCESS",
        repo_zip_s3_key: "zips/project-abc.zip",
        title: "Test Project",
        price: 99,
      }) as any
    );
    vi.mocked(Purchase.findOne).mockReturnValue(mockSelectLean(null) as any);

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /not currently available for download/i
    );
    expect(s3Service.createSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("allows a paid project download for an already purchased project even when it is no longer marketplace-visible", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        isActive: false,
        github_access_revoked: false,
        scheduled_deletion_at: new Date("2026-03-27T00:00:00.000Z"),
        repo_zip_status: "SUCCESS",
        repo_zip_s3_key: "zips/project-abc.zip",
        title: "Test Project",
        price: 99,
      }) as any
    );

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Purchase.findOne).toHaveBeenCalledTimes(1);
    expect(s3Service.createSignedDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when the project has been deleted after purchase", async () => {
    vi.mocked(Project.findById).mockReturnValue(mockSelectLean(null) as any);

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when the project zip is not yet ready (status ≠ SUCCESS)", async () => {
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean({
        repo_zip_status: "FAILED",
        repo_zip_s3_key: null,
        title: "Test Project",
      }) as any
    );

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0].message).toMatch(
      /not available/i
    );
  });

  it("returns 500 when S3 presigned URL generation fails", async () => {
    vi.mocked(s3Service.createSignedDownloadUrl).mockRejectedValue(
      new Error("S3 credentials invalid or bucket unreachable")
    );

    const req = makeReq({ query: { project_id: PROJECT_ID } });
    const res = makeRes();

    downloadProject(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// downloadReceipt
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PURCHASE_FULL = {
  _id: PURCHASE_ID,
  buyerId: BUYER_ID,
  sellerId: SELLER_ID,
  projectId: PROJECT_ID,
  price_usd: 10,
  price_sol_total: 0.1,
  price_sol_seller: 0.099,
  price_sol_platform: 0.001,
  platform_fee_percent: 1,
  sol_usd_rate: 100,
  exchange_rate_source: "CoinGecko",
  exchange_rate_fetched_at: new Date("2024-01-01"),
  buyer_wallet: BUYER_WALLET,
  seller_wallet: SELLER_WALLET,
  treasury_wallet: TREASURY_ADDR,
  tx_signature: TX_SIG,
  purchase_reference: PURCHASE_REF,
  status: "CONFIRMED",
  project_snapshot: { title: "Test Project", project_type: "Web App" },
  seller_snapshot: {
    name: "Test Seller",
    username: "testseller",
    profile_image_url: "",
  },
  createdAt: new Date("2024-06-15T12:00:00Z"),
};

describe("downloadReceipt", () => {
  const next = vi.fn();

  const MOCK_BUYER_USER = { username: "testbuyer", name: "Test Buyer" };
  const MOCK_SELLER_USER = { username: "testseller", name: "Test Seller" };
  const MOCK_PROJECT_FOR_RECEIPT = {
    title: "Test Project",
    project_type: "Web App",
    tech_stack: ["React", "Node.js"],
    price: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Purchase.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(MOCK_PURCHASE_FULL),
    } as any);
    vi.mocked(User.findById)
      .mockReturnValueOnce(mockSelectLean(MOCK_BUYER_USER) as any)
      .mockReturnValueOnce(mockSelectLean(MOCK_SELLER_USER) as any);
    vi.mocked(Project.findById).mockReturnValue(
      mockSelectLean(MOCK_PROJECT_FOR_RECEIPT) as any
    );
  });

  it("returns 200 with Content-Type: application/pdf and Content-Disposition header", async () => {
    const req = makeReq({ query: { purchase_id: PURCHASE_ID } });
    const res = makeRes();
    res.setHeader = vi.fn();

    downloadReceipt(req, res, next);
    await flushPromises();

    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/pdf"
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      expect.stringContaining("attachment; filename=")
    );
  });

  it("includes key transaction fields in the PDF (purchase reference, tx signature, CONFIRMED status)", async () => {
    const PDFDocument = (await import("pdfkit")).default as any;
    PDFDocument.mockClear();

    const req = makeReq({ query: { purchase_id: PURCHASE_ID } });
    const res = makeRes();
    res.setHeader = vi.fn();

    downloadReceipt(req, res, next);
    await flushPromises();

    const pdfInstance =
      PDFDocument.mock.results[PDFDocument.mock.results.length - 1].value;
    const allText = pdfInstance._texts.join(" ");

    expect(allText).toContain(PURCHASE_REF);
    expect(allText).toContain(TX_SIG);
    expect(allText).toContain("CONFIRMED");
  });

  it("includes buyer, seller usernames and project title in the PDF", async () => {
    const PDFDocument = (await import("pdfkit")).default as any;
    PDFDocument.mockClear();

    const req = makeReq({ query: { purchase_id: PURCHASE_ID } });
    const res = makeRes();
    res.setHeader = vi.fn();

    downloadReceipt(req, res, next);
    await flushPromises();

    const pdfInstance =
      PDFDocument.mock.results[PDFDocument.mock.results.length - 1].value;
    const allText = pdfInstance._texts.join(" ");

    expect(allText).toContain("testbuyer");
    expect(allText).toContain("testseller");
    expect(allText).toContain("Test Project");
  });

  it("falls back to project_snapshot title when the project has been hard-deleted", async () => {
    vi.mocked(Project.findById).mockReturnValue(mockSelectLean(null) as any);

    const PDFDocument = (await import("pdfkit")).default as any;
    PDFDocument.mockClear();

    const req = makeReq({ query: { purchase_id: PURCHASE_ID } });
    const res = makeRes();
    res.setHeader = vi.fn();

    downloadReceipt(req, res, next);
    await flushPromises();

    const pdfInstance =
      PDFDocument.mock.results[PDFDocument.mock.results.length - 1].value;
    const allText = pdfInstance._texts.join(" ");

    // snapshot title should appear — receipt is still valid after deletion
    expect(allText).toContain("Test Project");
  });

  it("returns 400 when purchase_id is absent", async () => {
    const req = makeReq({ query: {} });
    const res = makeRes();

    downloadReceipt(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when purchase_id is not a valid MongoDB ObjectId", async () => {
    const req = makeReq({ query: { purchase_id: "not-an-objectid" } });
    const res = makeRes();

    downloadReceipt(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when the purchase does not belong to this buyer or does not exist", async () => {
    vi.mocked(Purchase.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    const req = makeReq({ query: { purchase_id: PURCHASE_ID } });
    const res = makeRes();

    downloadReceipt(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 when buyer fetch fails (user not found)", async () => {
    vi.mocked(User.findById)
      .mockReturnValueOnce(mockSelectLean(null) as any)
      .mockReturnValueOnce(mockSelectLean(MOCK_SELLER_USER) as any);

    const req = makeReq({ query: { purchase_id: PURCHASE_ID } });
    const res = makeRes();

    downloadReceipt(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 when seller fetch fails (user not found)", async () => {
    vi.mocked(User.findById)
      .mockReturnValueOnce(mockSelectLean(MOCK_BUYER_USER) as any)
      .mockReturnValueOnce(mockSelectLean(null) as any);

    const req = makeReq({ query: { purchase_id: PURCHASE_ID } });
    const res = makeRes();

    downloadReceipt(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("filename includes a sanitised uppercase slice of the purchase_reference", async () => {
    const req = makeReq({ query: { purchase_id: PURCHASE_ID } });
    const res = makeRes();
    res.setHeader = vi.fn();

    downloadReceipt(req, res, next);
    await flushPromises();

    const disposition = vi
      .mocked(res.setHeader)
      .mock.calls.find((c) => c[0] === "Content-Disposition")?.[1] as string;

    // First 16 chars of purchase_reference uppercased in filename
    expect(disposition).toContain(PURCHASE_REF.slice(0, 16).toUpperCase());
  });
});
