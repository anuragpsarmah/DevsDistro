import { rateLimit } from "express-rate-limit";
import { Request } from "express";

export const healthMemoryCheckLimiter = rateLimit({
  windowMs: 1000,
  limit: 1,
});

export const toggleProjectListingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
});

export const getPrivateReposRefreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 2,
  keyGenerator: (req: Request) => req.user?._id ?? req.ip ?? "unknown",
  skip: (req: Request) => {
    return req.query.refreshStatus !== "true";
  },
  message: {
    error: "Too many refresh requests, please try again later.",
  },
});
