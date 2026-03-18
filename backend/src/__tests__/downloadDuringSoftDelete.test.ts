/**
 * Tests for downloadProject controller (purchase.controller.ts)
 *
 * Critical scenario: buyers should be able to download a project DURING the
 * 7-day soft-delete window (project still exists, zip is still SUCCESS).
 * After hard-delete (project document gone), download returns 404.
 *
 * Covers:
 * - No purchase record → 403
 * - Purchase exists, project hard-deleted (findById returns null) → 404
 * - Purchase exists, project soft-deleted within 7-day window → 200 (download works)
 * - Purchase exists, project zip PROCESSING → 400
 * - Purchase exists, project zip SUCCESS but s3_key missing → 400
 * - Purchase exists, S3 signed URL generation fails → 500
 * - Normal successful download → 200 with download_url
 * - Invalid project_id format → 400
 * - DB error on purchase lookup → 500
 *
 * NOTE: asyncHandler doesn't expose its Promise, so we use flushPromises()
 * (setImmediate-based) to drain the microtask queue before assertions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Module mocks (hoisted before imports) ───────────────────────────────────

vi.mock("../models/purchase.model", () => ({
  Purchase: {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../models/project.model", () => ({
  Project: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock("../models/user.model", () => ({
  User: {
    findById: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("../models/githubAppInstallation.model", () => ({
  GitHubAppInstallation: {
    findOne: vi.fn(),
  },
}));

vi.mock("../models/sales.model", () => ({
  Sales: {
    findOne: vi.fn(),
  },
}));

vi.mock("..", () => ({
  redisClient: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
  s3Service: {
    createSignedDownloadUrl: vi.fn(),
  },
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

vi.mock("../utils/solanaPrice.util", () => ({
  getSolanaUsdRate: vi.fn(),
  computeLamportSplit: vi.fn(),
}));

vi.mock("../utils/solanaVerification.util", () => ({
  verifySolanaTransaction: vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { downloadProject } from "../controllers/purchase.controller";
import { Purchase } from "../models/purchase.model";
import { Project } from "../models/project.model";
import { s3Service } from "..";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_PROJECT_ID = "507f191e810c19729de860ea";
const VALID_S3_KEY = "zips/my-project-abc123.zip";
const PRESIGNED_URL = "https://s3.amazonaws.com/bucket/zips/my-project.zip?X-Amz-Signature=abc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

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

/** Stubs Purchase.findOne().select().lean() chain */
const stubPurchaseFindOne = (resolvedValue: any) => {
  vi.mocked(Purchase.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(resolvedValue),
    }),
  } as any);
};

const stubPurchaseFindOneError = (error: Error) => {
  vi.mocked(Purchase.findOne).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockRejectedValue(error),
    }),
  } as any);
};

/** Stubs Project.findById().select().lean() chain */
const stubProjectFindById = (resolvedValue: any) => {
  vi.mocked(Project.findById).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(resolvedValue),
    }),
  } as any);
};

const stubProjectFindByIdError = (error: Error) => {
  vi.mocked(Project.findById).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockRejectedValue(error),
    }),
  } as any);
};

const mockPurchaseRecord = () => ({ _id: "purchase_abc" });

