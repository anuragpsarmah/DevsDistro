/**
 * Tests for getPrivateRepos controller endpoint.
 *
 * Covers:
 * - Rate limited (req.rateLimited = true) → 429
 * - Missing user → 401
 * - No GitHub App installation (or suspended) → 200 with needsInstallation: true
 * - GitHub API error → 500
 * - Success: filters private repos, formats, caches in Redis, returns pagination
 * - Page 2 with hasMore: false
 * - Redis cache error → logs but still returns 200
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
    findOneAndDelete: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("..", () => ({
  redisClient: { hset: vi.fn(), expire: vi.fn(), zadd: vi.fn(), del: vi.fn() },
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
    getInstallUrl: vi.fn().mockReturnValue("https://github.com/apps/install"),
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

import { getPrivateRepos } from "../controllers/projects.controller";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { githubAppService } from "../services/githubApp.service";
import { redisClient } from "..";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const INSTALLATION_ID = 12345;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeReq = (overrides: Record<string, any> = {}) => ({
  user: { _id: VALID_USER_ID },
  query: { page: "1" },
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

const mockInstallation = {
  _id: "install_1",
  installation_id: INSTALLATION_ID,
  user_id: VALID_USER_ID,
  suspended_at: null,
};

const makePrivateRepo = (overrides: Record<string, any> = {}) => ({
  id: 99887766,
  name: "my-private-repo",
  description: "A private repository",
  language: "TypeScript",
  updated_at: "2025-01-01T00:00:00Z",
  private: true,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getPrivateRepos", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when req.rateLimited is true", async () => {
    const req = makeReq({ rateLimited: true });
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Too many refresh requests and no cached data available",
      })
    );
    // Should NOT proceed to any DB/API calls
    expect(GitHubAppInstallation.findOne).not.toHaveBeenCalled();
  });

  // ── Auth guard ────────────────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    const req = makeReq({ user: undefined, rateLimited: false });
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── Installation checks ───────────────────────────────────────────────────

  it("returns 200 with needsInstallation: true when no installation exists", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(null as any);

    const req = makeReq();
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          needsInstallation: true,
          repos: [],
          hasMore: false,
        }),
      })
    );
    // Should NOT call GitHub API
    expect(githubAppService.getInstallationRepos).not.toHaveBeenCalled();
  });

  it("returns 200 with needsInstallation: true when installation is suspended", async () => {
    // The query filters by suspended_at: null, so a suspended installation
    // returns null from MongoDB → controller sees no installation
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(null as any);

    const req = makeReq();
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ needsInstallation: true }),
      })
    );
  });

  it("returns 500 when installation DB query throws", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockRejectedValue(
      new Error("DB timeout")
    );

    const req = makeReq();
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(githubAppService.getInstallationRepos).not.toHaveBeenCalled();
  });

  // ── GitHub API errors ─────────────────────────────────────────────────────

  it("returns 500 when GitHub API call fails", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(
      mockInstallation as any
    );
    vi.mocked(githubAppService.getInstallationRepos).mockRejectedValue(
      new Error("GitHub API error")
    );

    const req = makeReq();
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Failed to fetch repositories" })
    );
  });

  // ── Success cases ─────────────────────────────────────────────────────────

  it("returns 200 with formatted repos and caches in Redis on success", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(
      mockInstallation as any
    );
    vi.mocked(githubAppService.getInstallationRepos).mockResolvedValue({
      repos: [
        makePrivateRepo(),
        makePrivateRepo({ id: 11223344, name: "second-repo" }),
      ],
      totalCount: 15,
      perPage: 10,
    } as any);
    vi.mocked(redisClient.hset).mockResolvedValue(1 as any);
    vi.mocked(redisClient.expire).mockResolvedValue(1 as any);

    const req = makeReq({ query: { page: "1" } });
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data.repos).toHaveLength(2);
    expect(callArg.data.page).toBe(1);
    expect(callArg.data.hasMore).toBe(true); // page 1 of 2 (totalCount=15, perPage=10)
    expect(callArg.data.totalCount).toBe(15);

    // Verify Redis caching
    expect(redisClient.hset).toHaveBeenCalledWith(
      `private-repos:${VALID_USER_ID}`,
      "page:1",
      expect.any(String)
    );
    expect(redisClient.expire).toHaveBeenCalledWith(
      `private-repos:${VALID_USER_ID}`,
      3600 // 1 hour
    );
  });

  it("filters out public repos and only returns private ones", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(
      mockInstallation as any
    );
    vi.mocked(githubAppService.getInstallationRepos).mockResolvedValue({
      repos: [
        makePrivateRepo({ private: true, name: "private-repo" }),
        makePrivateRepo({ private: false, id: 55556666, name: "public-repo" }),
      ],
      totalCount: 10,
      perPage: 10,
    } as any);
    vi.mocked(redisClient.hset).mockResolvedValue(1 as any);
    vi.mocked(redisClient.expire).mockResolvedValue(1 as any);

    const req = makeReq();
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data.repos).toHaveLength(1);
    expect(callArg.data.repos[0].name).toBe("private-repo");
  });

  it("formats repos correctly with github_repo_id as string and installation_id", async () => {
    const rawRepo = makePrivateRepo({
      id: 12345678,
      name: "my-repo",
      language: "Go",
    });
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(
      mockInstallation as any
    );
    vi.mocked(githubAppService.getInstallationRepos).mockResolvedValue({
      repos: [rawRepo],
      totalCount: 1,
      perPage: 10,
    } as any);
    vi.mocked(redisClient.hset).mockResolvedValue(1 as any);
    vi.mocked(redisClient.expire).mockResolvedValue(1 as any);

    const req = makeReq();
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    const callArg = res.json.mock.calls[0][0];
    const formattedRepo = callArg.data.repos[0];
    expect(formattedRepo.github_repo_id).toBe("12345678"); // string
    expect(formattedRepo.name).toBe("my-repo");
    expect(formattedRepo.language).toBe("Go");
    expect(formattedRepo.installation_id).toBe(INSTALLATION_ID);
  });

  it("returns hasMore: false on last page", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(
      mockInstallation as any
    );
    vi.mocked(githubAppService.getInstallationRepos).mockResolvedValue({
      repos: [makePrivateRepo()],
      totalCount: 5,
      perPage: 10, // totalPages = ceil(5/10) = 1 → hasMore = page < 1 = false
    } as any);
    vi.mocked(redisClient.hset).mockResolvedValue(1 as any);
    vi.mocked(redisClient.expire).mockResolvedValue(1 as any);

    const req = makeReq({ query: { page: "1" } });
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    const callArg = res.json.mock.calls[0][0];
    expect(callArg.data.hasMore).toBe(false);
  });

  it("still returns 200 when Redis caching fails (non-fatal)", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(
      mockInstallation as any
    );
    vi.mocked(githubAppService.getInstallationRepos).mockResolvedValue({
      repos: [makePrivateRepo()],
      totalCount: 1,
      perPage: 10,
    } as any);
    vi.mocked(redisClient.hset).mockRejectedValue(new Error("Redis down"));

    const req = makeReq();
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    // Cache failure is non-fatal — response still 200
    expect(res.status).toHaveBeenCalledWith(200);
    expect(redisClient.expire).not.toHaveBeenCalled(); // expire skipped if hset fails
  });

  it("queries GitHub API with the correct installation_id and page number", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockResolvedValue(
      mockInstallation as any
    );
    vi.mocked(githubAppService.getInstallationRepos).mockResolvedValue({
      repos: [],
      totalCount: 0,
      perPage: 10,
    } as any);
    vi.mocked(redisClient.hset).mockResolvedValue(1 as any);
    vi.mocked(redisClient.expire).mockResolvedValue(1 as any);

    const req = makeReq({ query: { page: "3" } });
    getPrivateRepos(req as any, res, next);
    await flushPromises();

    expect(githubAppService.getInstallationRepos).toHaveBeenCalledWith(
      INSTALLATION_ID,
      3
    );
  });
});
