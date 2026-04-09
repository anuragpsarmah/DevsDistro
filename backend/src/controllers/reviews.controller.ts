import { Request, Response } from "express";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.util";
import { SiteReview } from "../models/siteReview.model";
import { Review } from "../models/projectReview.model";
import { Project } from "../models/project.model";
import { Purchase } from "../models/purchase.model";
import response from "../utils/response.util";
import ApiError from "../utils/ApiError.util";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";
import { enrichContext } from "../utils/asyncContext";
import {
  submitReviewSchema,
  updateReviewSchema,
  deleteReviewSchema,
  getProjectReviewsSchema,
  getMyReviewSchema,
} from "../validations/review.validation";
import { recalculateProjectAggregates } from "../utils/reviewsHelper.util";
import {
  reviewsFeaturedConfig,
  reviewsProjectSelect,
  reviewsPurchaseConfig,
  reviewsSortConfig,
  reviewsUserPopulate,
} from "../config/reviews.config";

// GET /api/reviews/getFeaturedReviews
const getFeaturedReviews = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "get_featured_reviews" });

  const [FEATURED_REVIEW_ID1, FEATURED_REVIEW_ID2, FEATURED_REVIEW_ID3] =
    reviewsFeaturedConfig.reviewIds;

  if (!FEATURED_REVIEW_ID1 || !FEATURED_REVIEW_ID2 || !FEATURED_REVIEW_ID3) {
    enrichContext({ outcome: "not_found", reason: "missing_env_config" });
    response(res, 404, "No featured reviews found");
    return;
  }

  const id1 = new mongoose.Types.ObjectId(FEATURED_REVIEW_ID1);
  const id2 = new mongoose.Types.ObjectId(FEATURED_REVIEW_ID2);
  const id3 = new mongoose.Types.ObjectId(FEATURED_REVIEW_ID3);

  enrichContext({
    entity: {
      type: "reviews",
      ids: [id1.toString(), id2.toString(), id3.toString()],
    },
  });

  const dbStartTime = performance.now();
  const [featuredReviews, error] = await tryCatch(
    SiteReview.find({
      _id: { $in: [id1, id2, id3] },
    })
  );
  enrichContext({ db_latency_ms: Math.round(performance.now() - dbStartTime) });

  if (error) {
    enrichContext({
      outcome: "error",
      error: {
        name: "DatabaseError",
        message:
          error instanceof Error ? error.message : "Database query failed",
      },
    });
    logger.error("Failed to fetch featured reviews", error);
    throw new ApiError("Something went wrong", 500);
  }

  enrichContext({
    outcome: "success",
    results_count: featuredReviews?.length || 0,
  });

  response(res, 200, "Featured reviews fetched successfully", featuredReviews);
});

