import { rateLimit } from "express-rate-limit";
import { RequestHandler } from "express";

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  message: "Too many requests. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const githubOAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many OAuth attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const logoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many logout attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalAuthReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  message: "Too many requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const heavyReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 45,
  message: "Too many requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const validateProjectListingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many project listing requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const wishlistToggleLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  message: "Too many wishlist requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const githubAppCallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many GitHub App callback attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  message: "Too many webhook requests.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const featuredReviewsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too many token refresh attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const healthMemoryCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
});

export const toggleProjectListingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
});

export const toggleWalletConnectionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
});

export const projectMediaUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
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

export const retryRepoZipUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many retry requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const deleteProjectListingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many deletion requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const initiatePurchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many purchase initiation attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const confirmPurchaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: "Too many purchase confirmation attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: "Too many download requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const receiptLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many receipt requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const submitReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Too many review submissions. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const deleteReviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: "Too many review deletions. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const getReviewsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  message: "Too many requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const updateProfileLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: "Too many profile update requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const deleteAccountRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  message: "Too many account deletion attempts. Please try again later.",
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
