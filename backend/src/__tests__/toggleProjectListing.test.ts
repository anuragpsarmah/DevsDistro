/**
 * Tests for the full toggleProjectListing endpoint flow.
 *
 * Note: The soft-delete guard (scheduled_deletion_at check) is already
 * tested in softDeleteGuards.test.ts. This file covers the full flow
 * including all other guards and the happy paths.
 *
 * toggleProjectListing uses a Promise.all for the initial fetch:
 *   [ Project.findOne({userid, github_repo_id}).select(...), User.findById().select().lean() ]
 * then Project.findOneAndUpdate with aggregation pipeline for the actual toggle.
 *
 * NOTE: asyncHandler doesn't expose its Promise, so we use flushPromises()
 * (setImmediate-based) to drain the microtask queue before assertions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks (hoisted before imports) ───────────────────────────────────

vi.mock("../models/project.model", () => ({
  Project: {
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../models/user.model", () => ({
  User: {
    findById: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: { exists: vi.fn(), findOne: vi.fn() },
}));

vi.mock("../models/githubAppInstallation.model", () => ({
  GitHubAppInstallation: {
    findOne: vi.fn(),
  },
}));

vi.mock("..", () => ({
  redisClient: { zadd: vi.fn(), hset: vi.fn(), expire: vi.fn(), del: vi.fn() },
  s3Service: {
    validateAndCreatePreSignedDownloadUrl: vi.fn(),
    createPreSignedUploadUrl: vi.fn(),
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
    getInstallationToken: vi.fn().mockResolvedValue("ghs_token_abc"),
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

vi.mock("../utils/redisPrefixGenerator.util", () => ({
  privateRepoPrefix: vi.fn((id: string) => `private-repos:${id}`),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { toggleProjectListing } from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_PROJECT_ID = "507f191e810c19729de860ea";
const VALID_REPO_ID = "87654321";
const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (overrides: Record<string, any> = {}) => ({
  user: { _id: VALID_USER_ID },
  query: {},
  body: { github_repo_id: VALID_REPO_ID },
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

const next = vi.fn();

/**
 * Stubs the Promise.all call in toggleProjectListing:
 * [ Project.findOne().select(...), User.findById().select().lean(), Project.countDocuments() ]
 */
const stubQueryAll = (
  projectMock: any,
  userMock: any,
  activeCount: number = 0
) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockResolvedValue(projectMock),
  } as any);
  vi.mocked(User.findById).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(userMock),
    }),
  } as any);
  vi.mocked(Project.countDocuments).mockResolvedValue(activeCount as any);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("toggleProjectListing — full flow", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  // ── Validation guard ──────────────────────────────────────────────────────

  it("returns 400 when github_repo_id is missing from body", async () => {
    const req = makeReq({ body: {} });
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  // ── DB error on initial fetch ─────────────────────────────────────────────

  it("returns 500 when Promise.all DB query throws", async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error("DB error")),
    } as any);

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Not found guard ───────────────────────────────────────────────────────

  it("returns 404 when project does not exist", async () => {
    stubQueryAll(null, { project_listing_limit: 2 });

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid Repo ID. No such records found.",
      })
    );
    expect(Project.findOneAndUpdate).not.toHaveBeenCalled();
  });

  // ── Soft-delete guard (brief confirmation — full coverage in softDeleteGuards.test.ts) ──

  it("returns 400 when project is scheduled for deletion", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: FUTURE_DATE,
      },
      { project_listing_limit: 2 }
    );

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.findOneAndUpdate).not.toHaveBeenCalled();
  });

  // ── GitHub access revoked guard ───────────────────────────────────────────

  it("returns 403 when github_access_revoked is true", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: false,
        github_access_revoked: true,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 2 }
    );

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "GitHub repository access has been revoked"
        ),
      })
    );
    expect(Project.findOneAndUpdate).not.toHaveBeenCalled();
  });

  // ── Project listing limit guard ───────────────────────────────────────────

  it("returns 403 when active marketplace-visible project count equals the limit", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: false, // user wants to activate this inactive project
        github_access_revoked: false,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 2 },
      2 // already at quota
    );

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("allowed active listings"),
      })
    );
    expect(Project.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when quota is zero (limit=0, count=0 means 0>=0)", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: false,
        github_access_revoked: false,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 0 },
      0 // count=0 but limit=0 → 0 >= 0 → blocked
    );

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Project.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("allows activation when count is below the limit", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: false,
        github_access_revoked: false,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 2 },
      1 // 1 < 2 → allowed
    );
    vi.mocked(Project.findOneAndUpdate).mockResolvedValue({
      _id: VALID_PROJECT_ID,
      isActive: true,
      github_repo_id: VALID_REPO_ID,
    } as any);

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(Project.findOneAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT trigger listing limit guard when project is active (toggling off)", async () => {
    // An active project being toggled off should always be allowed, even when at limit
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: true, // currently active — user wants to deactivate
        github_access_revoked: false,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 2 },
      2 // already at quota, but deactivating is always allowed
    );
    vi.mocked(Project.findOneAndUpdate).mockResolvedValue({
      _id: VALID_PROJECT_ID,
      isActive: false,
      github_repo_id: VALID_REPO_ID,
    } as any);

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(Project.findOneAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── DB error on update ────────────────────────────────────────────────────

  it("returns 500 when findOneAndUpdate throws", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 2 }
    );
    vi.mocked(Project.findOneAndUpdate).mockRejectedValue(
      new Error("DB error")
    );

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Success paths ─────────────────────────────────────────────────────────

  it("returns 200 with new status: false when toggling active → inactive", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 2 }
    );
    vi.mocked(Project.findOneAndUpdate).mockResolvedValue({
      _id: VALID_PROJECT_ID,
      isActive: false,
      github_repo_id: VALID_REPO_ID,
    } as any);

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: false }),
      })
    );
  });

  it("returns 200 with new status: true when toggling inactive → active", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: false,
        github_access_revoked: false,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 2 }
    );
    vi.mocked(Project.findOneAndUpdate).mockResolvedValue({
      _id: VALID_PROJECT_ID,
      isActive: true,
      github_repo_id: VALID_REPO_ID,
    } as any);

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: true }),
      })
    );
  });

  it("uses aggregation pipeline $not operator for atomic toggle", async () => {
    stubQueryAll(
      {
        _id: VALID_PROJECT_ID,
        isActive: true,
        github_access_revoked: false,
        scheduled_deletion_at: null,
      },
      { project_listing_limit: 2 }
    );
    vi.mocked(Project.findOneAndUpdate).mockResolvedValue({
      _id: VALID_PROJECT_ID,
      isActive: false,
      github_repo_id: VALID_REPO_ID,
    } as any);

    const req = makeReq();
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(Project.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ github_repo_id: VALID_REPO_ID }),
      [{ $set: { isActive: { $not: "$isActive" } } }],
      { new: true }
    );
  });
});
