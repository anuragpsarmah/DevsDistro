import { Router } from "express";
import {
  checkInstallationStatus,
  handleAppInstallCallback,
} from "../controllers/githubApp.controller";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  generalAuthReadLimiter,
  githubAppCallbackLimiter,
} from "../utils/rateLimitConfig.util";

export const githubAppRouter = Router();

githubAppRouter
  .route("/status")
  .get(generalAuthReadLimiter, sessionValidation, checkInstallationStatus);
githubAppRouter
  .route("/callback")
  .get(githubAppCallbackLimiter, sessionValidation, handleAppInstallCallback);
