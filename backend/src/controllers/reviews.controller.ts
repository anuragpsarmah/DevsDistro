import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import { SiteReview } from "../models/siteReview.model";
import response from "../utils/response.util";
import ApiError from "../utils/ApiError.util";
import mongoose from "mongoose";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";

const getFeaturedReviews = asyncHandler(async (req: Request, res: Response) => {
  const { FEATURED_REVIEW_ID1, FEATURED_REVIEW_ID2, FEATURED_REVIEW_ID3 } =
    process.env;

  if (!FEATURED_REVIEW_ID1 || !FEATURED_REVIEW_ID2 || !FEATURED_REVIEW_ID3) {
    response(res, 404, "No featured reviews found");
    return;
  }

  const id1 = new mongoose.Types.ObjectId(FEATURED_REVIEW_ID1);
  const id2 = new mongoose.Types.ObjectId(FEATURED_REVIEW_ID2);
  const id3 = new mongoose.Types.ObjectId(FEATURED_REVIEW_ID3);

  const [featuredReviews, error] = await tryCatch(
    SiteReview.find({
      _id: { $in: [id1, id2, id3] },
    })
  );

  if (error) {
    logger.error("Error fetching featured reviews", error);
    throw new ApiError("Something went wrong", 500);
  }

  response(res, 200, "Featured reviews fetched successfully", featuredReviews);
});

export { getFeaturedReviews };
