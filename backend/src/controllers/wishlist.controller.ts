import { Request, Response } from "express";
import mongoose from "mongoose";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import response from "../utils/response.util";
import { User } from "../models/user.model";
import { Project } from "../models/project.model";
import { Purchase } from "../models/purchase.model";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";
import { enrichContext } from "../utils/asyncContext";

const WISHLIST_PROJECT_SELECT =
  "title description project_type tech_stack price avgRating totalReviews live_link createdAt project_images";

const WISHLIST_SELLER_POPULATE = {
  path: "userid",
  select: "username name profile_image_url -_id",
};

// POST /api/wishlist/toggle
const toggleWishlist = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "toggle_wishlist" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  const { project_id } = req.body;

  if (
    !project_id ||
    typeof project_id !== "string" ||
    !mongoose.Types.ObjectId.isValid(project_id)
  ) {
    enrichContext({
      outcome: "validation_failed",
      reason: "invalid_project_id",
    });
    response(res, 400, "Valid project_id is required");
    return;
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);
  const projectObjectId = new mongoose.Types.ObjectId(project_id);

  enrichContext({ entity: { type: "wishlist", id: userId.toString() } });

  const [userData, userError] = await tryCatch(
    User.findById(userId).select("wishlist").lean()
  );

  if (userError || !userData) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to fetch user wishlist", userError);
    response(res, 500, "Failed to update wishlist. Try again later.");
    return;
  }

  const wishlistIds = (userData.wishlist as mongoose.Types.ObjectId[]) ?? [];
  const isCurrentlyWishlisted = wishlistIds.some((id) =>
    id.equals(projectObjectId)
  );

  // Only allow wishlisting if the project is not already purchased.
  if (!isCurrentlyWishlisted) {
    const [existingPurchase, purchaseCheckError] = await tryCatch(
      Purchase.findOne({
        buyerId: userId,
        projectId: projectObjectId,
        status: "CONFIRMED",
      })
        .select("_id")
        .lean()
    );

    if (purchaseCheckError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error(
        "Failed to check purchase status for wishlist",
        purchaseCheckError
      );
      response(res, 500, "Failed to update wishlist. Try again later.");
      return;
    }

    if (existingPurchase) {
      enrichContext({
        outcome: "validation_failed",
        reason: "already_purchased",
      });
      response(res, 409, "You already own this project");
      return;
    }
  }

  const updateOp = isCurrentlyWishlisted
    ? { $pull: { wishlist: projectObjectId } }
    : { $addToSet: { wishlist: projectObjectId } };

  const [, updateError] = await tryCatch(
    User.updateOne({ _id: userId }, updateOp)
  );

  if (updateError) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to update wishlist", updateError);
    response(res, 500, "Failed to update wishlist. Try again later.");
    return;
  }

  const isWishlisted = !isCurrentlyWishlisted;
  enrichContext({ outcome: "success", is_wishlisted: isWishlisted });
  response(
    res,
    200,
    isWishlisted ? "Added to wishlist" : "Removed from wishlist",
    {
      isWishlisted,
    }
  );
});

