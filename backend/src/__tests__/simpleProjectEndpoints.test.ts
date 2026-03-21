/**
 * Tests for the simpler project controller endpoints:
 *  - getRepoZipStatus
 *  - getInitialProjectData
 *  - getSpecificProjectData
 *  - getTotalListedProjects
 *  - getTotalActiveProjects
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
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
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

import {
  getRepoZipStatus,
  getInitialProjectData,
  getSpecificProjectData,
  getTotalListedProjects,
  getTotalActiveProjects,
} from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_REPO_ID = "87654321";
const VALID_PROJECT_ID = "507f191e810c19729de860ea";
const CDN_URL = "https://cdn.example.com";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (overrides: Record<string, any> = {}) => ({
  user: { _id: VALID_USER_ID },
  query: {},
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

// ─── getRepoZipStatus ─────────────────────────────────────────────────────────

describe("getRepoZipStatus", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    getRepoZipStatus(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when github_repo_id is missing from query", async () => {
    const req = makeReq({ query: {} });
    getRepoZipStatus(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when project is not found", async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as any);

    const req = makeReq({ query: { github_repo_id: VALID_REPO_ID } });
    getRepoZipStatus(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project not found" })
    );
  });

  it("returns 500 when database query throws", async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error("DB timeout")),
      }),
    } as any);

    const req = makeReq({ query: { github_repo_id: VALID_REPO_ID } });
    getRepoZipStatus(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 200 with repo_zip_status and repo_zip_error", async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          repo_zip_status: "FAILED",
          repo_zip_error: "Clone failed: timeout",
        }),
      }),
    } as any);

    const req = makeReq({ query: { github_repo_id: VALID_REPO_ID } });
    getRepoZipStatus(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          repo_zip_status: "FAILED",
          repo_zip_error: "Clone failed: timeout",
        }),
      })
    );
  });
});

// ─── getInitialProjectData ────────────────────────────────────────────────────

describe("getInitialProjectData", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    process.env.S3_CLOUDFRONT_DISTRIBUTION = CDN_URL;
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    getInitialProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 500 when database query throws", async () => {
    vi.mocked(Project.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockReturnValue({
          then: vi.fn().mockRejectedValue(new Error("DB error")),
        }),
      }),
    } as any);

    const req = makeReq();
    getInitialProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 200 with formatted projects (first image extracted)", async () => {
    const rawProjects = [
      {
        github_repo_id: VALID_REPO_ID,
        title: "My Project",
        description: "A cool project",
        tech_stack: ["React"],
        isActive: true,
        github_access_revoked: false,
        repo_zip_status: "SUCCESS",
        scheduled_deletion_at: null,
        project_images: [`${CDN_URL}/img1.jpg`, `${CDN_URL}/img2.jpg`],
      },
    ];

    vi.mocked(Project.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(rawProjects),
      }),
    } as any);

    const req = makeReq();
    getInitialProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    // project_images should be the first URL string, not the full array
    expect(callArg.data[0].project_images).toBe(`${CDN_URL}/img1.jpg`);
  });

  it("returns empty string for project_images when project has no images", async () => {
    const rawProjects = [
      {
        github_repo_id: VALID_REPO_ID,
        title: "No Image Project",
        description: "No images",
        tech_stack: [],
        isActive: false,
        github_access_revoked: false,
        repo_zip_status: "PROCESSING",
        scheduled_deletion_at: null,
        project_images: [],
      },
    ];

    vi.mocked(Project.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(rawProjects),
      }),
    } as any);

    const req = makeReq();
    getInitialProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data[0].project_images).toBe("");
  });
});

// ─── getSpecificProjectData ───────────────────────────────────────────────────

describe("getSpecificProjectData", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    getSpecificProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when github_repo_id is missing from query", async () => {
    const req = makeReq({ query: {} });
    getSpecificProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when project is not found", async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as any);

    const req = makeReq({ query: { github_repo_id: VALID_REPO_ID } });
    getSpecificProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid Repo ID. No such records found.",
      })
    );
  });

  it("returns 500 when database query throws", async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockRejectedValue(new Error("DB error")),
    } as any);

    const req = makeReq({ query: { github_repo_id: VALID_REPO_ID } });
    getSpecificProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 200 with project data when found", async () => {
    const mockProject = {
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
      price: 99,
      project_type: "Web Application",
      live_link: "https://example.com",
      project_images: [`${CDN_URL}/img.jpg`],
      project_images_detail: [`${CDN_URL}/detail.jpg`],
      project_video: "",
    };

    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue(mockProject),
    } as any);

    const req = makeReq({ query: { github_repo_id: VALID_REPO_ID } });
    getSpecificProjectData(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          github_repo_id: VALID_REPO_ID,
          price: 99,
        }),
      })
    );
  });
});

// ─── getTotalListedProjects ───────────────────────────────────────────────────

describe("getTotalListedProjects", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    process.env.DEFAULT_PROJECT_LISTING_LIMIT = "2";
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    getTotalListedProjects(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 200 with totalListedProjects and projectListingLimit on success", async () => {
    vi.mocked(Project.countDocuments).mockResolvedValue(1 as any);
    vi.mocked(User.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ project_listing_limit: 5 }),
      }),
    } as any);

    const req = makeReq();
    getTotalListedProjects(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalListedProjects: 1,
          projectListingLimit: 5,
        }),
      })
    );
  });

  it("returns 500 with -1 values when DB query fails", async () => {
    vi.mocked(Project.countDocuments).mockRejectedValue(new Error("DB error"));

    const req = makeReq();
    getTotalListedProjects(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalListedProjects: -1,
        }),
      })
    );
  });

  it("uses DEFAULT_PROJECT_LISTING_LIMIT env var when user has no custom limit", async () => {
    process.env.DEFAULT_PROJECT_LISTING_LIMIT = "3";
    vi.mocked(Project.countDocuments).mockResolvedValue(0 as any);
    vi.mocked(User.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null), // no user doc
      }),
    } as any);

    const req = makeReq();
    getTotalListedProjects(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectListingLimit: 3,
        }),
      })
    );
  });
});

// ─── getTotalActiveProjects ───────────────────────────────────────────────────

describe("getTotalActiveProjects", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    getTotalActiveProjects(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 200 with totalActiveProjects count on success", async () => {
    vi.mocked(Project.countDocuments).mockResolvedValue(3 as any);

    const req = makeReq();
    getTotalActiveProjects(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalActiveProjects: 3,
        }),
      })
    );
  });

  it("returns 500 with -1 when DB query fails", async () => {
    vi.mocked(Project.countDocuments).mockRejectedValue(new Error("DB error"));

    const req = makeReq();
    getTotalActiveProjects(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalActiveProjects: -1,
        }),
      })
    );
  });
});
