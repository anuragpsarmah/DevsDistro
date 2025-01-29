import { rateLimit } from "express-rate-limit";

export const healthMemoryCheckLimiter = rateLimit({
  windowMs: 1000,
  limit: 1,
});

export const toggleProjectListingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
});
