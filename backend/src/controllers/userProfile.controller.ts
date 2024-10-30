import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import { User } from "../models/user.model";
import response from "../utils/response.util";

const getProfileInformation = asyncHandler(
  async (req: Request, res: Response) => {
    if (req.user) {
      try {
        const user = await User.findOne({ username: req.user.username });
        if (!user) {
          response(
            res,
            401,
            "User not found in token payload. Log out the user"
          );
          return;
        }

        response(res, 200, "User info fetched successfully", {
          username: req.user.username,
          name: req.user.name,
          profileImageUrl: req.user.profileImageUrl,
          jobRole: user.job_role,
          reviewDescription: user.review_description,
          reviewStart: user.review_stars,
        });
      } catch (error) {
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
      const { job_role, review_description, review_stars } = req.body;

      try {
        const user = await User.findOne({ username: req.user.username });

        if (!user) {
          response(
            res,
            401,
            "User not found in token payload. Log out the user"
          );
          return;
        }

        user.job_role = job_role;
        user.review_description = review_description;
        user.review_stars = review_stars;
        await user.save();

        response(res, 200, "User profile information updated successfully");
      } catch (error) {
        throw new ApiError("Internal Server Error", 500, {}, error);
      }
    } else {
      throw new ApiError("Error during validation", 401);
    }
  }
);

export { getProfileInformation, updateProfileInformation };
