/**
 * Tests for soft-delete mutation guards in projects.controller.ts
 *
 * Covers the `scheduled_deletion_at` guard present in:
 * - toggleProjectListing     → 400 "Cannot modify a project that is scheduled for deletion."
 * - retryRepoZipUpload       → 400 "Cannot modify a project that is scheduled for deletion."
 * - refreshRepoZip            → 400 "Cannot modify a project that is scheduled for deletion."
 * - validateMediaUploadAndStoreProject (existing path) → same 400
 *
 * Also verifies that each handler proceeds normally when the project is NOT scheduled.
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
  redisClient: { zadd: vi.fn(), hset: vi.fn(), expire: vi.fn(), del: vi.fn() },
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

vi.mock("axios", () => ({
  default: { get: vi.fn().mockResolvedValue({ status: 200, data: {} }) },
  AxiosError: class AxiosError extends Error {
    isAxiosError = true;
  },
}));

vi.mock("../utils/redisPrefixGenerator.util", () => ({
  privateRepoPrefix: vi.fn((id: string) => `private-repos:${id}`),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import {
  toggleProjectListing,
  retryRepoZipUpload,
  refreshRepoZip,
  validateMediaUploadAndStoreProject,
} from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { githubAppService } from "../services/githubApp.service";
import { redisClient } from "..";
import axios from "axios";

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

/** Stubs Project.findOne().select() for toggleProjectListing */
const stubToggleFindOne = (projectMock: any) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockResolvedValue(projectMock),
  } as any);
};

const stubToggleUser = (userMock: any) => {
  vi.mocked(User.findById).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(userMock),
    }),
  } as any);
};

/** Stubs Project.findOne().select() for retryRepoZipUpload / refreshRepoZip */
const stubDirectFindOne = (projectMock: any) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockResolvedValue(projectMock),
  } as any);
};

// ─── toggleProjectListing ─────────────────────────────────────────────────────

describe("toggleProjectListing — soft-delete guard", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 400 when project is scheduled for deletion", async () => {
    stubToggleFindOne({
      _id: VALID_PROJECT_ID,
      github_access_revoked: false,
      scheduled_deletion_at: FUTURE_DATE,
      isActive: true,
    });
    stubToggleUser({ project_listing_limit: 2 });

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot modify a project that is scheduled for deletion.",
      })
    );
    // Must not proceed to the actual toggle update
    expect(Project.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("proceeds and returns 200 when project is NOT scheduled for deletion", async () => {
    stubToggleFindOne({
      _id: VALID_PROJECT_ID,
      github_access_revoked: false,
      scheduled_deletion_at: null,
      isActive: true,
    });
    stubToggleUser({ project_listing_limit: 2 });
    vi.mocked(Project.findOneAndUpdate).mockResolvedValue({
      _id: VALID_PROJECT_ID,
      isActive: false,
      github_repo_id: VALID_REPO_ID,
    } as any);

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    expect(Project.findOneAndUpdate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("guard fires BEFORE the github_access_revoked check", async () => {
    // Project is both soft-deleted AND has revoked access — guard must fire first
    stubToggleFindOne({
      _id: VALID_PROJECT_ID,
      github_access_revoked: true,
      scheduled_deletion_at: FUTURE_DATE,
      isActive: false,
    });
    stubToggleUser({ project_listing_limit: 2 });

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    toggleProjectListing(req as any, res, next);
    await flushPromises();

    // Should get the soft-delete 400, not the github_access_revoked 403
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot modify a project that is scheduled for deletion.",
      })
    );
  });
});

// ─── retryRepoZipUpload ───────────────────────────────────────────────────────

describe("retryRepoZipUpload — soft-delete guard", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 400 when project is scheduled for deletion", async () => {
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: FUTURE_DATE,
      repo_zip_status: "FAILED",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot modify a project that is scheduled for deletion.",
      })
    );
    expect(Project.updateOne).not.toHaveBeenCalled();
  });

  it("guard fires BEFORE the 'only retry FAILED' check", async () => {
    // Project is soft-deleted AND zip is SUCCESS — guard must fire first
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: FUTURE_DATE,
      repo_zip_status: "SUCCESS",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot modify a project that is scheduled for deletion.",
      })
    );
  });

  it("returns 400 for non-FAILED status when NOT scheduled for deletion", async () => {
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "SUCCESS",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Can only retry failed uploads" })
    );
  });

  it("initiates retry and returns 200 when project is FAILED and NOT scheduled", async () => {
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "FAILED",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(Project.updateOne).toHaveBeenCalledWith(
      { _id: VALID_PROJECT_ID },
      { repo_zip_status: "PROCESSING", $unset: { repo_zip_error: 1 } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Retry initiated" })
    );
  });
});

