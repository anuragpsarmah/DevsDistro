import { Router } from "express";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  getPrivateRepos,
  getPreSignedUrlForProjectMediaUpload,
  validateMediaUploadAndStoreProject,
  getTotalListedProjects,
  getInitialProjectData,
  toggleProjectListing,
  getSpecificProjectData,
  deleteProjectListing,
  getTotalActiveProjects,
  getRepoZipStatus,
  retryRepoZipUpload,
  refreshRepoZip,
  searchProject,
} from "../controllers/projects.controller";
import { getPrivateReposFromCache } from "../cache/projects.cache";
import {
  getPrivateReposRefreshLimiter,
  toggleProjectListingLimiter,
  projectMediaUploadLimiter,
  refreshRepoZipLimiter,
} from "../utils/rateLimitConfig.util";

export const projectRouter = Router();

projectRouter
  .route("/getPrivateRepos")
  .get(
    sessionValidation,
    getPrivateReposRefreshLimiter,
    getPrivateReposFromCache,
    getPrivateRepos
  );
projectRouter
  .route("/getPreSignedUrlForProjectMediaUpload")
  .post(
    projectMediaUploadLimiter,
    sessionValidation,
    getPreSignedUrlForProjectMediaUpload
  );
projectRouter
  .route("/validateMediaUploadAndStoreProject")
  .put(sessionValidation, validateMediaUploadAndStoreProject);
projectRouter
  .route("/getTotalListedProjects")
  .get(sessionValidation, getTotalListedProjects);
projectRouter
  .route("/getTotalActiveProjects")
  .get(sessionValidation, getTotalActiveProjects);
projectRouter
  .route("/getInitialProjectData")
  .get(sessionValidation, getInitialProjectData);
projectRouter
  .route("/getSpecificProjectData")
  .get(sessionValidation, getSpecificProjectData);
projectRouter
  .route("/toggleProjectListing")
  .patch(toggleProjectListingLimiter, sessionValidation, toggleProjectListing);
projectRouter
  .route("/deleteProjectListing")
  .delete(sessionValidation, deleteProjectListing);
projectRouter
  .route("/getRepoZipStatus")
  .get(sessionValidation, getRepoZipStatus);
projectRouter
  .route("/retryRepoZipUpload")
  .post(sessionValidation, retryRepoZipUpload);
projectRouter
  .route("/refreshRepoZip")
  .post(refreshRepoZipLimiter, sessionValidation, refreshRepoZip);
projectRouter.route("/search").post(sessionValidation, searchProject);
