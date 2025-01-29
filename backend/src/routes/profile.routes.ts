import { Router } from "express";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  getProfileInformation,
  updateProfileInformation,
} from "../controllers/profile.controller";

export const profileRouter = Router();

profileRouter
  .route("/getProfileInformation")
  .get(
    sessionValidation,
    getProfileInformation
  );
profileRouter
  .route("/updateProfileInformation")
  .put(sessionValidation, updateProfileInformation);
