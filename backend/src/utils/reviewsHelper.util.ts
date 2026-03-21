import mongoose from "mongoose";
import { Review } from "../models/projectReview.model";
import { Project } from "../models/project.model";
import { Purchase } from "../models/purchase.model";
import { Sales } from "../models/sales.model";
import logger from "../logger/logger";
import { tryCatch } from "./tryCatch.util";

export function computeBestSellerBadge(
  avgRating: number,
  totalReviews: number
): string {
  if (totalReviews >= 10 && avgRating >= 4.5) return "Best Seller";
  if (totalReviews >= 5 && avgRating >= 4.0) return "Top Rated";
  if (totalReviews >= 3 && avgRating >= 3.5) return "Rising Seller";
  return "";
}

export async function recalculateProjectAggregates(
  projectObjectId: mongoose.Types.ObjectId
): Promise<void> {
  // Step 1: Recompute avgRating and totalReviews for the project
  const [aggResult, aggError] = await tryCatch(
    Review.aggregate([
      { $match: { projectId: projectObjectId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ])
  );

  if (aggError) {
    logger.error("Failed to aggregate project reviews", aggError);
    return;
  }

  const newAvg =
    aggResult && aggResult.length > 0
      ? Math.round(aggResult[0].avgRating * 10) / 10
      : 0;
  const newTotal =
    aggResult && aggResult.length > 0 ? aggResult[0].totalReviews : 0;

  const [project, projectError] = await tryCatch(
    Project.findByIdAndUpdate(
      projectObjectId,
      { avgRating: newAvg, totalReviews: newTotal },
      { new: true }
    )
      .select("userid avgRating totalReviews")
      .lean()
  );

  if (projectError) {
    logger.error("Failed to update project rating aggregates", projectError);
    return;
  }

  // Step 2: Resolve sellerId, then recompute seller customer_rating and badge
  let sellerId = (project as any)?.userid as
    | mongoose.Types.ObjectId
    | undefined;

  if (!sellerId) {
    const [sellerPurchase, sellerPurchaseError] = await tryCatch(
      Purchase.findOne({ projectId: projectObjectId, status: "CONFIRMED" })
        .select("sellerId")
        .lean()
    );

    if (sellerPurchaseError) {
      logger.error(
        "Failed to resolve seller for rating recomputation",
        sellerPurchaseError
      );
      return;
    }

    sellerId = (sellerPurchase as any)?.sellerId as
      | mongoose.Types.ObjectId
      | undefined;
  }

  if (!sellerId) {
    logger.error("Failed to resolve seller for rating recomputation", {
      projectId: projectObjectId.toString(),
    });
    return;
  }

  const [sellerRatingAgg, sellerRatingAggError] = await tryCatch(
    Purchase.aggregate([
      {
        $match: {
          sellerId,
          status: "CONFIRMED",
        },
      },
      {
        $lookup: {
          from: "reviews",
          let: {
            purchaseProjectId: "$projectId",
            purchaseBuyerId: "$buyerId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$projectId", "$$purchaseProjectId"] },
                    { $eq: ["$userId", "$$purchaseBuyerId"] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                rating: 1,
              },
            },
          ],
          as: "matchedReview",
        },
      },
      { $unwind: "$matchedReview" },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$matchedReview.rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ])
  );

  if (sellerRatingAggError) {
    logger.error(
      "Failed to aggregate seller rating from purchases/reviews",
      sellerRatingAggError
    );
    return;
  }

  let newCustomerRating = 0;
  let totalSellerReviews = 0;

  if (sellerRatingAgg && sellerRatingAgg.length > 0) {
    totalSellerReviews = sellerRatingAgg[0].totalReviews as number;
    const avgRating = sellerRatingAgg[0].avgRating as number;
    newCustomerRating = Math.round(avgRating * 10) / 10;
  }

  const newBestSeller = computeBestSellerBadge(
    newCustomerRating,
    totalSellerReviews
  );

  const [, salesError] = await tryCatch(
    Sales.updateOne(
      { userId: sellerId },
      {
        $set: {
          customer_rating: newCustomerRating,
          best_seller: newBestSeller,
        },
        $setOnInsert: {
          yearly_sales: [],
          total_sales: 0,
          active_projects: 0,
        },
      },
      { upsert: true }
    )
  );

  if (salesError) {
    logger.error("Failed to update seller Sales rating", salesError);
  }
}
