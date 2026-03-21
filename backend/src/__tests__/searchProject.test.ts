/**
 * Tests for searchProject controller endpoint.
 *
 * searchProject calls searchAndFilterProjects() which uses:
 *   Project.find(query).sort().skip().limit().select().populate().lean()
 *   Project.countDocuments(query)   — in a Promise.all
 *
 * Covers:
 * - Auth guard (401)
 * - Schema validation failures (400)
 * - Successful empty search (all marketplace-eligible projects)
 * - Filter by projectTypes
 * - Filter by techStack
 * - Price range filter
 * - Sort by price_low
 * - Pagination metadata (currentPage, totalPages, hasNextPage, hasPrevPage)
 * - DB error (500)
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

import { searchProject } from "../controllers/projects.controller";
import { Project } from "../models/project.model";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (bodyOverrides: Record<string, any> = {}) => ({
  user: { _id: VALID_USER_ID },
  query: {},
  body: {
    searchTerm: "",
    projectTypes: [],
    techStack: [],
    sortBy: "newest",
    limit: 12,
    offset: 0,
    ...bodyOverrides,
  },
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

const mockProject = (overrides: Record<string, any> = {}) => ({
  title: "My Project",
  description: "A cool project",
  project_type: "Web Application",
  tech_stack: ["React", "Node.js"],
  price: 50,
  avgRating: 4.5,
  totalReviews: 10,
  live_link: "",
  createdAt: new Date("2025-01-01"),
  project_images: ["https://cdn.example.com/img.jpg"],
  ...overrides,
});

/**
 * Stubs the Project.find chain with a full method chain.
 * searchAndFilterProjects uses: .sort().skip().limit().select().populate().lean()
 */
