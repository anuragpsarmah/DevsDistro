/**
 * Tests for getPreSignedUrlForProjectMediaUpload controller endpoint.
 *
 * Flow:
 * 1. Validate user → 401
 * 2. Validate modificationType ("new" or "existing") → 400
 * 3. For "new": check project count vs. listing limit → 400
 * 4. Validate existingImageCount / existingVideoCount (non-negative integers) → 400
 * 5. Validate file metadata via fileMetadataSchema → 400
 * 6. Check image counts (no images → 400; too many → 400)
 * 7. Check video count (can't have 2 videos → 400)
 * 8. Generate presigned URLs via s3Service.createPreSignedUploadUrl
 * 9. Handle detailMetadata (optional): validate → generate detail URLs
 * 10. Return combined array of presigned URLs
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
  Purchase: { exists: vi.fn() },
}));

vi.mock("../models/githubAppInstallation.model", () => ({
  GitHubAppInstallation: {
    findOne: vi.fn(),
  },
}));

vi.mock("..", () => ({
  redisClient: { zadd: vi.fn(), hset: vi.fn(), expire: vi.fn(), del: vi.fn() },
  s3Service: {
    createPreSignedUploadUrl: vi.fn(),
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

import { getPreSignedUrlForProjectMediaUpload } from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { s3Service } from "..";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const SIGNED_URL_1 =
  "https://s3.amazonaws.com/bucket/presigned-1?X-Amz-Signature=abc";
const SIGNED_URL_2 =
  "https://s3.amazonaws.com/bucket/presigned-2?X-Amz-Signature=def";

const IMAGE_META = {
  originalName: "screenshot.png",
  fileType: "image/png",
  fileSize: 500 * 1024, // 500 KB
};

const VIDEO_META = {
  originalName: "demo.mp4",
  fileType: "video/mp4",
  fileSize: 20 * 1024 * 1024, // 20 MB
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (bodyOverrides: Record<string, any> = {}) => ({
  user: { _id: VALID_USER_ID },
  query: {},
  body: {
    modificationType: "new",
    metadata: [IMAGE_META],
    existingImageCount: 0,
    existingVideoCount: 0,
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

// Stub Project.countDocuments + User.findById for listing limit check
const stubNewProjectLimitCheck = (count: number, limit: number) => {
  vi.mocked(Project.countDocuments).mockResolvedValue(count as any);
  vi.mocked(User.findById).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ project_listing_limit: limit }),
    }),
  } as any);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getPreSignedUrlForProjectMediaUpload", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    process.env.DEFAULT_PROJECT_LISTING_LIMIT = "2";
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    const req = { ...makeReq(), user: undefined };
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── modificationType validation ───────────────────────────────────────────

  it("returns 400 when modificationType is not 'new' or 'existing'", async () => {
    const req = makeReq({ modificationType: "invalid" });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid modification type" })
    );
    expect(Project.countDocuments).not.toHaveBeenCalled();
  });

  // ── New project: listing limit ────────────────────────────────────────────

  it("returns 400 when new project is at the listing limit", async () => {
    stubNewProjectLimitCheck(2, 2); // already at limit

    const req = makeReq({ modificationType: "new" });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("projects can be listed at a time"),
      })
    );
    expect(s3Service.createPreSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("quota check uses only marketplace-visible filter (isActive, not revoked, SUCCESS, not deleted)", async () => {
    stubNewProjectLimitCheck(1, 2); // under limit — will proceed past quota check

    // Stub remaining validations to avoid crashing after the quota check
    vi.mocked(s3Service.createPreSignedUploadUrl).mockResolvedValue(
      "https://s3.example.com/presigned" as any
    );

    const req = makeReq({ modificationType: "new" });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(Project.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        github_access_revoked: false,
        repo_zip_status: "SUCCESS",
        scheduled_deletion_at: null,
      })
    );
  });

  it("returns 500 when DB query for listing limit fails", async () => {
    vi.mocked(Project.countDocuments).mockRejectedValue(new Error("DB error"));

    const req = makeReq({ modificationType: "new" });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Count validation ──────────────────────────────────────────────────────

  it("returns 400 when existingImageCount is negative", async () => {
    stubNewProjectLimitCheck(0, 2);
    const req = makeReq({
      metadata: [IMAGE_META],
      existingImageCount: -1,
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid count values provided" })
    );
  });

  it("returns 400 when existingImageCount is not an integer", async () => {
    stubNewProjectLimitCheck(0, 2);
    const req = makeReq({
      metadata: [IMAGE_META],
      existingImageCount: 1.5,
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── Metadata schema validation ────────────────────────────────────────────

  it("returns 400 when file metadata has invalid fileType", async () => {
    stubNewProjectLimitCheck(0, 2);
    const req = makeReq({
      metadata: [
        { originalName: "file.gif", fileType: "image/gif", fileSize: 100 },
      ],
      existingImageCount: 0,
      existingVideoCount: 0,
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── Image count guards ────────────────────────────────────────────────────

  it("returns 400 when no images are provided and existingImageCount is 0", async () => {
    stubNewProjectLimitCheck(0, 2);
    const req = makeReq({
      metadata: [], // no new images
      existingImageCount: 0,
      existingVideoCount: 0,
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "At least one image is required" })
    );
  });

  it("returns 400 when new images exceed MAX_ALLOWED_IMAGES - existingImageCount", async () => {
    // MAX_ALLOWED_IMAGES = 12; existingImageCount = 10; sending 3 new images → 10 + 3 > 12
    const tooManyImages = Array(3).fill(IMAGE_META);
    const req = makeReq({
      metadata: tooManyImages,
      existingImageCount: 10,
      existingVideoCount: 0,
      modificationType: "existing",
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Sent more files than allowed" })
    );
  });

  // ── Video count guard ─────────────────────────────────────────────────────

  it("returns 400 when trying to add a video while existingVideoCount is 1", async () => {
    const req = makeReq({
      metadata: [IMAGE_META, VIDEO_META], // new video + existing video = 2 total
      existingImageCount: 1,
      existingVideoCount: 1, // already has a video
      modificationType: "existing",
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Sent more files than allowed" })
    );
  });

  // ── Detail metadata validation ────────────────────────────────────────────

  it("returns 400 when detailMetadata contains non-image file type (video)", async () => {
    const req = makeReq({
      metadata: [IMAGE_META],
      existingImageCount: 0,
      existingVideoCount: 0,
      detailMetadata: [VIDEO_META], // video in detail images → invalid
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Detail images must be image files" })
    );
  });

  // ── S3 errors ─────────────────────────────────────────────────────────────

  it("returns 400/500 when s3Service.createPreSignedUploadUrl throws", async () => {
    stubNewProjectLimitCheck(0, 2);
    vi.mocked(s3Service.createPreSignedUploadUrl).mockRejectedValue(
      new Error("File size exceeds limit")
    );

    const req = makeReq({ metadata: [IMAGE_META] });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    // When error is an Error instance, throws ApiError with message from error → 400
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── Success cases ─────────────────────────────────────────────────────────

  it("returns 200 with presigned URLs for new project images", async () => {
    stubNewProjectLimitCheck(0, 2);
    vi.mocked(s3Service.createPreSignedUploadUrl).mockResolvedValue({
      uploadSignedUrl: SIGNED_URL_1,
      key: "projectMedia/abc-screenshot.png",
    } as any);

    const req = makeReq({ metadata: [IMAGE_META] });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data).toHaveLength(1);
    expect(callArg.data[0]).toMatchObject({
      uploadSignedUrl: SIGNED_URL_1,
      key: "projectMedia/abc-screenshot.png",
    });
  });

  it("skips listing limit check for existing modification type", async () => {
    // Should NOT check countDocuments for "existing"
    const req = makeReq({
      modificationType: "existing",
      metadata: [IMAGE_META],
      existingImageCount: 2,
      existingVideoCount: 0,
    });
    vi.mocked(s3Service.createPreSignedUploadUrl).mockResolvedValue({
      uploadSignedUrl: SIGNED_URL_1,
      key: "projectMedia/abc.png",
    } as any);

    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(Project.countDocuments).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns combined URLs for both card images and detail images", async () => {
    stubNewProjectLimitCheck(0, 2);
    vi.mocked(s3Service.createPreSignedUploadUrl)
      .mockResolvedValueOnce({
        uploadSignedUrl: SIGNED_URL_1,
        key: "projectMedia/card.jpg",
      } as any)
      .mockResolvedValueOnce({
        uploadSignedUrl: SIGNED_URL_2,
        key: "projectMedia/detail.jpg",
      } as any);

    const detailMeta = { ...IMAGE_META, originalName: "detail.jpg" };
    const req = makeReq({
      metadata: [IMAGE_META],
      detailMetadata: [detailMeta],
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    // Should have both card URL + detail URL
    expect(callArg.data).toHaveLength(2);
  });

  it("calls createPreSignedUploadUrl once per file in metadata", async () => {
    stubNewProjectLimitCheck(0, 5);
    vi.mocked(s3Service.createPreSignedUploadUrl).mockResolvedValue({
      uploadSignedUrl: SIGNED_URL_1,
      key: "projectMedia/abc.png",
    } as any);

    const req = makeReq({
      metadata: [
        IMAGE_META,
        { ...IMAGE_META, originalName: "img2.jpg" },
        VIDEO_META,
      ],
    });
    getPreSignedUrlForProjectMediaUpload(req as any, res, next);
    await flushPromises();

    expect(s3Service.createPreSignedUploadUrl).toHaveBeenCalledTimes(3);
  });
});