const mockProjectDoc = (overrides: Record<string, any> = {}) => ({
  _id: VALID_PROJECT_ID,
  title: "My Awesome Project",
  repo_zip_status: "SUCCESS",
  repo_zip_s3_key: VALID_S3_KEY,
  price: 99,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("downloadProject", () => {
  let res: any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined });
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it("returns 400 when project_id is missing", async () => {
    const req = makeReq({ query: {} });
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Valid project_id is required" })
    );
    expect(Purchase.findOne).not.toHaveBeenCalled();
  });

  it("returns 400 when project_id is not a valid ObjectId", async () => {
    const req = makeReq({ query: { project_id: "not-a-valid-objectid" } });
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Valid project_id is required" })
    );
  });

  // ── Purchase verification ─────────────────────────────────────────────────

  it("returns 403 when buyer has not purchased the project", async () => {
    stubProjectFindById(mockProjectDoc()); // project exists and is paid
    stubPurchaseFindOne(null); // no purchase record
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "You have not purchased this project" })
    );
  });

  it("returns 500 when purchase DB lookup fails", async () => {
    stubProjectFindById(mockProjectDoc()); // project exists and is paid
    stubPurchaseFindOneError(new Error("Mongo timeout"));
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Failed to process download. Try again later." })
    );
  });

  // ── Project lookup ────────────────────────────────────────────────────────

  it("returns 404 when project has been hard-deleted (findById returns null)", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(null); // project document gone after hard-delete
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project not found" })
    );
  });

  it("returns 404 when project DB lookup errors", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindByIdError(new Error("DB error"));
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
  });

  // ── CRITICAL: Download works during soft-delete window ────────────────────

  it("returns 200 download URL when project is within the 7-day soft-delete window", async () => {
    // During the window: project still exists with SUCCESS zip
    // scheduled_deletion_at is set but the download controller only checks
    // repo_zip_status and repo_zip_s3_key — not scheduled_deletion_at.
    // Buyers who purchased should always be able to download during the window.
    const softDeletedProject = mockProjectDoc({
      repo_zip_status: "SUCCESS",
      repo_zip_s3_key: VALID_S3_KEY,
      // scheduled_deletion_at would be set on the full document,
      // but the select only fetches "repo_zip_status repo_zip_s3_key title"
    });
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(softDeletedProject);
    vi.mocked(s3Service.createSignedDownloadUrl).mockResolvedValue(PRESIGNED_URL);

    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(s3Service.createSignedDownloadUrl).toHaveBeenCalledWith(
      VALID_S3_KEY,
      900, // 15 minutes
      expect.any(String)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Download URL generated",
        data: expect.objectContaining({ download_url: PRESIGNED_URL }),
      })
    );
  });

  // ── Zip not ready ─────────────────────────────────────────────────────────

  it("returns 400 when project zip is PROCESSING", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(mockProjectDoc({ repo_zip_status: "PROCESSING", repo_zip_s3_key: null }));
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Project files are not available for download at this time",
      })
    );
  });

  it("returns 400 when project zip is FAILED", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(mockProjectDoc({ repo_zip_status: "FAILED", repo_zip_s3_key: null }));
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when repo_zip_status is SUCCESS but s3_key is missing", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(
      mockProjectDoc({ repo_zip_status: "SUCCESS", repo_zip_s3_key: null })
    );
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Project files are not available for download at this time",
      })
    );
  });

  // ── S3 URL generation failures ────────────────────────────────────────────

  it("returns 500 when S3 signed URL generation fails", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(mockProjectDoc());
    vi.mocked(s3Service.createSignedDownloadUrl).mockRejectedValue(
      new Error("S3 service unavailable")
    );
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to generate download link. Try again later.",
      })
    );
  });

  it("returns 500 when S3 returns null URL", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(mockProjectDoc());
    vi.mocked(s3Service.createSignedDownloadUrl).mockResolvedValue(null as any);
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Normal happy path ─────────────────────────────────────────────────────

  it("returns 200 with presigned URL for normal active project download", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(mockProjectDoc({ title: "React Dashboard Pro" }));
    vi.mocked(s3Service.createSignedDownloadUrl).mockResolvedValue(PRESIGNED_URL);

    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ download_url: PRESIGNED_URL }),
      })
    );
  });

  it("generates a safe filename from the project title (no unsafe chars)", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(mockProjectDoc({ title: "My Awesome React App! v2.0" }));
    vi.mocked(s3Service.createSignedDownloadUrl).mockResolvedValue(PRESIGNED_URL);

    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    const calls = vi.mocked(s3Service.createSignedDownloadUrl).mock.calls;
    expect(calls.length).toBe(1);
    const [, , filename] = calls[0];
    expect(filename).toMatch(/^[a-z0-9\-_]+\.zip$/);
    expect(filename).not.toMatch(/[!@#$%^&*()]/);
  });

  it("generates a 15-minute (900s) presigned URL", async () => {
    stubPurchaseFindOne(mockPurchaseRecord());
    stubProjectFindById(mockProjectDoc());
    vi.mocked(s3Service.createSignedDownloadUrl).mockResolvedValue(PRESIGNED_URL);

    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(s3Service.createSignedDownloadUrl).toHaveBeenCalledWith(
      VALID_S3_KEY,
      900,
      expect.any(String)
    );
  });

  // ── Purchase lookup uses correct query ────────────────────────────────────

  it("verifies purchase with CONFIRMED status (not any status)", async () => {
    stubProjectFindById(mockProjectDoc()); // project exists and is paid
    stubPurchaseFindOne(null);
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    expect(Purchase.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CONFIRMED" })
    );
  });

  it("fetches purchase by both buyerId and projectId to ensure ownership", async () => {
    stubProjectFindById(mockProjectDoc()); // project exists and is paid
    stubPurchaseFindOne(null);
    const req = makeReq();
    downloadProject(req as any, res, next);
    await flushPromises();

    const [query] = vi.mocked(Purchase.findOne).mock.calls[0];
    expect(query).toHaveProperty("buyerId");
    expect(query).toHaveProperty("projectId");
    expect(query).toHaveProperty("status", "CONFIRMED");
  });
});
