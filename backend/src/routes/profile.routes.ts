import { Router } from "express";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  getProfileInformation,
  updateProfileInformation,
} from "../controllers/userProfile.controller";

export const profileRouter = Router();

profileRouter
  .route("/getProfileInformation")
  .get(sessionValidation, getProfileInformation);
profileRouter
  .route("/updateProfileInformation")
  .put(sessionValidation, updateProfileInformation);
