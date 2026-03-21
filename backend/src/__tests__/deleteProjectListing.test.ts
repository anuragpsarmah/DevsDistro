/**
 * Tests for deleteProjectListing controller
 *
 * Covers all code paths:
 * - Auth guard (401)
 * - Query validation (400)
 * - Project lookup errors (500, 404)
 * - Already-scheduled guard (400)
 * - Sales check errors (500)
 * - Soft-delete path: has sales → schedule for deletion (200)
 * - Soft-delete DB failure (500)
 * - Wishlist removal failure is non-fatal
 * - Hard-delete path: no sales → immediate deletion (200)
 *
 * NOTE: asyncHandler returns void (not a Promise) so we use
 * flushPromises() (setImmediate-based) to drain the microtask queue
 * before making assertions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks (hoisted before imports) ───────────────────────────────────

vi.mock("../models/project.model", () => ({
  Project: {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: {
    exists: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("../models/user.model", () => ({
  User: {
    findById: vi.fn(),
    updateMany: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("../models/githubAppInstallation.model", () => ({
  GitHubAppInstallation: {
    findOne: vi.fn(),
    findOneAndDelete: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("..", () => ({
  redisClient: {
    zadd: vi.fn(),
    hset: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
    getdel: vi.fn(),
  },
  s3Service: {
    validateAndCreatePreSignedDownloadUrl: vi.fn(),
    createSignedDownloadUrl: vi.fn(),
  },
  repoZipUploadService: {
    processRepoZipUpload: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

vi.mock("../services/githubApp.service", () => ({
  githubAppService: {
    getInstallUrl: vi.fn(),
    getInstallationRepos: vi.fn(),
    getInstallationToken: vi.fn(),
    verifyWebhookSignature: vi.fn(),
    reactivateProjectsWithRestoredAccess: vi.fn(),
  },
}));

vi.mock("../utils/projectCleanup.util", () => ({
  performProjectHardDelete: vi.fn(),
}));

vi.mock("../utils/encryption.util", () => ({
  decrypt: vi.fn(),
}));

vi.mock("axios", () => ({
  default: { get: vi.fn() },
  AxiosError: class AxiosError extends Error {
    isAxiosError = true;
  },
}));

vi.mock("../utils/redisPrefixGenerator.util", () => ({
  privateRepoPrefix: vi.fn((id: string) => `private-repos:${id}`),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { deleteProjectListing } from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { Purchase } from "../models/purchase.model";
import { User } from "../models/user.model";
import { performProjectHardDelete } from "../utils/projectCleanup.util";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_PROJECT_ID = "507f191e810c19729de860ea";
const VALID_REPO_ID = "87654321";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * asyncHandler creates a floating Promise (doesn't return it).
 * setImmediate fires after all microtasks complete, so this
 * reliably flushes the entire async controller execution.
 */
const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (overrides: Record<string, any> = {}) => ({
  user: { _id: VALID_USER_ID },
  query: { github_repo_id: VALID_REPO_ID },
  body: {},
  ...overrides,
});

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

const mockProjectDoc = (overrides: Record<string, any> = {}) => ({
  _id: VALID_PROJECT_ID,
  project_images: [] as string[],
  project_images_detail: [] as string[],
  project_video: null as string | null,
  repo_zip_s3_key: null as string | null,
  scheduled_deletion_at: null as Date | null,
  ...overrides,
});

/** Builds the chained findOne mock: Project.findOne().select() → Promise */
const stubFindOne = (resolvedValue: any) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockResolvedValue(resolvedValue),
  } as any);
};

