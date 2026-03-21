import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import jwt from "jsonwebtoken";

vi.mock("../utils/asyncContext", () => ({
  enrichContext: vi.fn(),
  asyncLocalStorage: { getStore: vi.fn() },
}));

vi.mock("../logger/logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import { enrichContext } from "../utils/asyncContext";

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

describe("sessionValidation middleware", () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "test-jwt-secret";
  });

  it("returns 401 when session cookie is missing", async () => {
    const req = { cookies: {} } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 500 when JWT secret is not configured", async () => {
    delete process.env.JWT_SECRET;
    const req = { cookies: { session_token: "abc" } } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    const req = { cookies: { session_token: "not-a-jwt" } } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token is expired", async () => {
    const token = jwt.sign(
      {
        _id: "507f1f77bcf86cd799439011",
        username: "user",
        name: "User",
        profile_image_url: "https://img.example/u.png",
      },
      process.env.JWT_SECRET as string,
      { expiresIn: -1 }
    );
    const req = { cookies: { session_token: token } } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.user and calls next for a valid token", async () => {
    const token = jwt.sign(
      {
        _id: "507f1f77bcf86cd799439011",
        username: "user",
        name: "User",
        profile_image_url: "https://img.example/u.png",
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );
    const req = { cookies: { session_token: token } } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(req.user).toMatchObject({
      _id: "507f1f77bcf86cd799439011",
      username: "user",
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  // --- C1: Rejects token signed with RS256 (wrong algorithm) ---
  it("returns 401 when token is signed with RS256 instead of HS256", async () => {
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const token = jwt.sign(
      {
        _id: "507f1f77bcf86cd799439011",
        username: "attacker",
        name: "Attacker",
        profile_image_url: "https://img.example/a.png",
      },
      privateKey,
      { algorithm: "RS256", expiresIn: "15m" }
    );
    const req = { cookies: { session_token: token } } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // --- C2: Rejects token signed with wrong HS256 secret ---
  it("returns 401 when token is signed with a different secret", async () => {
    const token = jwt.sign(
      {
        _id: "507f1f77bcf86cd799439011",
        username: "user",
        name: "User",
        profile_image_url: "https://img.example/u.png",
      },
      "wrong-secret",
      { expiresIn: "15m" }
    );
    const req = { cookies: { session_token: token } } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // --- C3: Token with empty claims still passes (no payload validation) ---
  it("calls next for a token with empty claims (no _id or username)", async () => {
    const token = jwt.sign({}, process.env.JWT_SECRET as string, {
      expiresIn: "15m",
    });
    const req = { cookies: { session_token: token } } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user._id).toBeUndefined();
    expect(req.user.username).toBeUndefined();
  });

  // --- C4: Expired token enriches context with "token_expired" ---
  it("enriches context with token_expired auth_status for expired tokens", async () => {
    const token = jwt.sign(
      {
        _id: "507f1f77bcf86cd799439011",
        username: "user",
        name: "User",
        profile_image_url: "https://img.example/u.png",
      },
      process.env.JWT_SECRET as string,
      { expiresIn: -1 }
    );
    const req = { cookies: { session_token: token } } as any;
    const res = makeRes();

    sessionValidation(req, res, next);
    await flushPromises();

    expect(enrichContext).toHaveBeenCalledWith(
      expect.objectContaining({ auth_status: "token_expired" })
    );
  });
});
