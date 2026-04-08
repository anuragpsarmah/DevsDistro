import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/user.model", () => ({
  User: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("../models/siteReview.model", () => ({
  SiteReview: {
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock("../utils/walletVerification.util", () => ({
  verifyWalletSignature: vi.fn(),
}));

vi.mock("../utils/payment.util", () => ({
  resolveUsdcMintAddress: vi.fn(),
}));

vi.mock("../utils/solanaAta.util", () => ({
  getAssociatedTokenAccountStatus: vi.fn(),
  sponsorAssociatedTokenAccount: vi.fn(),
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

import {
  getProfileInformation,
  updateProfileInformation,
  getWalletAddress,
  updateWalletAddress,
} from "../controllers/profile.controller";
import logger from "../logger/logger";
import { User } from "../models/user.model";
import { SiteReview } from "../models/siteReview.model";
import { verifyWalletSignature } from "../utils/walletVerification.util";
import { resolveUsdcMintAddress } from "../utils/payment.util";
import {
  getAssociatedTokenAccountStatus,
  sponsorAssociatedTokenAccount,
} from "../utils/solanaAta.util";

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_WALLET = "GsbwXfJraMomNxBcpR3DBuWMxSrPMD8HuCHBuyBEjMzN";
const SECOND_VALID_WALLET = "7Vj6kR4v1nY4tT1f4K4g1gK7hP8fKXy9gQ6mD4sE2qLp";

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (overrides: Record<string, any> = {}) =>
  ({
    user: {
      _id: VALID_USER_ID,
      username: "testuser",
      profile_image_url: "https://img.test/pic.png",
    },
    body: {},
    query: {},
    cookies: {},
    ...overrides,
  }) as any;

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

const next = vi.fn();

const makeMockUser = (overrides: Record<string, any> = {}) => ({
  _id: VALID_USER_ID,
  username: "testuser",
  profile_image_url: "https://img.test/pic.png",
  website_url: "",
  x_username: "",
  short_bio: "",
  job_role: "",
  location: "",
  review_description: "",
  review_stars: 0,
  profile_visibility: true,
  auto_repackage_on_push: false,
  wallet_address: "",
  wallet_last_connected_address: "",
  wallet_last_connected_at: null,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeMockReview = (overrides: Record<string, any> = {}) => ({
  username: "testuser",
  profile_image_url: "https://img.test/pic.png",
  job_role: "Software Engineer",
  review_description: "Great platform",
  review_stars: 5,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const validWalletBody = (timestampOffset = 0, walletAddress = VALID_WALLET) => {
  const ts = Date.now() + timestampOffset;
  const message = `DevsDistro Wallet Verification\nAddress: ${walletAddress}\nTimestamp: ${ts}`;
  return {
    wallet_address: walletAddress,
    signature: "validSig123",
    message,
  };
};

describe("profile.controller", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(resolveUsdcMintAddress).mockReturnValue(
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
    );
    vi.mocked(getAssociatedTokenAccountStatus).mockResolvedValue({
      exists: true,
      ataAddress: "Ata111111111111111111111111111111111111111",
    } as any);
    vi.mocked(sponsorAssociatedTokenAccount).mockResolvedValue({
      ataAddress: "Ata111111111111111111111111111111111111111",
      txSignature: "sig111",
      transactionFeeLamports: 5000,
      ataRentLamports: 2039280,
      totalCostLamports: 2044280,
      transactionFeeSol: 0.000005,
      ataRentSol: 0.00203928,
      totalCostSol: 0.00204428,
    } as any);
    process.env.SOLANA_RPC_URL = "https://api.devnet.solana.com";
    process.env.SOLANA_ATA_SPONSOR_SECRET_KEY = "test-sponsor-secret";
  });

  // ─────────────────────────────────────────────────────────────
  // getProfileInformation
  // ─────────────────────────────────────────────────────────────
  describe("getProfileInformation", () => {
    it("returns 200 with profile fields on success", async () => {
      const mockUser = makeMockUser({
        website_url: "https://example.com",
        short_bio: "Hello",
        profile_visibility: false,
      });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq();
      getProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.data.website_url).toBe("https://example.com");
      expect(body.data.short_bio).toBe("Hello");
      expect(body.data.profile_visibility).toBe(false);
    });

    it("returns 401 when user is not in session", async () => {
      const req = makeReq({ user: undefined });
      getProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 401 when user document not found in DB", async () => {
      vi.mocked(User.findById).mockResolvedValue(null);

      const req = makeReq();
      getProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 500 on DB error", async () => {
      vi.mocked(User.findById).mockRejectedValue(
        new Error("DB connection lost")
      );

      const req = makeReq();
      getProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // updateProfileInformation
  // ─────────────────────────────────────────────────────────────
  describe("updateProfileInformation", () => {
    const validBody = {
      website_url: "https://portfolio.dev",
      x_username: "johndoe",
      short_bio: "I build things",
      job_role: "Software Engineer",
      location: "London",
      review_description: "",
      review_stars: 0,
      profile_visibility: true,
      auto_repackage_on_push: false,
    };

    it("returns 401 when user is not in session", async () => {
      const req = makeReq({ user: undefined, body: validBody });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for an invalid website URL", async () => {
      const req = makeReq({ body: { ...validBody, website_url: "not-a-url" } });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(User.findById).not.toHaveBeenCalled();
    });

    it("returns 400 for an invalid job role", async () => {
      const req = makeReq({
        body: { ...validBody, job_role: "Galactic Overlord" },
      });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when short_bio exceeds 250 characters", async () => {
      const req = makeReq({
        body: { ...validBody, short_bio: "a".repeat(251) },
      });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when x_username exceeds 50 characters", async () => {
      const req = makeReq({
        body: { ...validBody, x_username: "a".repeat(51) },
      });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when location exceeds 100 characters", async () => {
      const req = makeReq({
        body: { ...validBody, location: "a".repeat(101) },
      });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when review_stars is a float", async () => {
      const req = makeReq({ body: { ...validBody, review_stars: 3.5 } });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when review_stars is out of range", async () => {
      const req = makeReq({ body: { ...validBody, review_stars: 6 } });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 401 when user document not found in DB", async () => {
      vi.mocked(User.findById).mockResolvedValue(null);

      const req = makeReq({ body: validBody });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 500 when user.save() throws", async () => {
      const mockUser = makeMockUser({
        save: vi.fn().mockRejectedValue(new Error("write failed")),
      });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq({ body: validBody });
      updateProfileInformation(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(500);
    });

    describe("when review is cleared (review_description empty or review_stars 0)", () => {
      it("deletes the SiteReview and returns 200", async () => {
        const mockUser = makeMockUser();
        vi.mocked(User.findById).mockResolvedValue(mockUser as any);
        vi.mocked(SiteReview.deleteOne).mockResolvedValue({
          deletedCount: 1,
        } as any);

        const req = makeReq({
          body: { ...validBody, review_description: "", review_stars: 0 },
        });
        updateProfileInformation(req, res, next);
        await flushPromises();

        expect(SiteReview.deleteOne).toHaveBeenCalledWith({
          username: "testuser",
        });
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("returns 500 when SiteReview.deleteOne throws", async () => {
        const mockUser = makeMockUser();
        vi.mocked(User.findById).mockResolvedValue(mockUser as any);
        vi.mocked(SiteReview.deleteOne).mockRejectedValue(
          new Error("delete failed")
        );

        const req = makeReq({
          body: { ...validBody, review_description: "", review_stars: 0 },
        });
        updateProfileInformation(req, res, next);
        await flushPromises();

        expect(res.status).toHaveBeenCalledWith(500);
      });

      it("does not reach SiteReview.findOne when review is cleared", async () => {
        const mockUser = makeMockUser();
        vi.mocked(User.findById).mockResolvedValue(mockUser as any);
        vi.mocked(SiteReview.deleteOne).mockResolvedValue({
          deletedCount: 0,
        } as any);

        const req = makeReq({
          body: { ...validBody, review_description: "", review_stars: 0 },
        });
        updateProfileInformation(req, res, next);
        await flushPromises();

        expect(SiteReview.findOne).not.toHaveBeenCalled();
      });
    });

    describe("when review is provided", () => {
      const reviewBody = {
        ...validBody,
        job_role: "Frontend Engineer",
        review_description: "Amazing marketplace",
        review_stars: 5,
      };

      it("creates a new SiteReview when none exists and returns 200", async () => {
        const mockUser = makeMockUser();
        vi.mocked(User.findById).mockResolvedValue(mockUser as any);
        vi.mocked(SiteReview.findOne).mockResolvedValue(null);
        vi.mocked(SiteReview.create).mockResolvedValue({} as any);

        const req = makeReq({ body: reviewBody });
        updateProfileInformation(req, res, next);
        await flushPromises();

        expect(SiteReview.create).toHaveBeenCalledWith(
          expect.objectContaining({
            username: "testuser",
            review_description: "Amazing marketplace",
            review_stars: 5,
          })
        );
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("updates the existing SiteReview when one exists and returns 200", async () => {
        const mockUser = makeMockUser();
        const mockReview = makeMockReview();
        vi.mocked(User.findById).mockResolvedValue(mockUser as any);
        vi.mocked(SiteReview.findOne).mockResolvedValue(mockReview as any);

        const req = makeReq({ body: reviewBody });
        updateProfileInformation(req, res, next);
        await flushPromises();

        expect(SiteReview.create).not.toHaveBeenCalled();
        expect(mockReview.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("returns 500 when SiteReview.findOne throws", async () => {
        const mockUser = makeMockUser();
        vi.mocked(User.findById).mockResolvedValue(mockUser as any);
        vi.mocked(SiteReview.findOne).mockRejectedValue(new Error("db error"));

        const req = makeReq({ body: reviewBody });
        updateProfileInformation(req, res, next);
        await flushPromises();

        expect(res.status).toHaveBeenCalledWith(500);
      });

      it("returns 500 when existing SiteReview.save() throws", async () => {
        const mockUser = makeMockUser();
        const mockReview = makeMockReview({
          save: vi.fn().mockRejectedValue(new Error("save error")),
        });
        vi.mocked(User.findById).mockResolvedValue(mockUser as any);
        vi.mocked(SiteReview.findOne).mockResolvedValue(mockReview as any);

        const req = makeReq({ body: reviewBody });
        updateProfileInformation(req, res, next);
        await flushPromises();

        expect(res.status).toHaveBeenCalledWith(500);
      });

      it("returns 500 when SiteReview.create() throws", async () => {
        const mockUser = makeMockUser();
        vi.mocked(User.findById).mockResolvedValue(mockUser as any);
        vi.mocked(SiteReview.findOne).mockResolvedValue(null);
        vi.mocked(SiteReview.create).mockRejectedValue(
          new Error("create error")
        );

        const req = makeReq({ body: reviewBody });
        updateProfileInformation(req, res, next);
        await flushPromises();

        expect(res.status).toHaveBeenCalledWith(500);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // getWalletAddress
  // ─────────────────────────────────────────────────────────────
  describe("getWalletAddress", () => {
    it("returns 200 with wallet_address when set", async () => {
      const mockUser = makeMockUser({ wallet_address: VALID_WALLET });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq();
      getWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.data.wallet_address).toBe(VALID_WALLET);
    });

    it("returns 200 with empty wallet_address when not set", async () => {
      const mockUser = makeMockUser({ wallet_address: "" });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq();
      getWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      const body = res.json.mock.calls[0][0];
      expect(body.data.wallet_address).toBe("");
    });

    it("returns 401 when user is not in session", async () => {
      const req = makeReq({ user: undefined });
      getWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 401 when user document not found in DB", async () => {
      vi.mocked(User.findById).mockResolvedValue(null);

      const req = makeReq();
      getWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 500 on DB error", async () => {
      vi.mocked(User.findById).mockRejectedValue(new Error("DB error"));

      const req = makeReq();
      getWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // updateWalletAddress
  // ─────────────────────────────────────────────────────────────
  describe("updateWalletAddress", () => {
    it("returns 401 when user is not in session", async () => {
      const req = makeReq({ user: undefined, body: { wallet_address: "" } });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("disconnects wallet (empty address) without requiring signature", async () => {
      const mockUser = makeMockUser({ wallet_address: VALID_WALLET });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq({ body: { wallet_address: "" } });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(verifyWalletSignature).not.toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when address is set but signature/message are absent", async () => {
      const req = makeReq({ body: { wallet_address: VALID_WALLET } });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(verifyWalletSignature).not.toHaveBeenCalled();
    });

    it("returns 400 for an invalid base58 wallet address", async () => {
      const req = makeReq({
        body: { wallet_address: "not!valid", signature: "sig", message: "msg" },
      });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for an invalid verification message format", async () => {
      const req = makeReq({
        body: {
          wallet_address: VALID_WALLET,
          signature: "validSig",
          message: "Wrong format message",
        },
      });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when the message address does not match submitted address", async () => {
      const differentAddress = "DifferentAddr1111111111111111111111111111111";
      const message = `DevsDistro Wallet Verification\nAddress: ${differentAddress}\nTimestamp: ${Date.now()}`;
      const req = makeReq({
        body: { wallet_address: VALID_WALLET, signature: "sig", message },
      });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when the timestamp is expired (> 5 min ago)", async () => {
      const expiredTs = Date.now() - 6 * 60 * 1000;
      const message = `DevsDistro Wallet Verification\nAddress: ${VALID_WALLET}\nTimestamp: ${expiredTs}`;
      const req = makeReq({
        body: { wallet_address: VALID_WALLET, signature: "sig", message },
      });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when the timestamp is more than 60s in the future", async () => {
      const futureTs = Date.now() + 70_000;
      const message = `DevsDistro Wallet Verification\nAddress: ${VALID_WALLET}\nTimestamp: ${futureTs}`;
      const req = makeReq({
        body: { wallet_address: VALID_WALLET, signature: "sig", message },
      });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when signature verification fails", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(false);

      const req = makeReq({ body: validWalletBody() });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(verifyWalletSignature).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 200 when signature verification passes and DB update succeeds", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(true);
      const mockUser = makeMockUser({ wallet_address: VALID_WALLET });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq({ body: validWalletBody() });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(verifyWalletSignature).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.wallet_last_connected_address).toBe(VALID_WALLET);
      expect(mockUser.wallet_last_connected_at).toBeInstanceOf(Date);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("allows reconnecting the same wallet within 24 hours after disconnecting it", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(true);
      const mockUser = makeMockUser({
        wallet_address: "",
        wallet_last_connected_address: VALID_WALLET,
        wallet_last_connected_at: new Date(Date.now() - 60 * 60 * 1000),
      });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq({ body: validWalletBody(0, VALID_WALLET) });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(vi.mocked(getAssociatedTokenAccountStatus)).toHaveBeenCalled();
    });

    it("blocks connecting a different wallet within 24 hours of the last wallet connection", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(true);
      const mockUser = makeMockUser({
        wallet_address: "",
        wallet_last_connected_address: VALID_WALLET,
        wallet_last_connected_at: new Date(Date.now() - 60 * 60 * 1000),
      });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq({ body: validWalletBody(0, SECOND_VALID_WALLET) });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(vi.mocked(getAssociatedTokenAccountStatus)).not.toHaveBeenCalled();
      expect(sponsorAssociatedTokenAccount).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "You can connect a different wallet 24 hours after your last wallet connection.",
          data: expect.objectContaining({
            reason_code: "SELLER_WALLET_SWITCH_COOLDOWN_ACTIVE",
          }),
        })
      );
    });

    it("allows connecting a different wallet after 24 hours have passed", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(true);
      const mockUser = makeMockUser({
        wallet_address: "",
        wallet_last_connected_address: VALID_WALLET,
        wallet_last_connected_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
      });
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq({ body: validWalletBody(0, SECOND_VALID_WALLET) });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(vi.mocked(getAssociatedTokenAccountStatus)).toHaveBeenCalledWith({
        ownerWallet: SECOND_VALID_WALLET,
        mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        rpcUrl: "https://api.devnet.solana.com",
      });
      expect(mockUser.wallet_last_connected_address).toBe(SECOND_VALID_WALLET);
      expect(mockUser.wallet_last_connected_at).toBeInstanceOf(Date);
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        "Seller USDC ATA already exists during wallet connection",
        expect.objectContaining({
          walletAddress: SECOND_VALID_WALLET,
          usdcAtaAddress: "Ata111111111111111111111111111111111111111",
        })
      );
    });

    it("returns 401 when user lookup returns null", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(true);
      vi.mocked(User.findById).mockResolvedValue(null);

      const req = makeReq({ body: validWalletBody() });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 500 on DB update error", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(true);
      const mockUser = makeMockUser();
      mockUser.save.mockRejectedValue(new Error("DB error"));
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq({ body: validWalletBody() });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("sponsors the seller USDC ATA when the connected wallet is missing it", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(true);
      vi.mocked(getAssociatedTokenAccountStatus).mockResolvedValue({
        exists: false,
        ataAddress: "Ata111111111111111111111111111111111111111",
      } as any);
      const mockUser = makeMockUser();
      vi.mocked(User.findById).mockResolvedValue(mockUser as any);

      const req = makeReq({ body: validWalletBody() });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(sponsorAssociatedTokenAccount).toHaveBeenCalled();
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        "Seller USDC ATA prepared during wallet connection",
        expect.objectContaining({
          walletAddress: VALID_WALLET,
          usdcAtaAddress: "Ata111111111111111111111111111111111111111",
          ataCreationTxSignature: "sig111",
          transactionFeeLamports: 5000,
          ataRentLamports: 2039280,
          totalCostLamports: 2044280,
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Wallet connected and USDC receiving account is ready.",
          data: expect.objectContaining({
            reason_code: "SELLER_USDC_ATA_CREATED",
          }),
        })
      );
    });

    it("still sponsors the seller USDC ATA when switching to another wallet that is missing it", async () => {
      vi.mocked(verifyWalletSignature).mockReturnValue(true);
      vi.mocked(getAssociatedTokenAccountStatus).mockResolvedValue({
        exists: false,
        ataAddress: "Ata111111111111111111111111111111111111111",
      } as any);
      vi.mocked(User.findById).mockResolvedValue(
        makeMockUser({
          wallet_address: "OldWallet11111111111111111111111111111111",
        }) as any
      );

      const req = makeReq({ body: validWalletBody() });
      updateWalletAddress(req, res, next);
      await flushPromises();

      expect(sponsorAssociatedTokenAccount).toHaveBeenCalledWith({
        ownerWallet: VALID_WALLET,
        mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
        rpcUrl: "https://api.devnet.solana.com",
        sponsorSecretKey: "test-sponsor-secret",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Wallet connected and USDC receiving account is ready.",
          data: expect.objectContaining({
            reason_code: "SELLER_USDC_ATA_CREATED",
          }),
        })
      );
    });
  });
});