const stubFindOneError = (error: Error) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockRejectedValue(error),
  } as any);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("deleteProjectListing", () => {
  let res: any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Error during validation" })
    );
  });

  // ── Query validation ──────────────────────────────────────────────────────

  it("returns 400 when github_repo_id is missing from query", async () => {
    const req = makeReq({ query: {} });
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    // Should not have touched the DB
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  // ── DB errors ─────────────────────────────────────────────────────────────

  it("returns 500 when project DB lookup fails", async () => {
    stubFindOneError(new Error("Mongo timeout"));
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to delete listed project. Try again later.",
      })
    );
  });

  // ── Project not found ─────────────────────────────────────────────────────

  it("returns 404 when project is not found", async () => {
    stubFindOne(null);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "No such project was listed. Invalid Request.",
      })
    );
    expect(Purchase.exists).not.toHaveBeenCalled();
  });

  // ── Already-scheduled guard ───────────────────────────────────────────────

  it("returns 400 when project is already scheduled for deletion", async () => {
    const alreadyScheduled = mockProjectDoc({
      scheduled_deletion_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });
    stubFindOne(alreadyScheduled);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Project is already scheduled for deletion.",
      })
    );
    // Must not proceed to sales check
    expect(Purchase.exists).not.toHaveBeenCalled();
  });

  it("does NOT treat scheduled_deletion_at: null as already-scheduled", async () => {
    stubFindOne(mockProjectDoc({ scheduled_deletion_at: null }));
    vi.mocked(Purchase.exists).mockResolvedValue(null as any);
    vi.mocked(performProjectHardDelete as any).mockResolvedValue(undefined);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    // Should reach the sales check
    expect(Purchase.exists).toHaveBeenCalled();
  });

  // ── Sales check errors ────────────────────────────────────────────────────

  it("returns 500 when sales check DB query fails", async () => {
    stubFindOne(mockProjectDoc());
    vi.mocked(Purchase.exists).mockRejectedValue(new Error("DB error"));
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to delete listed project. Try again later.",
      })
    );
  });

  // ── Soft-delete path (has sales) ──────────────────────────────────────────

  it("soft-deletes and returns 200 when confirmed purchases exist", async () => {
    stubFindOne(mockProjectDoc());
    vi.mocked(Purchase.exists).mockResolvedValue({ _id: "sale_1" } as any);
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
    vi.mocked(User.updateMany).mockResolvedValue({ modifiedCount: 3 } as any);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    // Should set isActive=false and scheduled_deletion_at
    expect(Project.updateOne).toHaveBeenCalledWith(
      { _id: VALID_PROJECT_ID },
      expect.objectContaining({
        isActive: false,
        scheduled_deletion_at: expect.any(Date),
      })
    );

    // scheduled_deletion_at should be approximately 7 days from now
    const callArgs = (vi.mocked(Project.updateOne).mock.calls[0] as any[])[1];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const diff = callArgs.scheduled_deletion_at.getTime() - Date.now();
    expect(diff).toBeGreaterThan(sevenDaysMs - 5_000);
    expect(diff).toBeLessThan(sevenDaysMs + 5_000);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Project scheduled for deletion in 7 days. Buyers will be notified.",
      })
    );
  });

  it("removes soft-deleted project from all user wishlists", async () => {
    stubFindOne(mockProjectDoc());
    vi.mocked(Purchase.exists).mockResolvedValue({ _id: "sale_1" } as any);
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
    vi.mocked(User.updateMany).mockResolvedValue({ modifiedCount: 5 } as any);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(User.updateMany).toHaveBeenCalledWith(
      { wishlist: VALID_PROJECT_ID },
      { $pull: { wishlist: VALID_PROJECT_ID } }
    );
  });

  it("returns 500 when soft-delete DB update fails", async () => {
    stubFindOne(mockProjectDoc());
    vi.mocked(Purchase.exists).mockResolvedValue({ _id: "sale_1" } as any);
    vi.mocked(Project.updateOne).mockRejectedValue(new Error("write failed"));
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to delete listed project. Try again later.",
      })
    );
    // Wishlist cleanup should NOT run if soft-delete update failed
    expect(User.updateMany).not.toHaveBeenCalled();
  });

  it("returns 200 even when wishlist removal fails (non-fatal)", async () => {
    stubFindOne(mockProjectDoc());
    vi.mocked(Purchase.exists).mockResolvedValue({ _id: "sale_1" } as any);
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
    // Wishlist removal fails
    vi.mocked(User.updateMany).mockRejectedValue(new Error("Redis timeout"));
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    // Non-fatal: should still return 200
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Project scheduled for deletion in 7 days. Buyers will be notified.",
      })
    );
  });

  it("does NOT call performProjectHardDelete when project has sales", async () => {
    stubFindOne(mockProjectDoc());
    vi.mocked(Purchase.exists).mockResolvedValue({ _id: "sale_1" } as any);
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);
    vi.mocked(User.updateMany).mockResolvedValue({ modifiedCount: 0 } as any);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(performProjectHardDelete).not.toHaveBeenCalled();
  });

  // ── Hard-delete path (no sales) ───────────────────────────────────────────

  it("calls performProjectHardDelete and returns 200 when no confirmed purchases exist", async () => {
    const project = mockProjectDoc({
      project_images: ["https://cdn.example.com/img.jpg"],
      repo_zip_s3_key: "zips/proj.zip",
    });
    stubFindOne(project);
    vi.mocked(Purchase.exists).mockResolvedValue(null as any); // no sales
    vi.mocked(performProjectHardDelete as any).mockResolvedValue(undefined);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(performProjectHardDelete).toHaveBeenCalledWith(project);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project was deleted successfully" })
    );
  });

  it("does NOT run the soft-delete path when there are no sales", async () => {
    stubFindOne(mockProjectDoc());
    vi.mocked(Purchase.exists).mockResolvedValue(null as any);
    vi.mocked(performProjectHardDelete as any).mockResolvedValue(undefined);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(Project.updateOne).not.toHaveBeenCalled();
    expect(User.updateMany).not.toHaveBeenCalled();
  });

  // ── Idempotency of the already-scheduled guard ────────────────────────────

  it("handles repeated DELETE calls on already-soft-deleted project gracefully", async () => {
    // Simulates seller calling DELETE again via direct API bypass of the UI guard
    const alreadyScheduled = mockProjectDoc({
      scheduled_deletion_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days left
    });
    stubFindOne(alreadyScheduled);
    const req = makeReq();
    deleteProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    // Timer is NOT reset — the 7-day window is preserved
    expect(Project.updateOne).not.toHaveBeenCalled();
    expect(User.updateMany).not.toHaveBeenCalled();
    expect(performProjectHardDelete).not.toHaveBeenCalled();
  });
});
