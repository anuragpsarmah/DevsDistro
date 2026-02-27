import { rateLimit } from "express-rate-limit";
import { RequestHandler } from "express";

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many token refresh attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const healthMemoryCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
});

export const toggleProjectListingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
});

export const toggleWalletConnectionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 6,
});

export const projectMediaUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: "Too many upload requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshRepoZipLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many refresh requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const getPrivateReposRefreshLimiter: RequestHandler = (() => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  const WINDOW_MS = 60 * 1000;
  const LIMIT = 5;

  return (req, res, next) => {
    if (req.query.refreshStatus !== "true") {
      return next();
    }

    const key = req.user?._id ?? req.ip ?? "unknown";
    const now = Date.now();

    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k);
      }
    }

    let entry = requestCounts.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + WINDOW_MS };
      requestCounts.set(key, entry);
    }

    if (entry.count >= LIMIT) {
      req.rateLimited = true;
      req.rateLimitMessage = "Too many refresh requests. Cached data fetched.";
    } else {
      entry.count++;
    }

    next();
  };
})();
