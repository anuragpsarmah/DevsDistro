/**
 * Tests for webhook installation/repository event handlers in webhook.controller.ts.
 *
 * Covers:
 *
 * handleInstallationEvent — 'deleted':
 *   - Invalid signature → 401
 *   - Installation doc found → Project.updateMany + redisClient.del
 *   - Installation not found in DB → no updateMany, no del (no-op)
 *
 * handleInstallationEvent — 'suspend':
 *   - GitHubAppInstallation.updateOne sets suspended_at
 *   - Then findOne to get user_id → Project.updateMany + redisClient.del
 *   - No installation record → no Project.updateMany
 *
 * handleInstallationEvent — 'unsuspend':
 *   - findOneAndUpdate clears suspended_at → githubAppService.reactivateProjectsWithRestoredAccess
 *   - redisClient.del called for user's cache
 *   - No installation record → no reactivate
 *
 * handleInstallationRepositoriesEvent — 'removed':
 *   - Project.updateMany called with matching repo IDs
 *   - redisClient.del called for user's cache
 *   - Suspended installation → del is NOT called (early return)
 *
 * handleInstallationRepositoriesEvent — 'added':
 *   - Project.updateMany called to restore revoked projects
 *   - redisClient.del called
 *   - Suspended installation → no Project.updateMany (early return)
 *   - Installation not found → no Project.updateMany
 *
 * handleRepositoryEvent — 'deleted':
 *   - Project.updateMany marks project access revoked
 *   - Project.findOne fetches userid → redisClient.del
 *   - 'privatized'/'publicized' → no DB calls
 *
 * All webhook handlers:
 *   - DB errors → still respond 200 (webhook ack)
 *   - Invalid signature → 401
 *
 * NOTE: asyncHandler doesn't expose its Promise, so we use flushPromises()
 * (setImmediate-based) to drain the microtask queue before assertions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
// webhook.controller.ts creates its own instance: const repoZipUploadService = new RepoZipUploadService()
// So we mock the constructor class, not the index.ts singleton

const mockProcessRepoZipUpload = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);

vi.mock("../services/repoZipUpload.service", () => ({
  default: vi.fn().mockImplementation(() => ({
    processRepoZipUpload: mockProcessRepoZipUpload,
  })),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

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
    reactivateProjectsWithRestoredAccess: vi.fn().mockResolvedValue(2),
  },
}));

vi.mock("../utils/redisPrefixGenerator.util", () => ({
  privateRepoPrefix: vi.fn((id: string) => `private-repos:${id}`),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { handleWebhook } from "../controllers/webhook.controller";
import { Project } from "../models/project.model";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { githubAppService } from "../services/githubApp.service";
import { redisClient } from "..";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USER_ID = "507f1f77bcf86cd799439011";
const INSTALLATION_ID = 12345;
const GITHUB_REPO_ID_1 = 11111111;
const GITHUB_REPO_ID_2 = 22222222;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const next = vi.fn();

/** Build a webhook request for any event/action */
const makeWebhookReq = (event: string, payload: Record<string, any>) => ({
  headers: {
    "x-github-event": event,
    "x-hub-signature-256": "sha256=valid_signature",
    "x-github-delivery": `delivery-${event}-${Date.now()}`,
  },
  body: {
    sender: { login: "test_user", id: 42 },
    ...payload,
  },
});

const mockInstallationPayload = (
  action: string,
  extras: Record<string, any> = {}
) => ({
  action,
  installation: {
    id: INSTALLATION_ID,
    account: { login: "seller_user", id: 42, type: "User" },
    repository_selection: "selected",
    ...extras,
  },
  sender: { login: "seller_user", id: 42 },
});

// ─── Shared: invalid signature ────────────────────────────────────────────────

describe("handleWebhook — signature verification", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
  });

  it("returns 401 when signature is invalid (installation event)", async () => {
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(false);
    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("deleted")
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(GitHubAppInstallation.findOneAndDelete).not.toHaveBeenCalled();
  });
});

// ─── handleInstallationEvent — 'deleted' ─────────────────────────────────────