// GET /api/wishlist/getWishlist
const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "get_wishlist" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);
  enrichContext({ entity: { type: "wishlist", id: userId.toString() } });

  // Parse pagination only when limit is provided.
  const rawLimit = req.query.limit;
  const rawOffset = req.query.offset;
  const limit = rawLimit
    ? Math.min(Math.max(parseInt(rawLimit as string, 10) || 12, 1), 50)
    : null;
  const offset = rawOffset
    ? Math.max(parseInt(rawOffset as string, 10) || 0, 0)
    : 0;

  const [userData, userError] = await tryCatch(
    User.findById(userId).select("wishlist").lean()
  );

  if (userError || !userData) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to fetch wishlist", userError);
    response(res, 500, "Failed to fetch wishlist. Try again later.");
    return;
  }

  const wishlistIds = (userData.wishlist as mongoose.Types.ObjectId[]) ?? [];

  if (wishlistIds.length === 0) {
    enrichContext({ outcome: "success", wishlist_count: 0 });
    if (limit !== null) {
      response(res, 200, "Wishlist fetched successfully", {
        projects: [],
        pagination: {
          totalCount: 0,
          currentPage: 1,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
          limit,
          offset,
        },
      });
    } else {
      response(res, 200, "Wishlist fetched successfully", { projects: [] });
    }
    return;
  }

  const matchQuery = {
    _id: { $in: wishlistIds },
    isActive: true,
    github_access_revoked: false,
    repo_zip_status: "SUCCESS",
  };

  if (limit !== null) {
    // Paginated response.
    const [[projects, fetchError], [totalCount, countError]] =
      await Promise.all([
        tryCatch(
          Project.find(matchQuery)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .select(WISHLIST_PROJECT_SELECT)
            .populate(WISHLIST_SELLER_POPULATE)
            .lean()
        ),
        tryCatch(Project.countDocuments(matchQuery)),
      ]);

    if (fetchError || countError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error(
        "Failed to fetch paginated wishlist",
        fetchError ?? countError
      );
      response(res, 500, "Failed to fetch wishlist. Try again later.");
      return;
    }

    const mappedProjects = (projects ?? []).map((p: any) => ({
      ...p,
      project_images: p.project_images?.[0] ?? "",
    }));

    const total = totalCount ?? 0;
    const hasNextPage = offset + limit < total;
    const hasPrevPage = offset > 0;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    const currentPage = Math.floor(offset / limit) + 1;

    enrichContext({ outcome: "success", wishlist_count: total });
    response(res, 200, "Wishlist fetched successfully", {
      projects: mappedProjects,
      pagination: {
        totalCount: total,
        currentPage,
        totalPages,
        hasNextPage,
        hasPrevPage,
        limit,
        offset,
      },
    });
  } else {
    // Backward-compatible non-paginated response.
    const [projects, fetchError] = await tryCatch(
      Project.find(matchQuery)
        .select(WISHLIST_PROJECT_SELECT)
        .populate(WISHLIST_SELLER_POPULATE)
        .lean()
    );

    if (fetchError) {
      enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
      logger.error("Failed to fetch wishlist", fetchError);
      response(res, 500, "Failed to fetch wishlist. Try again later.");
      return;
    }

    const mappedProjects = (projects ?? []).map((p: any) => ({
      ...p,
      project_images: p.project_images?.[0] ?? "",
    }));

    enrichContext({
      outcome: "success",
      wishlist_count: mappedProjects.length,
    });
    response(res, 200, "Wishlist fetched successfully", {
      projects: mappedProjects,
    });
  }
});

// GET /api/wishlist/count
const getWishlistCount = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "get_wishlist_count" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);
  enrichContext({ entity: { type: "wishlist", id: userId.toString() } });

  const [userData, userError] = await tryCatch(
    User.findById(userId).select("wishlist").lean()
  );

  if (userError || !userData) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to fetch wishlist for count", userError);
    response(res, 500, "Failed to fetch wishlist count. Try again later.");
    return;
  }

  const wishlistIds = (userData.wishlist as mongoose.Types.ObjectId[]) ?? [];

  if (wishlistIds.length === 0) {
    enrichContext({ outcome: "success", wishlist_count: 0 });
    response(res, 200, "Wishlist count fetched successfully", { count: 0 });
    return;
  }

  const [count, countError] = await tryCatch(
    Project.countDocuments({
      _id: { $in: wishlistIds },
      isActive: true,
      github_access_revoked: false,
      repo_zip_status: "SUCCESS",
    })
  );

  if (countError) {
    enrichContext({ outcome: "error", error: { name: "DatabaseError" } });
    logger.error("Failed to count wishlist projects", countError);
    response(res, 500, "Failed to fetch wishlist count. Try again later.");
    return;
  }

  const total = count ?? 0;
  enrichContext({ outcome: "success", wishlist_count: total });
  response(res, 200, "Wishlist count fetched successfully", { count: total });
});

export { toggleWishlist, getWishlist, getWishlistCount };
