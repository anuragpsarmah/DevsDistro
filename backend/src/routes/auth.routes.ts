import { Router } from "express";
import {
  githubLoginStart,
  githubLogin,
  authValidation,
  githubLogout,
  refreshTokenHandler,
  deleteAccount,
} from "../controllers/auth.controller";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  refreshRateLimiter,
  deleteAccountRateLimiter,
  githubOAuthLimiter,
  logoutLimiter,
  generalAuthReadLimiter,
} from "../utils/rateLimitConfig.util";

export const authRouter = Router();

authRouter.route("/githubLoginStart").get(githubOAuthLimiter, githubLoginStart);
authRouter.route("/githubLogin").get(githubOAuthLimiter, githubLogin);
authRouter
  .route("/authValidation")
  .get(generalAuthReadLimiter, sessionValidation, authValidation);
authRouter.route("/githubLogout").post(logoutLimiter, githubLogout);
authRouter.route("/refresh").post(refreshRateLimiter, refreshTokenHandler);
authRouter
  .route("/deleteAccount")
  .delete(deleteAccountRateLimiter, sessionValidation, deleteAccount);
