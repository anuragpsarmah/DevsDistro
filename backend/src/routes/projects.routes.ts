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
  getMarketplaceProjectDetail,
  getPublicProjectDetail,
} from "../controllers/projects.controller";
import { getPrivateReposFromCache } from "../cache/projects.cache";
import {
  getPrivateReposRefreshLimiter,
  toggleProjectListingLimiter,
  projectMediaUploadLimiter,
  refreshRepoZipLimiter,
  retryRepoZipUploadLimiter,
  deleteProjectListingLimiter,
  validateProjectListingLimiter,
  generalAuthReadLimiter,
  heavyReadLimiter,
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
  .put(
    validateProjectListingLimiter,
    sessionValidation,
    validateMediaUploadAndStoreProject
  );
projectRouter
  .route("/getTotalListedProjects")
  .get(generalAuthReadLimiter, sessionValidation, getTotalListedProjects);
projectRouter
  .route("/getTotalActiveProjects")
  .get(generalAuthReadLimiter, sessionValidation, getTotalActiveProjects);
projectRouter
  .route("/getInitialProjectData")
  .get(generalAuthReadLimiter, sessionValidation, getInitialProjectData);
projectRouter
  .route("/getSpecificProjectData")
  .get(generalAuthReadLimiter, sessionValidation, getSpecificProjectData);
projectRouter
  .route("/toggleProjectListing")
  .patch(toggleProjectListingLimiter, sessionValidation, toggleProjectListing);
projectRouter
  .route("/deleteProjectListing")
  .delete(deleteProjectListingLimiter, sessionValidation, deleteProjectListing);
projectRouter
  .route("/getRepoZipStatus")
  .get(generalAuthReadLimiter, sessionValidation, getRepoZipStatus);
projectRouter
  .route("/retryRepoZipUpload")
  .post(retryRepoZipUploadLimiter, sessionValidation, retryRepoZipUpload);
projectRouter
  .route("/refreshRepoZip")
  .post(refreshRepoZipLimiter, sessionValidation, refreshRepoZip);
projectRouter
  .route("/search")
  .post(heavyReadLimiter, sessionValidation, searchProject);
projectRouter
  .route("/getMarketplaceProjectDetail")
  .get(generalAuthReadLimiter, sessionValidation, getMarketplaceProjectDetail);
projectRouter
  .route("/public/:projectId")
  .get(heavyReadLimiter, getPublicProjectDetail);
