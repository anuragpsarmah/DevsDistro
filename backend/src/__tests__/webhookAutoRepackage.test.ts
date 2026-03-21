/**
 * Tests for the auto-repackage soft-delete guard in webhook.controller.ts
 *
 * Critical bug fix verified: handlePushEvent must NOT trigger auto-repackage
 * for soft-deleted projects (scheduled_deletion_at set).
 *
 * The fix: Project.findOne query includes `scheduled_deletion_at: null`
 * so MongoDB excludes soft-deleted projects from the result.
 *
 * Covers:
 * - Query filter includes scheduled_deletion_at: null (the fix itself)
 * - Soft-deleted project push → no repackage (findOne returns null via the filter)
 * - Active project + auto_repackage enabled → repackage triggered
 * - Active project + auto_repackage disabled → no repackage
 * - Active project + user not found → no repackage
 * - Active project + findOne DB error → early exit, no repackage
 * - ZIP queued for cleanup before re-upload
 * - Signature verification failure → 401
 *
 * NOTE: asyncHandler doesn't expose its Promise, so we use flushPromises()
 * (setImmediate-based) to drain the microtask queue before assertions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mockProcessRepoZipUpload = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);

vi.mock("../services/repoZipUpload.service", () => ({
  default: vi.fn().mockImplementation(() => ({
    processRepoZipUpload: mockProcessRepoZipUpload,
  })),
}));

vi.mock("../models/project.model", () => ({
  Project: {
    findOne: vi.fn(),
    updateMany: vi.fn(),
    updateOne: vi.fn(),
    findOneAndDelete: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("../models/user.model", () => ({
  User: {
    findOne: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("../models/githubAppInstallation.model", () => ({
  GitHubAppInstallation: {
    findOne: vi.fn(),
    findOneAndDelete: vi.fn(),
    updateOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock("..", () => ({
  redisClient: { zadd: vi.fn(), del: vi.fn() },
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

vi.mock("../services/githubApp.service", () => ({
  githubAppService: {
    verifyWebhookSignature: vi.fn().mockReturnValue(true),
    reactivateProjectsWithRestoredAccess: vi.fn(),
  },
}));

vi.mock("../utils/redisPrefixGenerator.util", () => ({
  privateRepoPrefix: vi.fn((id: string) => `private-repos:${id}`),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { handleWebhook } from "../controllers/webhook.controller";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { redisClient } from "..";
import { githubAppService } from "../services/githubApp.service";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_PROJECT_ID = "507f191e810c19729de860ea";
const GITHUB_REPO_ID = "99887766";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const makePushReq = (
  repoId: string = GITHUB_REPO_ID,
  bodyOverrides: Record<string, any> = {}
) => ({
  headers: {
    "x-github-event": "push",
    "x-hub-signature-256": "sha256=valid_signature",
    "x-github-delivery": "delivery-abc123",
  },
  // Pass as plain object — webhook.controller.ts handles non-Buffer, non-string body
  body: {
    action: "push",
    repository: {
      id: parseInt(repoId, 10),
      name: "my-repo",
      full_name: "user/my-repo",
      private: true,
    },
    ref: "refs/heads/main",
    after: "abc123def456",
    sender: { login: "seller_user", id: 42 },
    ...bodyOverrides,
  },
});

/** Stubs Project.findOne().select().lean() chain for push event */
const stubPushProjectFindOne = (resolvedValue: any) => {
  vi.mocked(Project.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(resolvedValue),
    }),
  } as any);
};

/** Stubs User.findOne().select().lean() chain */
const stubUserFindOne = (resolvedValue: any) => {
  vi.mocked(User.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(resolvedValue),
    }),
  } as any);
};

const mockProject = (overrides: Record<string, any> = {}) => ({
  _id: VALID_PROJECT_ID,
  userid: VALID_USER_ID,
  github_repo_id: GITHUB_REPO_ID,
  github_installation_id: 12345,
  repo_zip_s3_key: "zips/proj.zip",
  repo_zip_status: "SUCCESS",
  ...overrides,
});

// ─── Webhook signature ────────────────────────────────────────────────────────

