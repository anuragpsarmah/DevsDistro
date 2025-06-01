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

const getProfileInformation = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      const userId = new mongoose.Types.ObjectId(req.user._id);

      try {
        const user = await User.findById(userId);
        if (!user) {
          response(res, 401, "User not found. Log out the user");
          return;
        }

        const responseObj = {
          jobRole: user.job_role,
          location: user.location,
          reviewDescription: user.review_description,
          reviewStar: user.review_stars,
          profileVisibility: user.profile_visibility,
        };

        response(res, 200, "User info fetched successfully", responseObj);
      } catch (error) {
        logger.error("Error fetching user profile information", error);
        throw new ApiError("Internal Server Error", 500, {}, error);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const updateProfileInformation = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
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

      try {
        const user = await User.findById(userId);

        if (!user) {
          response(res, 401, "User not found. Log out the user");
          return;
        }

        user.job_role = job_role;
        user.review_description = review_description;
        user.review_stars = review_stars;
        user.location = location;
        user.profile_visibility = profile_visibility;
        await user.save();

        const siteUserReview = await SiteReview.findOne({
          username: req.user.username,
        });

        if (siteUserReview) {
          siteUserReview.job_role = job_role;
          siteUserReview.review_description = review_description;
          siteUserReview.review_stars = review_stars;
          await siteUserReview.save();
        } else {
          await SiteReview.create({
            username: req.user.username,
            profile_image_url: req.user.profileImageUrl,
            job_role,
            review_description,
            review_stars,
          });
        }

        response(res, 200, "User profile information updated successfully");
      } catch (error) {
        logger.error("Error updating user profile information", error);
        throw new ApiError("Internal Server Error", 500, {}, error);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

const getWalletAddress = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    try {
      const user = await User.findById(userId);
      if (!user) {
        response(res, 401, "User not found. Log out the user");
        return;
      }

      const responseObj = {
        wallet_address: user.wallet_address,
      };

      response(res, 200, "Wallet address fetched successfully", responseObj);
    } catch (error) {
      logger.error("Error fetching wallet address", error);
      throw new ApiError("Internal Server Error", 500, {}, error);
    }
  } else {
    throw new ApiError("Error during validation", 401);
  }
});

const updateWalletAddress = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
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

      try {
        const user = await User.findById(userId);

        if (!user) {
          response(res, 401, "User not found. Log out the user");
          return;
        }

        user.wallet_address = wallet_address;
        await user.save();

        response(
          res,
          200,
          wallet_address
            ? "Wallet address updated successfully"
            : "Wallet address removed successfully"
        );
      } catch (error) {
        logger.error("Error updating wallet address", error);
        throw new ApiError("Internal Server Error", 500, {}, error);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

export {
  getProfileInformation,
  updateProfileInformation,
  getWalletAddress,
  updateWalletAddress,
};