describe("handleInstallationEvent — 'deleted'", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(true);
  });

  it("calls Project.updateMany and redisClient.del when installation is found and deleted", async () => {
    vi.mocked(GitHubAppInstallation.findOneAndDelete).mockResolvedValue({
      installation_id: INSTALLATION_ID,
      user_id: VALID_USER_ID,
    } as any);
    vi.mocked(Project.updateMany).mockResolvedValue({
      modifiedCount: 3,
    } as any);
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);

    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("deleted")
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(GitHubAppInstallation.findOneAndDelete).toHaveBeenCalledWith({
      installation_id: INSTALLATION_ID,
    });
    expect(Project.updateMany).toHaveBeenCalledWith(
      { userid: VALID_USER_ID },
      { isActive: false, github_access_revoked: true }
    );
    expect(redisClient.del).toHaveBeenCalledWith(
      `private-repos:${VALID_USER_ID}`
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT call Project.updateMany when installation is not found in DB", async () => {
    vi.mocked(GitHubAppInstallation.findOneAndDelete).mockResolvedValue(
      null as any
    );

    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("deleted")
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateMany).not.toHaveBeenCalled();
    expect(redisClient.del).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200); // always ack
  });

  it("still returns 200 when findOneAndDelete throws (DB error)", async () => {
    vi.mocked(GitHubAppInstallation.findOneAndDelete).mockRejectedValue(
      new Error("DB timeout")
    );

    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("deleted")
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    // Webhook handlers catch errors and always ack with 200
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── handleInstallationEvent — 'suspend' ─────────────────────────────────────

describe("handleInstallationEvent — 'suspend'", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(true);
  });

  it("updates installation suspended_at, deactivates projects, clears cache", async () => {
    vi.mocked(GitHubAppInstallation.updateOne).mockResolvedValue({
      modifiedCount: 1,
    } as any);
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({ user_id: VALID_USER_ID }),
    } as any);
    vi.mocked(Project.updateMany).mockResolvedValue({
      modifiedCount: 2,
    } as any);
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);

    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("suspend", {
        suspended_at: "2025-01-01T00:00:00Z",
      })
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(GitHubAppInstallation.updateOne).toHaveBeenCalledWith(
      { installation_id: INSTALLATION_ID },
      expect.objectContaining({ suspended_at: expect.any(Date) })
    );
    expect(Project.updateMany).toHaveBeenCalledWith(
      { userid: VALID_USER_ID },
      { isActive: false, github_access_revoked: true }
    );
    expect(redisClient.del).toHaveBeenCalledWith(
      `private-repos:${VALID_USER_ID}`
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT call Project.updateMany when no installation record found after suspend", async () => {
    vi.mocked(GitHubAppInstallation.updateOne).mockResolvedValue({
      modifiedCount: 0,
    } as any);
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue(null), // no record
    } as any);

    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("suspend")
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── handleInstallationEvent — 'unsuspend' ───────────────────────────────────

