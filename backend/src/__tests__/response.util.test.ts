import { describe, expect, it, vi } from "vitest";
import response from "../utils/response.util";
import { REFRESH_TOKEN_DURATION_MS } from "../config/token.config";

const makeRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" };

describe("response util", () => {
  // --- E1: Sets session_token cookie when provided ---
  it("sets session_token cookie when session_token is provided", () => {
    const res = makeRes();

    response(res, 200, "ok", {}, {}, false, "my-session-token", "");

    expect(res.cookie).toHaveBeenCalledWith(
      "session_token",
      "my-session-token",
      expect.objectContaining(cookieOptions)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "ok", data: {}, error: {} })
    );
  });

  // --- E2: Sets refresh_token cookie with maxAge ---
  it("sets refresh_token cookie with maxAge when refresh_token is provided", () => {
    const res = makeRes();

    response(res, 200, "ok", {}, {}, false, "", "my-refresh-token");

    expect(res.cookie).toHaveBeenCalledWith(
      "refresh_token",
      "my-refresh-token",
      expect.objectContaining({
        ...cookieOptions,
        maxAge: REFRESH_TOKEN_DURATION_MS,
      })
    );
  });

  // --- E3: Clears session_token on clearCookieFlag=true ---
  it("clears session_token cookie when clearCookieFlag is true", () => {
    const res = makeRes();

    response(res, 200, "ok", {}, {}, true, "", "", false);

    expect(res.clearCookie).toHaveBeenCalledWith(
      "session_token",
      expect.objectContaining(cookieOptions)
    );
  });

  // --- E4: Clears both cookies when clearCookieFlag + clearRefreshCookie ---
  it("clears both session_token and refresh_token when both flags are true", () => {
    const res = makeRes();

    response(res, 200, "ok", {}, {}, true, "", "", true);

    expect(res.clearCookie).toHaveBeenCalledWith(
      "session_token",
      expect.objectContaining(cookieOptions)
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.objectContaining(cookieOptions)
    );
  });

  // --- E5: Only clears session (not refresh) on clearCookieFlag alone ---
  it("only clears session_token when clearCookieFlag=true but clearRefreshCookie=false", () => {
    const res = makeRes();

    response(res, 200, "ok", {}, {}, true, "", "", false);

    expect(res.clearCookie).toHaveBeenCalledTimes(1);
    expect(res.clearCookie).toHaveBeenCalledWith(
      "session_token",
      expect.objectContaining(cookieOptions)
    );
  });

  // --- E6: Returns correct status code and JSON body ---
  it("returns correct status code and structured JSON body", () => {
    const res = makeRes();

    response(res, 404, "Not found", { id: 1 }, { detail: "missing" });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Not found",
      data: { id: 1 },
      error: { detail: "missing" },
    });
  });

  // --- E7: Does not set cookies when tokens are empty strings ---
  it("does not set any cookies when both token strings are empty", () => {
    const res = makeRes();

    response(res, 200, "ok", {}, {}, false, "", "");

    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });
});
