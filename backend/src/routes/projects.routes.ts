import { Router } from "express";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  getPrivateRepos,
  getPreSignedUrlForProjectMediaUpload,
  validateMediaUploadAndStoreProject,
  getTotalListedProjects,
  getInitialProjectData,
  toggleProjectListing,
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
projectRouter
  .route("/getTotalListedProjects")
  .get(sessionValidation, getTotalListedProjects);
projectRouter
  .route("/getInitialProjectData")
  .get(sessionValidation, getInitialProjectData);
projectRouter
  .route("/toggleProjectListing")
  .patch(sessionValidation, toggleProjectListing);
