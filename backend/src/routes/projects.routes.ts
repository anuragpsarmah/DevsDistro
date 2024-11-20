import { Router } from "express";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  getPrivateRepos,
  getPreSignedUrlForProjectMediaUpload,
  validateMediaUploadAndStoreProject,
} from "../controllers/projects.controller";
import { getPrivateReposFromCache } from "../cache/projects.cache";

export const projectRouter = Router();

projectRouter
  .route("/getPrivateRepos")
  .get(sessionValidation, getPrivateReposFromCache, getPrivateRepos);
projectRouter
  .route("/getPreSignedUrlForProjectMediaUpload")
  .post(sessionValidation, getPreSignedUrlForProjectMediaUpload);
projectRouter
  .route("/validateMediaUploadAndStoreProject")
  .put(sessionValidation, validateMediaUploadAndStoreProject);