// POST /api/reviews/project
const submitProjectReview = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "submit_project_review" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Unauthorized Access", 401);
    }

    const parseResult = submitReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      enrichContext({ outcome: "validation_failed" });
      response(res, 400, parseResult.error.errors[0].message);
      return;
    }

    const { project_id, rating, review } = parseResult.data;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const projectObjectId = new mongoose.Types.ObjectId(project_id);

    enrichContext({ entity: { type: "review", project_id } });

    const dbStart = performance.now();
    const [project, projectError] = await tryCatch(
      Project.findById(projectObjectId)
        .select(reviewsProjectSelect.submitProjectLookup)
        .lean()
    );
    enrichContext({ db_latency_ms: Math.round(performance.now() - dbStart) });

    if (projectError) {
      logger.error("Failed to fetch project for review", projectError);
      response(res, 500, "Failed to submit review. Try again later.");
      return;
    }

    if (!project) {
      enrichContext({ outcome: "not_found" });
      response(res, 404, "Project not found");
      return;
    }

    if ((project as any).userid.toString() === userId.toString()) {
      enrichContext({ outcome: "validation_failed", reason: "self_review" });
      response(res, 400, "You cannot review your own project");
      return;
    }

    const isFreeProject = (project as any).price <= 0;

    if (!isFreeProject) {
      const [purchase, purchaseError] = await tryCatch(
        Purchase.findOne({
          buyerId: userId,
          projectId: projectObjectId,
          status: reviewsPurchaseConfig.confirmedStatus,
        })
          .select("_id")
          .lean()
      );

      if (purchaseError) {
        logger.error("Failed to verify purchase for review", purchaseError);
        response(res, 500, "Failed to submit review. Try again later.");
        return;
      }

      if (!purchase) {
        enrichContext({ outcome: "forbidden", reason: "not_purchased" });
        response(
          res,
          403,
          "You must purchase this project before leaving a review"
        );
        return;
      }
    }

    const [savedReview, saveError] = await tryCatch(
      Review.create({
        userId,
        projectId: projectObjectId,
        rating,
        review: review ?? "",
      })
    );

    if (saveError || !savedReview) {
      if ((saveError as any)?.code === 11000) {
        enrichContext({
          outcome: "validation_failed",
          reason: "review_exists_race",
        });
        response(
          res,
          409,
          "You have already submitted a review for this project"
        );
        return;
      }
      logger.error("Failed to save review", saveError);
      response(res, 500, "Failed to save review. Try again later.");
      return;
    }

    await recalculateProjectAggregates(projectObjectId);

    enrichContext({ outcome: "success" });
    response(res, 201, "Review submitted successfully", {
      review: savedReview,
    });
  }
);

// PUT /api/reviews/project
const updateProjectReview = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "update_project_review" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Unauthorized Access", 401);
    }

    const parseResult = updateReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      enrichContext({ outcome: "validation_failed" });
      response(res, 400, parseResult.error.errors[0].message);
      return;
    }

    const { project_id, rating, review } = parseResult.data;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const projectObjectId = new mongoose.Types.ObjectId(project_id);

    enrichContext({ entity: { type: "review", project_id } });

    const [projectForUpdate, projectForUpdateError] = await tryCatch(
      Project.findById(projectObjectId)
        .select(reviewsProjectSelect.updateProjectLookup)
        .lean()
    );

    if (projectForUpdateError) {
      logger.error(
        "Failed to fetch project for review update",
        projectForUpdateError
      );
      response(res, 500, "Failed to update review. Try again later.");
      return;
    }

    if (!projectForUpdate) {
      response(res, 404, "Project not found");
      return;
    }

    const isFreeProject = (projectForUpdate as any).price <= 0;

    if (!isFreeProject) {
      const [purchase, purchaseError] = await tryCatch(
        Purchase.findOne({
          buyerId: userId,
          projectId: projectObjectId,
          status: reviewsPurchaseConfig.confirmedStatus,
        })
          .select("_id")
          .lean()
      );

      if (purchaseError) {
        logger.error(
          "Failed to verify purchase for review update",
          purchaseError
        );
        response(res, 500, "Failed to update review. Try again later.");
        return;
      }

      if (!purchase) {
        enrichContext({ outcome: "forbidden", reason: "not_purchased" });
        response(
          res,
          403,
          "You must purchase this project before updating a review"
        );
        return;
      }
    }

    const [savedReview, saveError] = await tryCatch(
      Review.findOneAndUpdate(
        { userId, projectId: projectObjectId },
        { $set: { rating, review: review ?? "" } },
        { new: true, runValidators: true }
      ).lean()
    );

    if (saveError) {
      logger.error("Failed to update review", saveError);
      response(res, 500, "Failed to update review. Try again later.");
      return;
    }

    if (!savedReview) {
      enrichContext({ outcome: "not_found", reason: "review_missing" });
      response(res, 404, "No existing review found for this project");
      return;
    }

    await recalculateProjectAggregates(projectObjectId);

    enrichContext({ outcome: "success" });
    response(res, 200, "Review updated successfully", { review: savedReview });
  }
);

