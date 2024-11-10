import { rateLimit } from "express-rate-limit";

export const citySearchLimiter = rateLimit({
  windowMs: 1000,
  limit: 3,
});

export const healthMemoryCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
});
