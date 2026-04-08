/**
 * Tests for the getPublicProjectDetail controller endpoint.
 *
 * Key logic:
 * - No authentication required (public endpoint)
 * - Accepts a slug route param
 * - Slug too short (<3) or too long (>200) → 400
 * - DB error → 500
 * - Not found → 404
 * - Seller with profile_visibility=false → sensitive fields stripped
 * - Seller with profile_visibility=true (or undefined) → all fields returned
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
    updateOne: vi.fn(),
  },
}));

vi.mock("../models/user.model", () => ({
  User: {
    findById: vi.fn(),
  },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: { exists: vi.fn() },
}));

vi.mock("../models/projectDownload.model", () => ({
  ProjectDownload: {
    countDocuments: vi.fn(),
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

import { getPublicProjectDetail } from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { ProjectDownload } from "../models/projectDownload.model";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_SLUG = "nextjs-ecommerce-boilerplate-k8x2mp";
const PROJECT_ID = "507f191e810c19729de860ea";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (slug: string) => ({
  params: { slug },
  query: {},
  body: {},
});

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const next = vi.fn();

const makeProjectDoc = (overrides: Record<string, any> = {}) => ({
  _id: PROJECT_ID,
  title: "Next.js Ecommerce Boilerplate",
  description: "A complete ecommerce boilerplate",
  project_type: "Web Application",
  tech_stack: ["Next.js", "TypeScript"],
  price: 49,
  avgRating: 4.5,
  totalReviews: 12,
  live_link: "https://demo.example.com",
  createdAt: new Date().toISOString(),
  project_images: ["https://cdn.example.com/img.jpg"],
  project_images_detail: ["https://cdn.example.com/detail.jpg"],
  project_video: "",
  slug: VALID_SLUG,
  userid: {
    username: "seller_user",
    name: "Seller Name",
    profile_image_url: "https://cdn.example.com/avatar.jpg",
    short_bio: "Developer",
    job_role: "Full Stack Dev",
    location: "New York",
    website_url: "https://seller.com",
    x_username: "seller_x",
    profile_visibility: true,
  },
  ...overrides,
});

/** Stubs the findOne chain: .select().populate().lean() */
const stubProjectFindOne = (data: any) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(data),
  } as any);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getPublicProjectDetail", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(ProjectDownload.countDocuments).mockResolvedValue(18);
  });

  // ── Slug validation ───────────────────────────────────────────────────────

  it("returns 400 when slug is too short (< 3 chars)", async () => {
    const req = makeReq("ab");
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Valid project slug is required",
      })
    );
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  it("returns 400 when slug is too long (> 200 chars)", async () => {
    const req = makeReq("a".repeat(201));
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  it("returns 400 when slug is empty string", async () => {
    const req = makeReq("");
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  // ── Slug routing ───────────────────────────────────────────────────────────

  it("queries by slug", async () => {
    stubProjectFindOne(makeProjectDoc());

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ slug: VALID_SLUG })
    );
    expect(Project.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.anything() })
    );
  });

  it("treats a 24-char hex string as a slug, not a legacy ObjectId", async () => {
    const hexLookingSlug = "507f191e810c19729de860ea";
    stubProjectFindOne(makeProjectDoc({ slug: hexLookingSlug }));

    const req = makeReq(hexLookingSlug);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ slug: hexLookingSlug })
    );
    expect(Project.findOne).not.toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.anything() })
    );
  });

  it("always includes marketplace visibility filters in the query", async () => {
    stubProjectFindOne(makeProjectDoc());

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        github_access_revoked: false,
        repo_zip_status: "SUCCESS",
      })
    );
  });

  // ── Not found / DB error ──────────────────────────────────────────────────

  it("returns 404 when project is not found", async () => {
    stubProjectFindOne(null);

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project not found" })
    );
  });

  it("returns 500 when the database query throws", async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error("DB timeout")),
    } as any);

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("returns 200 with full project data on success", async () => {
    stubProjectFindOne(makeProjectDoc());

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Public project detail fetched successfully",
        data: expect.objectContaining({
          title: "Next.js Ecommerce Boilerplate",
          downloadCount: 18,
          slug: VALID_SLUG,
        }),
      })
    );
  });
  it("returns downloadCount = 0 when the unique download count lookup fails", async () => {
    vi.mocked(ProjectDownload.countDocuments).mockRejectedValue(
      new Error("count failed")
    );
    stubProjectFindOne(makeProjectDoc());

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data.downloadCount).toBe(0);
  });

  // ── Seller profile visibility ─────────────────────────────────────────────

  it("strips sensitive seller fields when profile_visibility is false", async () => {
    stubProjectFindOne(
      makeProjectDoc({
        userid: {
          username: "private_seller",
          name: "Private Seller",
          profile_image_url: "https://cdn.example.com/avatar.jpg",
          short_bio: "Secret bio",
          location: "Hidden City",
          website_url: "https://hidden.com",
          x_username: "hidden_x",
          profile_visibility: false,
        },
      })
    );

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const seller = res.json.mock.calls[0][0].data.userid;

    // These fields must be stripped
    expect(seller.short_bio).toBeUndefined();
    expect(seller.location).toBeUndefined();
    expect(seller.website_url).toBeUndefined();
    expect(seller.x_username).toBeUndefined();

    // These fields must remain
    expect(seller.username).toBe("private_seller");
    expect(seller.name).toBe("Private Seller");
    expect(seller.profile_visibility).toBe(false);
  });

  it("returns all seller fields when profile_visibility is true", async () => {
    stubProjectFindOne(
      makeProjectDoc({
        userid: {
          username: "public_seller",
          name: "Public Seller",
          profile_image_url: "https://cdn.example.com/avatar.jpg",
          short_bio: "A great developer",
          location: "San Francisco",
          website_url: "https://seller.dev",
          x_username: "public_x",
          profile_visibility: true,
        },
      })
    );

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const seller = res.json.mock.calls[0][0].data.userid;

    expect(seller.short_bio).toBe("A great developer");
    expect(seller.location).toBe("San Francisco");
    expect(seller.website_url).toBe("https://seller.dev");
    expect(seller.x_username).toBe("public_x");
  });

  it("returns all seller fields when profile_visibility is undefined (default)", async () => {
    const projectDoc = makeProjectDoc();
    const { profile_visibility, ...useridWithoutVisibility } =
      projectDoc.userid;
    stubProjectFindOne({
      ...projectDoc,
      userid: useridWithoutVisibility,
    });

    const req = makeReq(VALID_SLUG);
    getPublicProjectDetail(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const seller = res.json.mock.calls[0][0].data.userid;
    // Seller info should be present (no stripping)
    expect(seller.username).toBe("seller_user");
    expect(seller.short_bio).toBe("Developer");
  });
});
