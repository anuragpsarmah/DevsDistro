import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import { User } from "../models/user.model";
import response from "../utils/response.util";
import { SiteReview } from "../models/siteReview.model";
import mongoose from "mongoose";
import {
  profileInformationSchema,
  walletAddressSchema,
} from "../validations/profile.validation";
import logger from "../logger/logger";
import { tryCatch } from "../utils/tryCatch.util";

const getProfileInformation = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError("Error during validation", 401);

    const userId = new mongoose.Types.ObjectId(req.user._id);

    const [user, findError] = await tryCatch(User.findById(userId));

    if (findError) {
      logger.error("Error fetching user profile information:", findError);
      throw new ApiError("Internal Server Error", 500, {}, findError);
    }

    if (!user) {
      response(res, 401, "User not found. Unauthorized access.");
      return;
    }

    const responseObj = {
      job_role: user.job_role,
      location: user.location,
      review_description: user.review_description,
      review_stars: user.review_stars,
      profile_visibility: user.profile_visibility,
    };

    response(res, 200, "User info fetched successfully", responseObj);
  }
);

const updateProfileInformation = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Error during validation", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const {
      job_role,
      review_description,
      review_stars,
      location,
      profile_visibility,
    } = req.body;

    const result = profileInformationSchema.safeParse({
      job_role,
      review_description,
      review_stars,
      location,
      profile_visibility,
    });

    if (!result.success) {
      response(
        res,
        400,
        "Payload failed validation",
        {},
        result.error.errors[0].message
      );
      return;
    }

    const [user, userFindError] = await tryCatch(User.findById(userId));

    if (userFindError) {
      logger.error("Error updating user profile information", userFindError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (!user) {
      response(res, 401, "User not found. Unauthorized access.");
      return;
    }

    Object.assign(user, {
      job_role,
      review_description,
      review_stars,
      location,
      profile_visibility,
    });

    const [, saveUserError] = await tryCatch(user.save());
    if (saveUserError) {
      logger.error("Error updating user profile information", saveUserError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (!review_description || !review_stars) {
      response(res, 200, "User profile information updated successfully.");
      return;
    }

    const [siteUserReview, findReviewError] = await tryCatch(
      SiteReview.findOne({
        username: req.user.username,
      })
    );

    if (findReviewError) {
      logger.error("Error updating user profile information", findReviewError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (siteUserReview) {
      Object.assign(siteUserReview, {
        username: req.user.username,
        profile_image_url: req.user.profile_image_url,
        job_role,
        review_description,
        review_stars,
      });

      const [, saveReviewError] = await tryCatch(siteUserReview.save());
      if (saveReviewError) {
        logger.error(
          "Error updating user profile information",
          saveReviewError
        );
        throw new ApiError("Internal Server Error", 500);
      }
    } else {
      const [, newReviewError] = await tryCatch(
        SiteReview.create({
          username: req.user.username,
          profile_image_url: req.user.profile_image_url,
          job_role,
          review_description,
          review_stars,
        })
      );

      if (newReviewError) {
        logger.error("Error updating user profile information", newReviewError);
        throw new ApiError("Internal Server Error", 500);
      }
    }

    response(res, 200, "User profile information updated successfully.");
  }
);

const getWalletAddress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError("Error during validation", 401);
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);

  const [user, findUserError] = await tryCatch(User.findById(userId));

  if (findUserError) {
    logger.error("Error fetching wallet address", findUserError);
    throw new ApiError("Internal Server Error", 500);
  }

  if (!user) {
    response(res, 401, "User not found. Unauthorized access.");
    return;
  }

  const responseObj = {
    wallet_address: user.wallet_address,
  };

  response(res, 200, "Wallet address fetched successfully", responseObj);
});

const updateWalletAddress = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new ApiError("Error during validation", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { wallet_address } = req.body;

    const result = walletAddressSchema.safeParse(req.body);
    if (!result.success) {
      response(
        res,
        400,
        "Payload failed validation",
        {},
        result.error.errors[0].message
      );
      return;
    }

    const [updatedUser, updateError] = await tryCatch(
      User.findByIdAndUpdate(userId, { wallet_address }, { new: true })
    );

    if (updateError) {
      logger.error("Error updating wallet address", updateError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (!updatedUser) {
      response(res, 401, "User not found. Unauthorized access.");
      return;
    }

    response(
      res,
      200,
      wallet_address
        ? "Wallet address updated successfully"
        : "Wallet address removed successfully"
    );
  }
);

export {
  getProfileInformation,
  updateProfileInformation,
  getWalletAddress,
  updateWalletAddress,
};