describe("handleInstallationEvent — 'unsuspend'", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(true);
  });

  it("clears suspended_at, calls reactivateProjectsWithRestoredAccess, and clears cache", async () => {
    vi.mocked(GitHubAppInstallation.findOneAndUpdate).mockReturnValue({
      select: vi.fn().mockResolvedValue({ user_id: VALID_USER_ID }),
    } as any);
    vi.mocked(
      githubAppService.reactivateProjectsWithRestoredAccess
    ).mockResolvedValue(3);
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);

    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("unsuspend")
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(GitHubAppInstallation.findOneAndUpdate).toHaveBeenCalledWith(
      { installation_id: INSTALLATION_ID },
      { suspended_at: null }
    );
    expect(
      githubAppService.reactivateProjectsWithRestoredAccess
    ).toHaveBeenCalledWith(VALID_USER_ID, INSTALLATION_ID);
    expect(redisClient.del).toHaveBeenCalledWith(
      `private-repos:${VALID_USER_ID}`
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT call reactivate when no installation record found", async () => {
    vi.mocked(GitHubAppInstallation.findOneAndUpdate).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as any);

    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("unsuspend")
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(
      githubAppService.reactivateProjectsWithRestoredAccess
    ).not.toHaveBeenCalled();
    expect(redisClient.del).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still returns 200 when reactivate throws (DB error)", async () => {
    vi.mocked(GitHubAppInstallation.findOneAndUpdate).mockReturnValue({
      select: vi.fn().mockResolvedValue({ user_id: VALID_USER_ID }),
    } as any);
    vi.mocked(
      githubAppService.reactivateProjectsWithRestoredAccess
    ).mockRejectedValue(new Error("Reactivation failed"));

    const req = makeWebhookReq(
      "installation",
      mockInstallationPayload("unsuspend")
    );
    handleWebhook(req as any, res, next);
    await flushPromises();

    // Webhook acks even on error
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── handleInstallationRepositoriesEvent — 'removed' ─────────────────────────

describe("handleInstallationRepositoriesEvent — 'removed'", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(true);
  });

  it("calls Project.updateMany with removed repo IDs and clears cache", async () => {
    vi.mocked(Project.updateMany).mockResolvedValue({
      modifiedCount: 2,
    } as any);
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        user_id: VALID_USER_ID,
        suspended_at: null,
      }),
    } as any);
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);

    const req = makeWebhookReq("installation_repositories", {
      action: "removed",
      installation: {
        id: INSTALLATION_ID,
        account: { login: "u", id: 1, type: "User" },
      },
      repositories_removed: [
        { id: GITHUB_REPO_ID_1, name: "repo-1", full_name: "u/repo-1" },
        { id: GITHUB_REPO_ID_2, name: "repo-2", full_name: "u/repo-2" },
      ],
      sender: { login: "u", id: 1 },
    });
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        github_installation_id: INSTALLATION_ID,
        github_repo_id: {
          $in: [GITHUB_REPO_ID_1.toString(), GITHUB_REPO_ID_2.toString()],
        },
      }),
      {
        isActive: false,
        github_access_revoked: true,
        github_installation_id: INSTALLATION_ID,
      }
    );
    expect(redisClient.del).toHaveBeenCalledWith(
      `private-repos:${VALID_USER_ID}`
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT call redisClient.del when installation is suspended", async () => {
    vi.mocked(Project.updateMany).mockResolvedValue({
      modifiedCount: 1,
    } as any);
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        user_id: VALID_USER_ID,
        suspended_at: new Date(), // suspended → early return
      }),
    } as any);

    const req = makeWebhookReq("installation_repositories", {
      action: "removed",
      installation: {
        id: INSTALLATION_ID,
        account: { login: "u", id: 1, type: "User" },
      },
      repositories_removed: [
        { id: GITHUB_REPO_ID_1, name: "repo-1", full_name: "u/repo-1" },
      ],
      sender: { login: "u", id: 1 },
    });
    handleWebhook(req as any, res, next);
    await flushPromises();

    // updateMany still called (happens before the suspended_at check)
    expect(Project.updateMany).toHaveBeenCalled();
    // But del is NOT called because installation is suspended
    expect(redisClient.del).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── handleInstallationRepositoriesEvent — 'added' ───────────────────────────

