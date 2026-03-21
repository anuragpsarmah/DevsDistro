/**
 * Tests for validateMediaUploadAndStoreProject controller endpoint.
 *
 * Flow:
 * 1.  Auth check → 401
 * 2.  modificationType validation → 400
 * 3.  For "new": listing limit via Promise.all([countDocuments, User.findById]) → 400/500
 * 4.  projectFormDataSchema validation → 400
 * 5.  installationId presence check → 400
 * 6.  GitHubAppInstallation.findOne (direct resolve) → 403/500
 * 7.  githubAppService.getInstallationToken → 500
 * 8.  axios.get GitHub API → 404/403/500
 * 9.  Project.findOne (direct resolve) → 400 (exists/not-found/scheduled-deletion)
 * 10. For "new": CloudFront URLs in imageOrder → 400
 * 11. s3Service.validateAndCreatePreSignedDownloadUrl → error → 400/500
 * 12. imageOrder_detail length mismatch → 400
 * 13. For "new": Project.create → 200 + processRepoZipUpload fired (fire-and-forget)
 * 14. For "existing": project.set().save() → 200 + removed media queued to Redis
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

// Axios mock — controller checks error.isAxiosError + error.response.status
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { validateMediaUploadAndStoreProject } from "../controllers/projects.controller";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { githubAppService } from "../services/githubApp.service";
import { s3Service, redisClient, repoZipUploadService } from "..";
import axios from "axios";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const VALID_REPO_ID = "99887766";
const INSTALLATION_ID = 12345;
const CLOUDFRONT_DOMAIN = "https://cdn.example.com";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

/** Minimal valid projectData that passes projectFormDataSchema */
const makeValidProjectData = (overrides: Record<string, any> = {}) => ({
  github_repo_id: VALID_REPO_ID,
  installation_id: INSTALLATION_ID,
  title: "My Project",
  description: "A detailed project description for testing",
  project_type: "Web Application",
  tech_stack: ["React"],
  live_link: "",
  price: 99,
  imageOrder: ["projectMedia/key1.png"], // new S3 key
  imageOrder_detail: [],
  project_video: "",
  existingVideo: "",
  ...overrides,
});

const makeReq = (bodyOverrides: Record<string, any> = {}) => ({
  user: { _id: VALID_USER_ID },
  query: {},
  body: {
    modificationType: "new",
    projectData: makeValidProjectData(),
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

/** A mock Mongoose document returned by Project.findOne for existing updates */
const makeMockProjectDoc = (overrides: Record<string, any> = {}) => ({
  _id: "507f191e810c19729de860ea",
  userid: VALID_USER_ID,
  github_repo_id: VALID_REPO_ID,
  project_images: [`${CLOUDFRONT_DOMAIN}/old-img.png`],
  project_images_detail: [],
  project_video: "",
  scheduled_deletion_at: null,
  set: vi.fn().mockReturnThis(),
  save: vi.fn().mockResolvedValue({}),
  ...overrides,
});

/** Stub listing limit check (used for new-project flow) */
const stubNewLimitCheck = (count: number, limit: number) => {
  vi.mocked(Project.countDocuments).mockResolvedValue(count as any);
  vi.mocked(User.findById).mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ project_listing_limit: limit }),
    }),
  } as any);
};

