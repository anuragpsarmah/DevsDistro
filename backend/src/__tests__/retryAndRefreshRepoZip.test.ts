/**
 * Tests for retryRepoZipUpload and refreshRepoZip controller endpoints.
 *
 * Note: The soft-delete guard for both of these is already thoroughly
 * covered in softDeleteGuards.test.ts. This file covers the gaps:
 *  - Auth guard (401)
 *  - Missing github_repo_id (400)
 *  - Project not found (404)
 *  - DB error on updateOne (500)
 *  - retryRepoZipUpload: status not FAILED (400) — also in softDeleteGuards, re-confirmed here
 *  - refreshRepoZip: status already PROCESSING (400) — also in softDeleteGuards, re-confirmed here
 *  - retryRepoZipUpload success: updateOne called, processRepoZipUpload fired
 *  - refreshRepoZip success with old key: key queued in Redis, status reset
 *  - refreshRepoZip success without old key: no Redis queue call
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

import {
  retryRepoZipUpload,
  refreshRepoZip,
} from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { redisClient, repoZipUploadService } from "..";

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

// Project.findOne().select() — both endpoints now use .select()
const stubFindOne = (data: any) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockResolvedValue(data),
  } as any);
};

// ─── retryRepoZipUpload ───────────────────────────────────────────────────────

describe("retryRepoZipUpload — full flow", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  it("returns 400 when github_repo_id is missing from body", async () => {
    const req = makeReq({ body: {} });
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  it("returns 500 when Project.findOne throws", async () => {
    vi.mocked(Project.findOne).mockRejectedValue(new Error("DB error"));

    const req = makeReq();
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 404 when project is not found", async () => {
    stubFindOne(null);

    const req = makeReq();
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project not found" })
    );
  });

  it("returns 400 when project is scheduled for deletion", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: FUTURE_DATE,
      repo_zip_status: "FAILED",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq();
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.updateOne).not.toHaveBeenCalled();
  });

  it("returns 403 when github_access_revoked is true", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      github_access_revoked: true,
      repo_zip_status: "FAILED",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq();
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "GitHub repository access has been revoked"
        ),
      })
    );
    expect(Project.updateOne).not.toHaveBeenCalled();
  });

  it("returns 400 when repo_zip_status is not FAILED", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "PROCESSING",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq();
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Can only retry failed uploads" })
    );
    expect(Project.updateOne).not.toHaveBeenCalled();
  });

  it("returns 500 when Project.updateOne throws", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "FAILED",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(Project.updateOne).mockRejectedValue(new Error("DB error"));

    const req = makeReq();
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(repoZipUploadService.processRepoZipUpload).not.toHaveBeenCalled();
  });

  it("returns 200 and fires processRepoZipUpload on success", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "FAILED",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq();
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

    // Background task (fire-and-forget)
    await flushPromises();
    expect(repoZipUploadService.processRepoZipUpload).toHaveBeenCalledWith(
      VALID_PROJECT_ID.toString(),
      VALID_REPO_ID,
      12345
    );
  });

  it("does NOT queue old ZIP key to Redis on retry (only refresh does that)", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "FAILED",
      repo_zip_s3_key: "zips/old.zip", // has an old key
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq();
    retryRepoZipUpload(req as any, res, next);
    await flushPromises();

    // retryRepoZipUpload should NOT queue the old zip (only refreshRepoZip does)
    expect(redisClient.zadd).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── refreshRepoZip ───────────────────────────────────────────────────────────

describe("refreshRepoZip — full flow", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  it("returns 400 when github_repo_id is missing from body", async () => {
    const req = makeReq({ body: {} });
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Project.findOne).not.toHaveBeenCalled();
  });

  it("returns 500 when Project.findOne throws", async () => {
    vi.mocked(Project.findOne).mockRejectedValue(new Error("DB error"));

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 404 when project is not found", async () => {
    stubFindOne(null);

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project not found" })
    );
  });

  it("returns 400 when project is scheduled for deletion", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: FUTURE_DATE,
      repo_zip_status: "SUCCESS",
      repo_zip_s3_key: "zips/proj.zip",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(redisClient.zadd).not.toHaveBeenCalled();
    expect(Project.updateOne).not.toHaveBeenCalled();
  });

  it("returns 403 when github_access_revoked is true", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      github_access_revoked: true,
      repo_zip_status: "SUCCESS",
      repo_zip_s3_key: "zips/proj.zip",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "GitHub repository access has been revoked"
        ),
      })
    );
    expect(redisClient.zadd).not.toHaveBeenCalled();
    expect(Project.updateOne).not.toHaveBeenCalled();
  });

  it("returns 400 when repo_zip_status is already PROCESSING", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "PROCESSING",
      repo_zip_s3_key: null,
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Upload is already in progress" })
    );
    expect(Project.updateOne).not.toHaveBeenCalled();
  });

  it("returns 500 when Project.updateOne throws", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "SUCCESS",
      repo_zip_s3_key: "zips/proj.zip",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.updateOne).mockRejectedValue(new Error("DB error"));

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 200, queues old ZIP key for cleanup, and resets status to PROCESSING", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "SUCCESS",
      repo_zip_s3_key: "zips/old-proj.zip",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    // Old ZIP queued for cleanup
    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "zips/old-proj.zip"
    );
    // Status reset and key removed
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

  it("does NOT call redisClient.zadd when there is no old repo_zip_s3_key", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "FAILED",
      repo_zip_s3_key: null, // no old key
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    expect(redisClient.zadd).not.toHaveBeenCalled();
    expect(Project.updateOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("fires processRepoZipUpload as a background task on success", async () => {
    stubFindOne({
      _id: VALID_PROJECT_ID,
      scheduled_deletion_at: null,
      repo_zip_status: "SUCCESS",
      repo_zip_s3_key: "zips/proj.zip",
      github_repo_id: VALID_REPO_ID,
      github_installation_id: 12345,
    });
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makeReq();
    refreshRepoZip(req as any, res, next);
    await flushPromises();

    await flushPromises(); // extra flush for fire-and-forget
    expect(repoZipUploadService.processRepoZipUpload).toHaveBeenCalledWith(
      VALID_PROJECT_ID.toString(),
      VALID_REPO_ID,
      12345
    );
  });
});