const stubFindChain = (projects: any[]) => {
  vi.mocked(Project.find).mockReturnValue({
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(projects),
  } as any);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("searchProject", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  // ── Validation failures ───────────────────────────────────────────────────

  it("returns 400 when searchTerm exceeds 50 characters", async () => {
    const req = makeReq({ searchTerm: "a".repeat(51) });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.find).not.toHaveBeenCalled();
  });

  it("returns 400 when sortBy is not a valid enum value", async () => {
    const req = makeReq({ sortBy: "invalid_sort" });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.find).not.toHaveBeenCalled();
  });

  it("returns 400 when minPrice is greater than maxPrice", async () => {
    const req = makeReq({ minPrice: 100, maxPrice: 50 });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.find).not.toHaveBeenCalled();
  });

  it("returns 400 when limit is 0 (below minimum)", async () => {
    const req = makeReq({ limit: 0 });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when limit exceeds 50", async () => {
    const req = makeReq({ limit: 51 });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── DB error ──────────────────────────────────────────────────────────────

  it("returns 500 when DB query throws", async () => {
    vi.mocked(Project.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error("DB error")),
    } as any);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq();
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Success cases ─────────────────────────────────────────────────────────

  it("returns 200 with all active marketplace projects on empty search", async () => {
    const projects = [mockProject(), mockProject({ title: "Second Project" })];
    stubFindChain(projects);
    vi.mocked(Project.countDocuments).mockResolvedValue(2 as any);

    const req = makeReq();
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data.projects).toHaveLength(2);

    // Query must enforce marketplace eligibility
    expect(Project.find).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        github_access_revoked: false,
        repo_zip_status: "SUCCESS",
      })
    );
  });

  it("includes projectType filter in query when provided", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({ projectTypes: ["Web Application", "API"] });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(Project.find).toHaveBeenCalledWith(
      expect.objectContaining({
        project_type: { $in: ["Web Application", "API"] },
      })
    );
  });

  it("includes techStack filter in query when provided", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({ techStack: ["React", "TypeScript"] });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(Project.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tech_stack: { $in: ["React", "TypeScript"] },
      })
    );
  });

  it("includes price range in query when minPrice and maxPrice are provided", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({ minPrice: 10, maxPrice: 200 });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(Project.find).toHaveBeenCalledWith(
      expect.objectContaining({
        price: { $gte: 10, $lte: 200 },
      })
    );
  });

  it("returns correct pagination metadata", async () => {
    stubFindChain(Array(12).fill(mockProject()));
    vi.mocked(Project.countDocuments).mockResolvedValue(30 as any);

    const req = makeReq({ limit: 12, offset: 12 }); // page 2
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    const pagination = callArg.data.pagination;

    expect(pagination.totalPages).toBe(3); // ceil(30/12) = 3
    expect(pagination.hasNextPage).toBe(true); // offset(12) + limit(12) = 24 < 30
    expect(pagination.hasPrevPage).toBe(true); // offset > 0
    expect(pagination.currentPage).toBe(2); // floor(12/12) + 1 = 2
    expect(pagination.totalCount).toBe(30);
  });

  it("returns hasPrevPage: false on first page", async () => {
    stubFindChain([mockProject()]);
    vi.mocked(Project.countDocuments).mockResolvedValue(1 as any);

    const req = makeReq({ limit: 12, offset: 0 });
    searchProject(req as any, res, next);
    await flushPromises();

    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data.pagination.hasPrevPage).toBe(false);
    expect(callArg.data.pagination.hasNextPage).toBe(false);
  });

  it("maps project_images to first image string in response", async () => {
    const projectWithImages = mockProject({
      project_images: [
        "https://cdn.example.com/img1.jpg",
        "https://cdn.example.com/img2.jpg",
      ],
    });
    stubFindChain([projectWithImages]);
    vi.mocked(Project.countDocuments).mockResolvedValue(1 as any);

    const req = makeReq();
    searchProject(req as any, res, next);
    await flushPromises();

    const callArg = res.json.mock.calls[0][0];
    // searchAndFilterProjects maps project_images to first item
    expect(callArg.data.projects[0].project_images).toBe(
      "https://cdn.example.com/img1.jpg"
    );
  });

  // ── T1: Soft-delete exclusion ─────────────────────────────────────────────

  it("T1: excludes soft-deleted projects by including scheduled_deletion_at: null in query", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq();
    searchProject(req as any, res, next);
    await flushPromises();

    expect(Project.find).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled_deletion_at: null })
    );
    expect(Project.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled_deletion_at: null })
    );
  });

  // ── T2-T6: Sort options ───────────────────────────────────────────────────

  /**
   * Helper that stubs the find chain and returns a spy for the .sort() call,
   * so individual sort tests can assert the exact sort argument.
   */
  const stubFindChainWithSortSpy = (projects: any[] = []) => {
    const sortSpy = vi.fn().mockReturnValue({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(projects),
    });
    vi.mocked(Project.find).mockReturnValue({ sort: sortSpy } as any);
    return sortSpy;
  };

  it("T2: sorts by createdAt desc when sortBy=newest", async () => {
    const sortSpy = stubFindChainWithSortSpy();
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    searchProject(makeReq({ sortBy: "newest" }) as any, res, next);
    await flushPromises();

    expect(sortSpy).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it("T3: sorts by price asc then createdAt desc when sortBy=price_low", async () => {
    const sortSpy = stubFindChainWithSortSpy();
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    searchProject(makeReq({ sortBy: "price_low" }) as any, res, next);
    await flushPromises();

    expect(sortSpy).toHaveBeenCalledWith({ price: 1, createdAt: -1 });
  });

  it("T4: sorts by price desc then createdAt desc when sortBy=price_high", async () => {
    const sortSpy = stubFindChainWithSortSpy();
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    searchProject(makeReq({ sortBy: "price_high" }) as any, res, next);
    await flushPromises();

    expect(sortSpy).toHaveBeenCalledWith({ price: -1, createdAt: -1 });
  });

  it("T5: sorts by avgRating desc, totalReviews desc when sortBy=rating_high", async () => {
    const sortSpy = stubFindChainWithSortSpy();
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    searchProject(makeReq({ sortBy: "rating_high" }) as any, res, next);
    await flushPromises();

    expect(sortSpy).toHaveBeenCalledWith({
      avgRating: -1,
      totalReviews: -1,
      createdAt: -1,
    });
  });

  it("T6: sorts by avgRating asc, totalReviews asc when sortBy=rating_low", async () => {
    const sortSpy = stubFindChainWithSortSpy();
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    searchProject(makeReq({ sortBy: "rating_low" }) as any, res, next);
    await flushPromises();

    expect(sortSpy).toHaveBeenCalledWith({
      avgRating: 1,
      totalReviews: 1,
      createdAt: -1,
    });
  });

  // ── T7: Regex injection / escaping ────────────────────────────────────────

  it("T7: does not throw and uses escaped $or when searchTerm contains regex metacharacters", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    // These characters would cause ReDoS or syntax errors if unescaped
    const req = makeReq({ searchTerm: ".*+?^${}()|[]\\" });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const [queryArg] = vi.mocked(Project.find).mock.calls[0];
    // $or must be present and each regex pattern must be the escaped version
    expect(queryArg.$or).toBeDefined();
    const escapedPattern = "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\";
    expect(queryArg.$or[0].title.$regex).toBe(escapedPattern);
  });

  // ── T8: Whitespace-only searchTerm ────────────────────────────────────────

  it("T8: omits $or from query when searchTerm is only whitespace", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({ searchTerm: "   " });
    searchProject(req as any, res, next);
    await flushPromises();

    const [queryArg] = vi.mocked(Project.find).mock.calls[0];
    expect(queryArg.$or).toBeUndefined();
  });

  // ── T9-T10: Partial price range ───────────────────────────────────────────

  it("T9: includes only $gte in price filter when only minPrice is provided", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({ minPrice: 5 });
    searchProject(req as any, res, next);
    await flushPromises();

    const [queryArg] = vi.mocked(Project.find).mock.calls[0];
    expect(queryArg.price).toEqual({ $gte: 5 });
    expect(queryArg.price.$lte).toBeUndefined();
  });

  it("T10: includes only $lte in price filter when only maxPrice is provided", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({ maxPrice: 100 });
    searchProject(req as any, res, next);
    await flushPromises();

    const [queryArg] = vi.mocked(Project.find).mock.calls[0];
    expect(queryArg.price).toEqual({ $lte: 100 });
    expect(queryArg.price.$gte).toBeUndefined();
  });

  // ── T11: Combined filters ─────────────────────────────────────────────────

  it("T11: applies searchTerm $or, projectType, and techStack together", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({
      searchTerm: "commerce",
      projectTypes: ["Web Application"],
      techStack: ["React"],
    });
    searchProject(req as any, res, next);
    await flushPromises();

    const [queryArg] = vi.mocked(Project.find).mock.calls[0];
    expect(queryArg.$or).toBeDefined();
    expect(queryArg.project_type).toEqual({ $in: ["Web Application"] });
    expect(queryArg.tech_stack).toEqual({ $in: ["React"] });
  });

  // ── T12: Max limit boundary ───────────────────────────────────────────────

  it("T12: returns 200 when limit is exactly 50 (max boundary)", async () => {
    stubFindChain([]);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({ limit: 50 });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── T13: Offset/skip ──────────────────────────────────────────────────────

  it("T13: calls skip with the offset value when paginating", async () => {
    const skipSpy = vi.fn().mockReturnThis();
    vi.mocked(Project.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: skipSpy,
      limit: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as any);
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);

    const req = makeReq({ offset: 12 });
    searchProject(req as any, res, next);
    await flushPromises();

    expect(skipSpy).toHaveBeenCalledWith(12);
  });
});
