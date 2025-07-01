import { rateLimit } from "express-rate-limit";
import { RequestHandler } from "express";

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

export const getPrivateReposRefreshLimiter: RequestHandler = (() => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();
  const WINDOW_MS = 60 * 1000;
  const LIMIT = 1;

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
