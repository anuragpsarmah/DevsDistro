import { Router } from "express";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  getProfileInformation,
  getWalletAddress,
  updateProfileInformation,
  updateWalletAddress,
} from "../controllers/profile.controller";
import { toggleWalletConnectionLimiter } from "../utils/rateLimitConfig.util";

export const profileRouter = Router();

profileRouter
  .route("/getProfileInformation")
  .get(sessionValidation, getProfileInformation);
profileRouter
  .route("/updateProfileInformation")
  .put(sessionValidation, updateProfileInformation);
profileRouter
  .route("/getWalletAddress")
  .get(sessionValidation, getWalletAddress);
profileRouter
  .route("/updateWalletAddress")
  .put(toggleWalletConnectionLimiter, sessionValidation, updateWalletAddress);
