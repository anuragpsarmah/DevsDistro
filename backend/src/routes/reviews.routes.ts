import { Router } from "express";
import { sessionValidation } from "../middlewares/sessionValidation.middlewares";
import {
  submitReviewLimiter,
  deleteReviewLimiter,
  getReviewsLimiter,
  featuredReviewsLimiter,
  generalAuthReadLimiter,
} from "../utils/rateLimitConfig.util";
import {
  getFeaturedReviews,
  submitProjectReview,
  updateProjectReview,
  deleteProjectReview,
  getProjectReviews,
  getMyProjectReview,
} from "../controllers/reviews.controller";

export const reviewRouter = Router();

reviewRouter
  .route("/getFeaturedReviews")
  .get(featuredReviewsLimiter, getFeaturedReviews);

reviewRouter
  .route("/project")
  .post(submitReviewLimiter, sessionValidation, submitProjectReview)
  .put(submitReviewLimiter, sessionValidation, updateProjectReview)
  .delete(deleteReviewLimiter, sessionValidation, deleteProjectReview)
  .get(getReviewsLimiter, getProjectReviews);
reviewRouter
  .route("/my-review")
  .get(generalAuthReadLimiter, sessionValidation, getMyProjectReview);