// ─── refreshRepoZip ───────────────────────────────────────────────────────────

describe("refreshRepoZip — soft-delete guard", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 400 when project is scheduled for deletion", async () => {
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: FUTURE_DATE,
      repo_zip_status: "SUCCESS",
      repo_zip_s3_key: "zips/proj.zip",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot modify a project that is scheduled for deletion.",
      })
    );
    expect(Project.updateOne).not.toHaveBeenCalled();
    // Must NOT queue the ZIP for cleanup
    expect(redisClient.zadd).not.toHaveBeenCalled();
  });

  it("guard fires BEFORE the 'already PROCESSING' check", async () => {
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: FUTURE_DATE,
      repo_zip_status: "PROCESSING",
      repo_zip_s3_key: null,
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot modify a project that is scheduled for deletion.",
      })
    );
  });

  it("returns 400 when status is PROCESSING and NOT scheduled", async () => {
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "PROCESSING",
      repo_zip_s3_key: null,
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Upload is already in progress" })
    );
  });

  it("queues old ZIP for cleanup and returns 200 when NOT scheduled", async () => {
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "SUCCESS",
      repo_zip_s3_key: "zips/old.zip",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    // Old ZIP must be queued for cleanup
    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "zips/old.zip"
    );
    expect(Project.updateOne).toHaveBeenCalledWith(
      { _id: VALID_PROJECT_ID },
      {
        repo_zip_status: "PROCESSING",
        $unset: { repo_zip_s3_key: 1, repo_zip_error: 1 },
      }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Refresh initiated" })
    );
  });

  it("does NOT queue old ZIP when there is no existing key", async () => {
    stubDirectFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "FAILED",
      repo_zip_s3_key: null,
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq({ body: { github_repo_id: VALID_REPO_ID } });
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(redisClient.zadd).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── validateMediaUploadAndStoreProject — soft-delete guard ──────────────────

describe("validateMediaUploadAndStoreProject — soft-delete guard (existing modification)", () => {
  let res: any;

  // req.body structure for validateMediaUploadAndStoreProject:
  //   { modificationType, projectData: { ...projectFormDataSchema fields, github_repo_id, installation_id } }
  // projectFormDataSchema fields: title, description, project_type (from enum), tech_stack,
  //   live_link, price, imageOrder (array), imageOrder_detail (array), project_video, existingVideo
  const VALID_BODY = {
    modificationType: "existing",
    projectData: {
      title: "My Project",
      description: "A great project",
      project_type: "Web Application", // must be a value from PROJECT_TYPE_ENUM
      tech_stack: ["React", "Node.js"],
      live_link: "https://myproject.com",
      price: 99,
      imageOrder: ["https://cdn.example.com/img.jpg"], // array, not JSON string
      imageOrder_detail: [] as string[],
      project_video: "",
      existingVideo: "",
      github_repo_id: VALID_REPO_ID,
      installation_id: 12345, // numeric
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    process.env.S3_CLOUDFRONT_DISTRIBUTION = "https://cdn.example.com";
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token_abc"
    );
    vi.mocked(axios.get).mockResolvedValue({ status: 200, data: {} } as any);
  });

  it("returns 400 when project is scheduled for deletion (existing modification)", async () => {
    // Installation: found with no suspension — direct findOne (no .select() chaining)
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue({
      _id: "inst_1",
      installation_id: 12345,
      suspended_at: null,
    } as any);

    // Project fetch: returns soft-deleted project — direct findOne (no .select() chaining)
    vi.mocked(Project.findOne).mockResolvedValue({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: FUTURE_DATE,
      project_images: ["https://cdn.example.com/img.jpg"],
      project_images_detail: [],
      project_video: null,
      github_repo_id: VALID_REPO_ID,
    } as any);

    const req = makeReq({ body: VALID_BODY });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot modify a project that is scheduled for deletion.",
      })
    );
    // Must not proceed to create/update
    expect(Project.create).not.toHaveBeenCalled();
  });
});