describe("handleInstallationRepositoriesEvent — 'added'", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(true);
  });

  it("reactivates revoked projects and clears cache when repos are added", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        user_id: VALID_USER_ID,
        suspended_at: null, // not suspended
      }),
    } as any);
    vi.mocked(Project.updateMany).mockResolvedValue({
      modifiedCount: 1,
    } as any);
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);

    const req = makeWebhookReq("installation_repositories", {
      action: "added",
      installation: {
        id: INSTALLATION_ID,
        account: { login: "u", id: 1, type: "User" },
      },
      repositories_added: [
        {
          id: GITHUB_REPO_ID_1,
          name: "repo-1",
          full_name: "u/repo-1",
          private: true,
        },
      ],
      sender: { login: "u", id: 1 },
    });
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        userid: VALID_USER_ID,
        github_repo_id: { $in: [GITHUB_REPO_ID_1.toString()] },
        github_access_revoked: true,
      }),
      {
        isActive: false,
        github_access_revoked: false,
        github_installation_id: INSTALLATION_ID,
      }
    );
    expect(redisClient.del).toHaveBeenCalledWith(
      `private-repos:${VALID_USER_ID}`
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT call Project.updateMany when installation is suspended", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({
        user_id: VALID_USER_ID,
        suspended_at: new Date(), // suspended → early return
      }),
    } as any);

    const req = makeWebhookReq("installation_repositories", {
      action: "added",
      installation: {
        id: INSTALLATION_ID,
        account: { login: "u", id: 1, type: "User" },
      },
      repositories_added: [
        {
          id: GITHUB_REPO_ID_1,
          name: "repo-1",
          full_name: "u/repo-1",
          private: true,
        },
      ],
      sender: { login: "u", id: 1 },
    });
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT call Project.updateMany when installation doc not found", async () => {
    vi.mocked(GitHubAppInstallation.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as any);

    const req = makeWebhookReq("installation_repositories", {
      action: "added",
      installation: {
        id: INSTALLATION_ID,
        account: { login: "u", id: 1, type: "User" },
      },
      repositories_added: [
        {
          id: GITHUB_REPO_ID_1,
          name: "repo-1",
          full_name: "u/repo-1",
          private: true,
        },
      ],
      sender: { login: "u", id: 1 },
    });
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateMany).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

// ─── handleRepositoryEvent — 'deleted' ───────────────────────────────────────

describe("handleRepositoryEvent — 'deleted'", () => {
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    res = makeRes();
    vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(true);
  });

  it("marks projects as access revoked and clears user's cache", async () => {
    vi.mocked(Project.updateMany).mockResolvedValue({
      modifiedCount: 1,
    } as any);
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ userid: VALID_USER_ID }),
      }),
    } as any);
    vi.mocked(redisClient.del).mockResolvedValue(1 as any);

    const req = makeWebhookReq("repository", {
      action: "deleted",
      repository: {
        id: GITHUB_REPO_ID_1,
        name: "my-repo",
        full_name: "user/my-repo",
        private: true,
      },
      sender: { login: "user", id: 42 },
    });
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(Project.updateMany).toHaveBeenCalledWith(
      { github_repo_id: GITHUB_REPO_ID_1.toString() },
      { isActive: false, github_access_revoked: true }
    );
    expect(Project.findOne).toHaveBeenCalledWith({
      github_repo_id: GITHUB_REPO_ID_1.toString(),
    });
    expect(redisClient.del).toHaveBeenCalledWith(
      `private-repos:${VALID_USER_ID}`
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT call redisClient.del when no project found for deleted repo", async () => {
    vi.mocked(Project.updateMany).mockResolvedValue({
      modifiedCount: 0,
    } as any);
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null), // no project
      }),
    } as any);

    const req = makeWebhookReq("repository", {
      action: "deleted",
      repository: {
        id: GITHUB_REPO_ID_1,
        name: "my-repo",
        full_name: "u/my-repo",
        private: true,
      },
      sender: { login: "u", id: 1 },
    });
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(redisClient.del).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("still returns 200 when Project.updateMany throws (DB error)", async () => {
    vi.mocked(Project.updateMany).mockRejectedValue(new Error("DB error"));
    vi.mocked(Project.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as any);

    const req = makeWebhookReq("repository", {
      action: "deleted",
      repository: {
        id: GITHUB_REPO_ID_1,
        name: "repo",
        full_name: "u/repo",
        private: true,
      },
      sender: { login: "u", id: 1 },
    });
    handleWebhook(req as any, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("does NOT call Project.updateMany for 'privatized' or 'publicized' events", async () => {
    for (const action of ["privatized", "publicized"]) {
      vi.clearAllMocks();
      res = makeRes();
      vi.mocked(githubAppService.verifyWebhookSignature).mockReturnValue(true);

      const req = makeWebhookReq("repository", {
        action,
        repository: {
          id: GITHUB_REPO_ID_1,
          name: "repo",
          full_name: "u/repo",
          private: action === "privatized",
        },
        sender: { login: "u", id: 1 },
      });
      handleWebhook(req as any, res, next);
      await flushPromises();

      expect(Project.updateMany).not.toHaveBeenCalled();
      expect(redisClient.del).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    }
  });
});