/** Stub GitHubAppInstallation.findOne direct resolve */
const stubInstallation = (doc: any) => {
  vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(doc as any);
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("validateMediaUploadAndStoreProject", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    process.env.DEFAULT_PROJECT_LISTING_LIMIT = "2";
    process.env.S3_CLOUDFRONT_DISTRIBUTION = CLOUDFRONT_DOMAIN;
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    const req = { ...makeReq(), user: undefined };
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(Project.countDocuments).not.toHaveBeenCalled();
  });

  // ── modificationType validation ───────────────────────────────────────────

  it("returns 400 when modificationType is not 'new' or 'existing'", async () => {
    const req = makeReq({ modificationType: "replace" });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid modification type" })
    );
    expect(Project.countDocuments).not.toHaveBeenCalled();
  });

  // ── Listing limit (new projects) ──────────────────────────────────────────

  it("returns 400 when new project count equals the listing limit", async () => {
    stubNewLimitCheck(2, 2); // already at limit
    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("projects can be listed at a time"),
      })
    );
    expect(GitHubAppInstallation.findOne).not.toHaveBeenCalled();
  });

  it("returns 500 when DB query for listing limit throws", async () => {
    vi.mocked(Project.countDocuments).mockRejectedValue(new Error("DB fail"));
    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Schema validation ─────────────────────────────────────────────────────

  it("returns 400 when projectData fails schema validation", async () => {
    stubNewLimitCheck(0, 2);
    const req = makeReq({
      projectData: makeValidProjectData({ project_type: "NotARealType" }),
    });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Payload failed validation" })
    );
    expect(GitHubAppInstallation.findOne).not.toHaveBeenCalled();
  });

  // ── Installation checks ───────────────────────────────────────────────────

  it("returns 403 when GitHub App installation is not found", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation(null); // no active installation

    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "No access to this GitHub App installation",
      })
    );
    expect(githubAppService.getInstallationToken).not.toHaveBeenCalled();
  });

  it("returns 500 when installation DB query throws", async () => {
    stubNewLimitCheck(0, 2);
    vi.mocked(GitHubAppInstallation.findOne).mockRejectedValue(
      new Error("DB connection error")
    );

    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── GitHub API errors ─────────────────────────────────────────────────────

  it("returns 404 when GitHub API returns 404 for the repository", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockRejectedValue(
      Object.assign(new Error("Not Found"), {
        isAxiosError: true,
        response: { status: 404 },
      })
    );

    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Repository not found or not accessible via this installation",
      })
    );
  });

  it("returns 403 when GitHub API returns 403 for the repository", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockRejectedValue(
      Object.assign(new Error("Forbidden"), {
        isAxiosError: true,
        response: { status: 403 },
      })
    );

    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Access denied to the repository" })
    );
  });

  it("returns 500 when GitHub API returns another HTTP error status", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockRejectedValue(
      Object.assign(new Error("Internal Server Error"), {
        isAxiosError: true,
        response: { status: 500 },
      })
    );

    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Project existence checks ──────────────────────────────────────────────

  it("returns 400 when project already exists for 'new' modificationType", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne).mockResolvedValue(makeMockProjectDoc() as any);

    const req = makeReq(); // modificationType: "new"
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project already exists" })
    );
    expect(Project.create).not.toHaveBeenCalled();
  });

  it("returns 400 when project not found for 'existing' modificationType", async () => {
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne).mockResolvedValue(null as any);

    const req = makeReq({ modificationType: "existing" });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Project does not exist" })
    );
  });

  it("returns 400 when existing project is scheduled for deletion", async () => {
    const projectDoc = makeMockProjectDoc({
      scheduled_deletion_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne).mockResolvedValue(projectDoc as any);

    const req = makeReq({ modificationType: "existing" });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Cannot modify a project that is scheduled for deletion.",
      })
    );
  });

  // ── Image validation ──────────────────────────────────────────────────────

  it("returns 400 when 'new' imageOrder contains CloudFront URLs", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne)
      .mockResolvedValueOnce(null as any)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any);

    const req = makeReq({
      projectData: makeValidProjectData({
        // New projects must not have CloudFront URLs in imageOrder
        imageOrder: [`${CLOUDFRONT_DOMAIN}/existing-img.png`],
      }),
    });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid image data" })
    );
  });

  it("returns 400 when S3 validation throws (Error instance)", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne)
      .mockResolvedValueOnce(null as any)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any);
    vi.mocked(
      s3Service.validateAndCreatePreSignedDownloadUrl
    ).mockRejectedValue(new Error("Object not found in S3"));

    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when imageOrder_detail length mismatches imageOrder length", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne)
      .mockResolvedValueOnce(null as any)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any);
    // Card image + 2 detail images → mismatch (1 vs 2)
    vi.mocked(s3Service.validateAndCreatePreSignedDownloadUrl)
      .mockResolvedValueOnce(`${CLOUDFRONT_DOMAIN}/card.png` as any)
      .mockResolvedValueOnce(`${CLOUDFRONT_DOMAIN}/detail1.png` as any)
      .mockResolvedValueOnce(`${CLOUDFRONT_DOMAIN}/detail2.png` as any);

    const req = makeReq({
      projectData: makeValidProjectData({
        imageOrder: ["projectMedia/card.png"], // 1 card image
        imageOrder_detail: [
          "projectMedia/detail1.png",
          "projectMedia/detail2.png",
        ], // 2 detail images → mismatch
      }),
    });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Image arrays length mismatch" })
    );
  });

  // ── Success: new project ──────────────────────────────────────────────────

  it("returns 200, creates project, and fires processRepoZipUpload for 'new' project", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne)
      .mockResolvedValueOnce(null as any)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any);
    vi.mocked(
      s3Service.validateAndCreatePreSignedDownloadUrl
    ).mockResolvedValue(`${CLOUDFRONT_DOMAIN}/new-img.png` as any);
    vi.mocked(Project.create).mockResolvedValue({
      _id: "new_project_id",
      github_repo_id: VALID_REPO_ID,
    } as any);

    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(Project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        github_repo_id: VALID_REPO_ID,
        title: "My Project",
      })
    );
    expect(repoZipUploadService.processRepoZipUpload).toHaveBeenCalledWith(
      "new_project_id",
      VALID_REPO_ID,
      INSTALLATION_ID
    );
  });

  it("returns 500 when Project.create throws", async () => {
    stubNewLimitCheck(0, 2);
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne).mockResolvedValue(null as any);
    vi.mocked(
      s3Service.validateAndCreatePreSignedDownloadUrl
    ).mockResolvedValue(`${CLOUDFRONT_DOMAIN}/new-img.png` as any);
    vi.mocked(Project.create).mockRejectedValue(new Error("DB write error"));

    const req = makeReq();
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Success: existing project ─────────────────────────────────────────────

  it("returns 200 and saves existing project via set().save()", async () => {
    const projectDoc = makeMockProjectDoc();
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne)
      .mockResolvedValueOnce(projectDoc as any)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any);
    vi.mocked(
      s3Service.validateAndCreatePreSignedDownloadUrl
    ).mockResolvedValue(`${CLOUDFRONT_DOMAIN}/updated-img.png` as any);

    const req = makeReq({ modificationType: "existing" });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(projectDoc.set).toHaveBeenCalled();
    expect(projectDoc.save).toHaveBeenCalled();
    // Should NOT fire repoZipUploadService for existing project updates
    expect(repoZipUploadService.processRepoZipUpload).not.toHaveBeenCalled();
  });

  it("queues replaced media URLs to Redis cleanup on 'existing' update", async () => {
    const oldImgUrl = `${CLOUDFRONT_DOMAIN}/old-img-to-remove.png`;
    const projectDoc = makeMockProjectDoc({
      project_images: [oldImgUrl],
    });
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne)
      .mockResolvedValueOnce(projectDoc as any)
      .mockReturnValueOnce({
        select: vi
          .fn()
          .mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      } as any);
    // New S3 key resolves to a different CloudFront URL
    vi.mocked(
      s3Service.validateAndCreatePreSignedDownloadUrl
    ).mockResolvedValue(`${CLOUDFRONT_DOMAIN}/new-replacement.png` as any);
    vi.mocked(redisClient.zadd).mockResolvedValue(1 as any);

    const req = makeReq({
      modificationType: "existing",
      projectData: makeValidProjectData({
        imageOrder: ["projectMedia/new-key.png"], // new S3 key, not a CloudFront URL
      }),
    });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    // old-img-to-remove.png should be extracted and queued for S3 cleanup
    expect(redisClient.zadd).toHaveBeenCalledWith(
      "media-cleanup-schedule",
      expect.any(Number),
      "old-img-to-remove.png"
    );
  });

  it("returns 500 when project.save() throws", async () => {
    const projectDoc = makeMockProjectDoc({
      save: vi.fn().mockRejectedValue(new Error("Save failed")),
    });
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne).mockResolvedValue(projectDoc as any);
    vi.mocked(
      s3Service.validateAndCreatePreSignedDownloadUrl
    ).mockResolvedValue(`${CLOUDFRONT_DOMAIN}/updated-img.png` as any);

    const req = makeReq({ modificationType: "existing" });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ── Listing limit skipped for existing ───────────────────────────────────

  it("does NOT check listing limit for 'existing' modificationType", async () => {
    const projectDoc = makeMockProjectDoc();
    stubInstallation({ installation_id: INSTALLATION_ID });
    vi.mocked(githubAppService.getInstallationToken).mockResolvedValue(
      "ghs_token"
    );
    vi.mocked(axios.get).mockResolvedValue({} as any);
    vi.mocked(Project.findOne).mockResolvedValue(projectDoc as any);
    vi.mocked(
      s3Service.validateAndCreatePreSignedDownloadUrl
    ).mockResolvedValue(`${CLOUDFRONT_DOMAIN}/img.png` as any);

    const req = makeReq({ modificationType: "existing" });
    validateMediaUploadAndStoreProject(req as any, res, next);
    await flushPromises();

    expect(Project.countDocuments).not.toHaveBeenCalled();
    expect(User.findById).not.toHaveBeenCalled();
  });
});