describe("handleWebhook — signature verification", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when webhook signature is invalid", async () => {
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(false);
    const req = makePushReq();
    const next = vi.fn();
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ─── handlePushEvent — soft-delete guard ──────────────────────────────────────

describe("handlePushEvent — soft-delete guard", () => {
  let res: any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(true);
  });

  // ── The core fix: query must include the soft-delete filter ─────────────────

  it("queries Project.findOne with scheduled_deletion_at: null filter", async () => {
    stubPushProjectFindOne(null);
    const req = makePushReq();
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled_deletion_at: null })
    );
  });

  it("queries Project.findOne with github_access_revoked: { $ne: true } filter", async () => {
    stubPushProjectFindOne(null);
    const req = makePushReq();
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ github_access_revoked: { $ne: true } })
    );
  });

  it("queries Project.findOne with repo_zip_status: 'SUCCESS' filter", async () => {
    stubPushProjectFindOne(null);
    const req = makePushReq();
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ repo_zip_status: "SUCCESS" })
    );
  });

  // ── Soft-deleted project: no repackage ────────────────────────────────────

  it("does NOT trigger auto-repackage when project is soft-deleted", async () => {
    // MongoDB returns null when scheduled_deletion_at: null filter excludes the project
    stubPushProjectFindOne(null);

    const req = makePushReq();
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateOne).not.toHaveBeenCalled();
    expect(redisClient.zadd).not.toHaveBeenCalled();
    expect(mockProcessRepoZipUpload).not.toHaveBeenCalled();
    // Webhook always responds 200
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Active project + auto_repackage enabled ──────────────────────────────

  it("triggers auto-repackage for active project when user has auto_repackage_on_push=true", async () => {
    stubPushProjectFindOne(mockProject());
    stubUserFindOne({ _id: VALID_USER_ID });
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makePushReq();
    handleWebhook(req as any, res, next);
    await flushPromises();

    // Old ZIP queued for cleanup
    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "zips/proj.zip"
    );

    // Status reset to PROCESSING
    expect(Project.updateOne).toHaveBeenCalledWith(
      { _id: VALID_PROJECT_ID },
      {
        repo_zip_status: "PROCESSING",
        $unset: { repo_zip_s3_key: 1, repo_zip_error: 1 },
      }
    );

    // Repackage job fired (fire-and-forget)
    await flushPromises(); // extra flush for the fire-and-forget
    expect(mockProcessRepoZipUpload).toHaveBeenCalledWith(
      VALID_PROJECT_ID.toString(),
      GITHUB_REPO_ID,
      12345
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT queue ZIP for cleanup when project has no repo_zip_s3_key", async () => {
    stubPushProjectFindOne(mockProject({ repo_zip_s3_key: null }));
    stubUserFindOne({ _id: VALID_USER_ID });
    vi.mocked(Project.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

    const req = makePushReq();
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(redisClient.zadd).not.toHaveBeenCalled();
    expect(Project.updateOne).toHaveBeenCalled();
  });

  // ── Active project + auto_repackage disabled ─────────────────────────────

  it("does NOT trigger auto-repackage when user has auto_repackage_on_push=false", async () => {
    stubPushProjectFindOne(mockProject());
    // User.findOne with `auto_repackage_on_push: true` returns null → no repackage
    stubUserFindOne(null);

    const req = makePushReq();
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateOne).not.toHaveBeenCalled();
    expect(redisClient.zadd).not.toHaveBeenCalled();
    expect(mockProcessRepoZipUpload).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── DB error on project findOne ───────────────────────────────────────────

  it("returns 200 (ack) but does NOT repackage when project findOne fails", async () => {
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error("DB timeout")),
      }),
    } as any);

    const req = makePushReq();
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateOne).not.toHaveBeenCalled();
    expect(mockProcessRepoZipUpload).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── Correct repo ID passed to the query ──────────────────────────────────

  it("queries by the correct github_repo_id from the push payload", async () => {
    const specificRepoId = "11223344";
    stubPushProjectFindOne(null);

    const req = makePushReq(specificRepoId);
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ github_repo_id: specificRepoId.toString() })
    );
  });

  // ── Non-push events are unaffected ───────────────────────────────────────

  it("does not query Project.findOne for non-push events (ping)", async () => {
    const req = {
      headers: {
        "x-github-event": "ping",
        "x-hub-signature-256": "sha256=valid",
        "x-github-delivery": "ping-delivery",
      },
      body: { action: "ping", sender: { login: "github", id: 1 } },
    };

    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.findOne).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
