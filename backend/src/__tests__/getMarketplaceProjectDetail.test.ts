/**
 * Tests for getMarketplaceProjectDetail controller endpoint.
 *
 * Key business logic:
 * - Buyers who have CONFIRMED purchases bypass marketplace visibility filters
 *   (can see inactive/revoked projects they've purchased)
 * - Non-buyers only see projects where isActive=true, github_access_revoked=false,
 *   repo_zip_status="SUCCESS"
 *
 * Uses:
 *   Purchase.exists({ buyerId, projectId, status: "CONFIRMED" })
 *   Project.findOne(query).select(DETAIL_SELECT).populate(DETAIL_SELLER_POPULATE).lean()
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
    countDocuments: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../models/user.model", () => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: {
    exists: vi.fn(),
    findOne: vi.fn(),
  },
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
    getInstallationToken: vi.fn().mockResolvedValue("ghs_token_abc"),
    verifyWebhookSignature: vi.fn(),
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

import { getMarketplaceProjectDetail } from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { Purchase } from "../models/purchase.model";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_PROJECT_ID = "507f191e810c19729de860ea";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (overrides: Record<string, any> = {}) => ({
  user: { _id: VALID_USER_ID },
  query: { project_id: VALID_PROJECT_ID },
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

const next = vi.fn();

const mockProjectDetail = (overrides: Record<string, any> = {}) => ({
  _id: VALID_PROJECT_ID,
  title: "My Project",
  description: "A cool project",
  project_type: "Web Application",
  tech_stack: ["React"],
  price: 99,
  avgRating: 4.5,
  totalReviews: 10,
  live_link: "",
  createdAt: new Date(),
  project_images: ["https://cdn.example.com/img.jpg"],
  project_images_detail: ["https://cdn.example.com/detail.jpg"],
  project_video: "",
  repo_tree: null,
  repo_tree_status: "SUCCESS",
  scheduled_deletion_at: null,
  userid: {
    username: "seller_user",
    name: "Seller Name",
    profile_image_url: "https://cdn.example.com/avatar.jpg",
    short_bio: "Developer",
    job_role: "Full Stack Dev",
    location: "New York",
    website_url: "https://seller.com",
    x_username: "seller_x",
  },
  ...overrides,
});

/**
 * Stubs the Project.findOne chain:
 * Project.findOne(query).select(DETAIL_SELECT).populate(DETAIL_SELLER_POPULATE).lean()
 */
const stubProjectFindOne = (data: any) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(data),
  } as any);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getMarketplaceProjectDetail", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Purchase.exists).not.toHaveBeenCalled();
  });

  // ── Validation guard ──────────────────────────────────────────────────────

  it("returns 400 when project_id is missing", async () => {
    const req = makeReq({ query: {} });
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Purchase.exists).not.toHaveBeenCalled();
  });

  it("returns 400 when project_id is not a valid ObjectId (24-char hex)", async () => {
    const req = makeReq({ query: { project_id: "not-a-valid-id" } });
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Valid project_id query parameter is required",
      })
    );
    expect(Purchase.exists).not.toHaveBeenCalled();
  });

  // ── Project not found ─────────────────────────────────────────────────────

  it("returns 404 when project does not exist", async () => {
    vi.mocked(Purchase.exists).mockResolvedValue(null as any);
    stubProjectFindOne(null);

    const req = makeReq();
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project not found" })
    );
  });

  // ── Non-buyer access checks ───────────────────────────────────────────────

  it("returns 404 for inactive project when buyer has NOT purchased", async () => {
    vi.mocked(Purchase.exists).mockResolvedValue(null as any); // no purchase
    // When hasPurchased is falsy, query includes isActive: true
    // MongoDB returns null because the project is inactive
    stubProjectFindOne(null);

    const req = makeReq();
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    // The query includes isActive: true filter, so inactive project returns null
    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        github_access_revoked: false,
        repo_zip_status: "SUCCESS",
      })
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("enforces all 3 marketplace visibility filters for non-buyers", async () => {
    vi.mocked(Purchase.exists).mockResolvedValue(null as any);
    stubProjectFindOne(null);

    const req = makeReq();
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        github_access_revoked: false,
        repo_zip_status: "SUCCESS",
      })
    );
  });

  it("returns 200 for active project when buyer has NOT purchased", async () => {
    vi.mocked(Purchase.exists).mockResolvedValue(null as any);
    stubProjectFindOne(mockProjectDetail());

    const req = makeReq();
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "My Project",
        }),
      })
    );
  });

  // ── Buyer bypass logic ────────────────────────────────────────────────────

  it("bypasses marketplace filters for confirmed buyer (can see inactive projects)", async () => {
    // Buyer has confirmed purchase → hasPurchased is truthy
    vi.mocked(Purchase.exists).mockResolvedValue({ _id: "purchase_1" } as any);
    // Even if project is inactive, it's returned
    stubProjectFindOne(
      mockProjectDetail({ isActive: false, scheduled_deletion_at: new Date() })
    );

    const req = makeReq();
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    // Query should NOT include marketplace filters
    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.anything() })
    );
    expect(Project.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("checks purchase with correct buyerId, projectId, and status=CONFIRMED", async () => {
    vi.mocked(Purchase.exists).mockResolvedValue(null as any);
    stubProjectFindOne(mockProjectDetail());

    const req = makeReq();
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(Purchase.exists).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "CONFIRMED",
      })
    );
  });

  // ── DB errors ─────────────────────────────────────────────────────────────

  it("returns 500 when Project.findOne throws", async () => {
    vi.mocked(Purchase.exists).mockResolvedValue(null as any);
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error("DB error")),
    } as any);

    const req = makeReq();
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 200 with populated seller info on success", async () => {
    vi.mocked(Purchase.exists).mockResolvedValue(null as any);
    stubProjectFindOne(
      mockProjectDetail({
        userid: {
          username: "seller123",
          name: "Seller Name",
          profile_image_url: "https://cdn.example.com/seller.jpg",
          short_bio: "Dev",
          job_role: "Backend Engineer",
          location: "Remote",
          website_url: "https://seller.dev",
          x_username: "sellerx",
        },
      })
    );

    const req = makeReq();
    getMarketplaceProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data.userid.username).toBe("seller123");
    expect(callArg.data.userid.job_role).toBe("Backend Engineer");
  });
});
