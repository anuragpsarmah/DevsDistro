import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    isAxiosError: vi.fn(),
  },
}));

vi.mock("../models/user.model", () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock("../utils/encryption.util", () => ({
  encrypt: vi.fn(),
}));

vi.mock("../utils/authToken.util", () => ({
  generateRefreshToken: vi.fn(),
  addRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
}));

// Mocks for models/utils imported by the new deleteAccount controller.
// These prevent Mongoose from attempting to validate mock objects as schema refs.
vi.mock("../models/project.model", () => ({
  Project: {
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("../models/purchase.model", () => ({
  Purchase: {
    exists: vi.fn(),
  },
}));

vi.mock("../models/sales.model", () => ({
  Sales: {
    deleteOne: vi.fn(),
  },
}));

vi.mock("../models/projectReview.model", () => ({
  Review: {
    deleteMany: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock("../models/siteReview.model", () => ({
  SiteReview: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("../models/githubAppInstallation.model", () => ({
  GitHubAppInstallation: {
    deleteMany: vi.fn(),
  },
}));

vi.mock("../models/deletedUser.model", () => ({
  DeletedUser: {
    create: vi.fn(),
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock("../utils/projectCleanup.util", () => ({
  performProjectHardDelete: vi.fn(),
}));

vi.mock("../utils/reviewsHelper.util", () => ({
  recalculateProjectAggregates: vi.fn(),
}));

import axios from "axios";
import {
  githubLoginStart,
  githubLogin,
  authValidation,
  githubLogout,
  refreshTokenHandler,
} from "../controllers/auth.controller";
import { User } from "../models/user.model";
import {
  addRefreshToken,
  createSessionToken,
  generateRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../utils/authToken.util";
import { encrypt } from "../utils/encryption.util";

const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

const makeReq = (overrides: Record<string, any> = {}) =>
  ({
    query: {},
    cookies: {},
    get: vi.fn().mockReturnValue(undefined),
    ...overrides,
  }) as any;

describe("auth.controller", () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_CLIENT_ID = "gh-client";
    process.env.GITHUB_CLIENT_SECRET = "gh-secret";
    process.env.JWT_SECRET = "jwt-secret";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.ENCRYPTION_KEY_32 =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  it("githubLoginStart sets oauth_state cookie and returns authorize URL", async () => {
    const req = makeReq();
    const res = makeRes();

    githubLoginStart(req, res, next);
    await flushPromises();

    expect(res.cookie).toHaveBeenCalledWith(
      "oauth_state",
      expect.stringMatching(/^[a-f0-9]{48}$/),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "none",
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorize_url: expect.stringContaining(
            "https://github.com/login/oauth/authorize?"
          ),
        }),
      })
    );
  });

  it("githubLogin rejects when OAuth state does not match cookie", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "b".repeat(48) },
    });
    const res = makeRes();

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.clearCookie).toHaveBeenCalledWith(
      "oauth_state",
      expect.objectContaining({ sameSite: "none" })
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("githubLogin returns 401 when GitHub token exchange fails with client error", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();

    vi.mocked(axios.post).mockRejectedValue({ response: { status: 401 } });
    vi.mocked(axios.isAxiosError).mockReturnValue(true as any);

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.clearCookie).toHaveBeenCalledWith(
      "oauth_state",
      expect.objectContaining({ sameSite: "none" })
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("githubLogin succeeds for existing user and issues session + refresh cookies", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();
    const existingUser = {
      _id: "507f1f77bcf86cd799439011",
      id: "507f1f77bcf86cd799439011",
      username: "old-user",
      name: "Old User",
      profile_image_url: "https://img.example/old.png",
      save: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: "gho_token" },
      headers: {},
    } as any);
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        id: 123,
        login: "new-user",
        name: "New User",
        avatar_url: "https://img.example/new.png",
      },
    } as any);
    vi.mocked(encrypt).mockReturnValue("encrypted");
    vi.mocked(User.findOne).mockResolvedValue(existingUser as any);
    vi.mocked(createSessionToken).mockReturnValue("session-token");
    vi.mocked(generateRefreshToken).mockReturnValue("f".repeat(80));
    vi.mocked(addRefreshToken).mockResolvedValue(undefined);

    githubLogin(req, res, next);
    await flushPromises();

    expect(existingUser.save).toHaveBeenCalled();
    expect(addRefreshToken).toHaveBeenCalledWith(
      existingUser._id,
      "f".repeat(80)
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "oauth_state",
      expect.objectContaining({ sameSite: "none" })
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      "session_token",
      "session-token",
      expect.objectContaining({ httpOnly: true, secure: true })
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      "refresh_token",
      "f".repeat(80),
      expect.objectContaining({ maxAge: expect.any(Number) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("refreshTokenHandler returns 401 for malformed refresh cookie", async () => {
    const req = makeReq({ cookies: { refresh_token: "bad" } });
    const res = makeRes();

    refreshTokenHandler(req, res, next);
    await flushPromises();

    expect(rotateRefreshToken).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("refreshTokenHandler revokes cookies on token reuse detection", async () => {
    const oldToken = "a".repeat(80);
    const newToken = "b".repeat(80);
    const req = makeReq({ cookies: { refresh_token: oldToken } });
    const res = makeRes();

    vi.mocked(generateRefreshToken).mockReturnValue(newToken);
    vi.mocked(rotateRefreshToken).mockResolvedValue("REUSE_DETECTED");

    refreshTokenHandler(req, res, next);
    await flushPromises();

    expect(res.clearCookie).toHaveBeenCalledWith(
      "session_token",
      expect.any(Object)
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("refreshTokenHandler rotates token and returns new session", async () => {
    const oldToken = "a".repeat(80);
    const newToken = "b".repeat(80);
    const req = makeReq({ cookies: { refresh_token: oldToken } });
    const res = makeRes();

    vi.mocked(generateRefreshToken).mockReturnValue(newToken);
    vi.mocked(rotateRefreshToken).mockResolvedValue({
      _id: "507f1f77bcf86cd799439011" as any,
      username: "user",
      name: "User",
      profile_image_url: "https://img.example/u.png",
    });
    vi.mocked(createSessionToken).mockReturnValue("new-session");

    refreshTokenHandler(req, res, next);
    await flushPromises();

    expect(res.cookie).toHaveBeenNthCalledWith(
      1,
      "session_token",
      "new-session",
      expect.objectContaining({ httpOnly: true })
    );
    expect(res.cookie).toHaveBeenNthCalledWith(
      2,
      "refresh_token",
      newToken,
      expect.objectContaining({ maxAge: expect.any(Number) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("githubLogout revokes refresh token when cookie is present", async () => {
    const req = makeReq({ cookies: { refresh_token: "a".repeat(80) } });
    const res = makeRes();

    vi.mocked(revokeRefreshToken).mockResolvedValue(undefined);

    githubLogout(req, res, next);
    await flushPromises();

    expect(revokeRefreshToken).toHaveBeenCalledWith("a".repeat(80));
    expect(res.clearCookie).toHaveBeenCalledWith(
      "session_token",
      expect.any(Object)
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("refreshTokenHandler blocks untrusted Origin", async () => {
    const req = makeReq({
      cookies: { refresh_token: "a".repeat(80) },
      get: vi
        .fn()
        .mockImplementation((header: string) =>
          header.toLowerCase() === "origin" ? "https://evil.example" : undefined
        ),
    });
    const res = makeRes();

    refreshTokenHandler(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(rotateRefreshToken).not.toHaveBeenCalled();
  });

  // --- A1: githubLoginStart — missing GITHUB_CLIENT_ID ---
  it("githubLoginStart returns 500 when GITHUB_CLIENT_ID is missing", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    const req = makeReq();
    const res = makeRes();

    githubLoginStart(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // --- A2: githubLogin — Zod validation failure ---
  it("githubLogin returns 400 when query params fail Zod validation", async () => {
    const req = makeReq({
      query: { code: "", state: "short" },
      cookies: {},
    });
    const res = makeRes();

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("validation"),
      })
    );
  });

  // --- A3: githubLogin — GitHub returns error field in token response ---
  it("githubLogin returns 401 when GitHub responds with error field in token data", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();

    vi.mocked(axios.post).mockResolvedValue({
      data: { error: "bad_verification_code" },
      headers: {},
    } as any);

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.clearCookie).toHaveBeenCalledWith(
      "oauth_state",
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // --- A4: githubLogin — GitHub token exchange server error (5xx) ---
  it("githubLogin returns 500 when GitHub token exchange fails with server error", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();

    vi.mocked(axios.post).mockRejectedValue({ response: { status: 502 } });
    vi.mocked(axios.isAxiosError).mockReturnValue(true as any);

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // --- A5: githubLogin — encryption failure ---
  it("githubLogin returns 500 when access token encryption fails", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();

    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: "gho_token" },
      headers: {},
    } as any);
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        id: 123,
        login: "user",
        name: "User",
        avatar_url: "https://img.example/u.png",
      },
    } as any);
    vi.mocked(encrypt).mockImplementation(() => {
      throw new Error("encrypt failed");
    });

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // --- A6: githubLogin — GitHub user profile fetch 5xx ---
  it("githubLogin returns 500 when GitHub user profile fetch fails with server error", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();

    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: "gho_token" },
      headers: {},
    } as any);
    vi.mocked(encrypt).mockReturnValue("encrypted");
    vi.mocked(axios.get).mockRejectedValue({ response: { status: 502 } });
    vi.mocked(axios.isAxiosError).mockReturnValue(true as any);

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // --- A8: githubLogin — new user creation path ---
  it("githubLogin creates new user when github_id is not found", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();
    const newUser = {
      _id: "507f1f77bcf86cd799439011",
      id: "507f1f77bcf86cd799439011",
      username: "new-user",
      name: "New User",
      profile_image_url: "https://img.example/new.png",
    };

    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: "gho_token" },
      headers: {},
    } as any);
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        id: 999,
        login: "new-user",
        name: "New User",
        avatar_url: "https://img.example/new.png",
      },
    } as any);
    vi.mocked(encrypt).mockReturnValue("encrypted");
    vi.mocked(User.findOne).mockResolvedValue(null);
    vi.mocked(User.create).mockResolvedValue(newUser as any);
    vi.mocked(createSessionToken).mockReturnValue("session-token");
    vi.mocked(generateRefreshToken).mockReturnValue("f".repeat(80));
    vi.mocked(addRefreshToken).mockResolvedValue(undefined);

    githubLogin(req, res, next);
    await flushPromises();

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        github_id: "999",
        username: "new-user",
        github_user_token: "encrypted",
      })
    );
    expect(addRefreshToken).toHaveBeenCalledWith(newUser._id, "f".repeat(80));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("New User created"),
      })
    );
  });

  // --- A9: githubLogin — DB findOne failure ---
  it("githubLogin returns 500 when database findOne fails", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();

    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: "gho_token" },
      headers: {},
    } as any);
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        id: 123,
        login: "user",
        name: "User",
        avatar_url: "https://img.example/u.png",
      },
    } as any);
    vi.mocked(encrypt).mockReturnValue("encrypted");
    vi.mocked(User.findOne).mockRejectedValue(new Error("DB connection lost"));

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // --- A10: githubLogin — user save failure ---
  it("githubLogin returns 500 when existing user save fails", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();
    const existingUser = {
      _id: "507f1f77bcf86cd799439011",
      id: "507f1f77bcf86cd799439011",
      username: "user",
      name: "User",
      profile_image_url: "https://img.example/u.png",
      save: vi.fn().mockRejectedValue(new Error("save failed")),
    };

    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: "gho_token" },
      headers: {},
    } as any);
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        id: 123,
        login: "user",
        name: "User",
        avatar_url: "https://img.example/u.png",
      },
    } as any);
    vi.mocked(encrypt).mockReturnValue("encrypted");
    vi.mocked(User.findOne).mockResolvedValue(existingUser as any);

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // --- A11: githubLogin — addRefreshToken failure ---
  it("githubLogin returns 500 when addRefreshToken fails for existing user", async () => {
    const req = makeReq({
      query: { code: "abc123", state: "a".repeat(48) },
      cookies: { oauth_state: "a".repeat(48) },
    });
    const res = makeRes();
    const existingUser = {
      _id: "507f1f77bcf86cd799439011",
      id: "507f1f77bcf86cd799439011",
      username: "user",
      name: "User",
      profile_image_url: "https://img.example/u.png",
      save: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(axios.post).mockResolvedValue({
      data: { access_token: "gho_token" },
      headers: {},
    } as any);
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        id: 123,
        login: "user",
        name: "User",
        avatar_url: "https://img.example/u.png",
      },
    } as any);
    vi.mocked(encrypt).mockReturnValue("encrypted");
    vi.mocked(User.findOne).mockResolvedValue(existingUser as any);
    vi.mocked(createSessionToken).mockReturnValue("session-token");
    vi.mocked(generateRefreshToken).mockReturnValue("f".repeat(80));
    vi.mocked(addRefreshToken).mockRejectedValue(new Error("redis down"));

    githubLogin(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // --- A12: githubLogout — no refresh_token cookie ---
  it("githubLogout succeeds and clears cookies even without refresh_token cookie", async () => {
    const req = makeReq({ cookies: {} });
    const res = makeRes();

    githubLogout(req, res, next);
    await flushPromises();

    expect(revokeRefreshToken).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith(
      "session_token",
      expect.any(Object)
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // --- A13: githubLogout — revokeRefreshToken failure (best-effort) ---
  it("githubLogout succeeds even when revokeRefreshToken fails", async () => {
    const req = makeReq({ cookies: { refresh_token: "a".repeat(80) } });
    const res = makeRes();

    vi.mocked(revokeRefreshToken).mockRejectedValue(new Error("redis down"));

    githubLogout(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.clearCookie).toHaveBeenCalledWith(
      "session_token",
      expect.any(Object)
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.any(Object)
    );
  });

  // --- A14: githubLogout — untrusted origin ---
  it("githubLogout blocks untrusted Origin", async () => {
    const req = makeReq({
      cookies: { refresh_token: "a".repeat(80) },
      get: vi
        .fn()
        .mockImplementation((header: string) =>
          header.toLowerCase() === "origin" ? "https://evil.example" : undefined
        ),
    });
    const res = makeRes();

    githubLogout(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(revokeRefreshToken).not.toHaveBeenCalled();
  });

  // --- A15: refreshTokenHandler — rotateRefreshToken returns null ---
  it("refreshTokenHandler returns 401 and clears cookies when rotateRefreshToken returns null", async () => {
    const req = makeReq({ cookies: { refresh_token: "a".repeat(80) } });
    const res = makeRes();

    vi.mocked(generateRefreshToken).mockReturnValue("b".repeat(80));
    vi.mocked(rotateRefreshToken).mockResolvedValue(null);

    refreshTokenHandler(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.clearCookie).toHaveBeenCalledWith(
      "session_token",
      expect.any(Object)
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.any(Object)
    );
  });

  // --- A16: refreshTokenHandler — rotateRefreshToken throws ---
  it("refreshTokenHandler returns 500 when rotateRefreshToken throws", async () => {
    const req = makeReq({ cookies: { refresh_token: "a".repeat(80) } });
    const res = makeRes();

    vi.mocked(generateRefreshToken).mockReturnValue("b".repeat(80));
    vi.mocked(rotateRefreshToken).mockRejectedValue(new Error("DB gone"));

    refreshTokenHandler(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