// DELETE /api/reviews/project
const deleteProjectReview = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "delete_project_review" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Unauthorized Access", 401);
    }

    const parseResult = deleteReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      enrichContext({ outcome: "validation_failed" });
      response(res, 400, parseResult.error.errors[0].message);
      return;
    }

    const { project_id } = parseResult.data;
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const projectObjectId = new mongoose.Types.ObjectId(project_id);

    enrichContext({ entity: { type: "review", project_id } });

    const dbStart = performance.now();
    const [deletedReview, deleteError] = await tryCatch(
      Review.findOneAndDelete({ userId, projectId: projectObjectId }).lean()
    );
    enrichContext({ db_latency_ms: Math.round(performance.now() - dbStart) });

    if (deleteError) {
      logger.error("Failed to delete review", deleteError);
      response(res, 500, "Failed to delete review. Try again later.");
      return;
    }

    if (!deletedReview) {
      enrichContext({ outcome: "not_found" });
      response(res, 404, "Review not found");
      return;
    }

    await recalculateProjectAggregates(projectObjectId);

    enrichContext({ outcome: "success" });
    response(res, 200, "Review deleted successfully");
  }
);

// GET /api/reviews/project
const getProjectReviews = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "get_project_reviews" });

  const parseResult = getProjectReviewsSchema.safeParse(req.query);
  if (!parseResult.success) {
    enrichContext({ outcome: "validation_failed" });
    response(res, 400, parseResult.error.errors[0].message);
    return;
  }

  const { project_id, limit, offset } = parseResult.data;
  const projectObjectId = new mongoose.Types.ObjectId(project_id);

  enrichContext({ entity: { type: "review", project_id } });

  const dbStart = performance.now();
  const [[reviews, reviewsError], [totalCount, countError]] = await Promise.all(
    [
      tryCatch(
        Review.find({ projectId: projectObjectId })
          .populate({ ...reviewsUserPopulate })
          .sort({ ...reviewsSortConfig.newestFirst })
          .skip(offset)
          .limit(limit)
          .lean()
      ),
      tryCatch(Review.countDocuments({ projectId: projectObjectId })),
    ]
  );
  enrichContext({ db_latency_ms: Math.round(performance.now() - dbStart) });

  if (reviewsError || countError) {
    logger.error("Failed to fetch project reviews", reviewsError || countError);
    response(res, 500, "Failed to fetch reviews. Try again later.");
    return;
  }

  enrichContext({ outcome: "success", results_count: reviews?.length ?? 0 });
  response(res, 200, "Reviews fetched successfully", {
    reviews: reviews ?? [],
    pagination: {
      total: totalCount ?? 0,
      limit,
      offset,
      hasNextPage: offset + limit < (totalCount ?? 0),
    },
  });
});

// GET /api/reviews/my-review
const getMyProjectReview = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "get_my_project_review" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Unauthorized Access", 401);
  }

  const parseResult = getMyReviewSchema.safeParse(req.query);
  if (!parseResult.success) {
    enrichContext({ outcome: "validation_failed" });
    response(res, 400, parseResult.error.errors[0].message);
    return;
  }

  const { project_id } = parseResult.data;
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const projectObjectId = new mongoose.Types.ObjectId(project_id);

  enrichContext({ entity: { type: "review", project_id } });

  const dbStart = performance.now();
  const [review, error] = await tryCatch(
    Review.findOne({ userId, projectId: projectObjectId })
      .populate({ ...reviewsUserPopulate })
      .lean()
  );
  enrichContext({ db_latency_ms: Math.round(performance.now() - dbStart) });

  if (error) {
    logger.error("Failed to fetch user review", error);
    response(res, 500, "Failed to fetch review. Try again later.");
    return;
  }

  enrichContext({ outcome: "success" });
  response(res, 200, "Review fetched successfully", { review: review ?? null });
});

export {
  getFeaturedReviews,
  submitProjectReview,
  updateProjectReview,
  deleteProjectReview,
  getProjectReviews,
  getMyProjectReview,
};
