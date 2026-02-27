import { Router } from "express";
import {
  githubLogin,
  authValidation,
  githubLogout,
  refreshTokenHandler,
} from "../controllers/auth.controller";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import { refreshRateLimiter } from "../utils/rateLimitConfig.util";

export const authRouter = Router();

authRouter.route("/githubLogin").get(githubLogin);
authRouter.route("/authValidation").get(sessionValidation, authValidation);
authRouter.route("/githubLogout").get(githubLogout);
authRouter.route("/refresh").post(refreshRateLimiter, refreshTokenHandler);
