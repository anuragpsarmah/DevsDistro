import { Request, Response } from "express";
import { User } from "../models/user.model";
import { encrypt } from "../utils/encryption.util";
import asyncHandler from "../utils/asyncHandler.util";
import response from "../utils/response.util";
import ApiError from "../utils/ApiError.util";
import jwt from "jsonwebtoken";
import axios from "axios";
import mongoose from "mongoose";
import logger from "../logger/logger";
import { githubCodeSchema } from "../validations/auth.validation";
import { tryCatch } from "../utils/tryCatch.util";

const createSessionToken = (
  userid: mongoose.Types.ObjectId,
  username: string,
  name: string,
  profile_image_url: string
) => {
  const session_token = jwt.sign(
    { _id: userid, username, name, profile_image_url },
    process.env.JWT_SECRET as string,
    { expiresIn: "3d" }
  );

  return session_token;
};

const githubLogin = asyncHandler(async (req: Request, res: Response) => {
  const result = githubCodeSchema.safeParse(req.query);
  if (!result.success) {
    response(
      res,
      400,
      "Query validation failed",
      {},
      result.error.errors[0].message
    );
    return;
  }
  const { code } = result.data;
  const {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    ENCRYPTION_KEY_32,
    ENCRYPTION_IV,
  } = process.env;

  const [accessTokenResponse, tokenError] = await tryCatch(
    axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    )
  );

  if (tokenError) {
    logger.error("GitHub login error:", tokenError);
    throw new ApiError("Internal Server Error", 500);
  }

  const { access_token, error } = accessTokenResponse.data;
  if (error) {
    logger.error("GitHub OAuth Error:", error);
    response(res, 401, "Unauthorized Access");
    return;
  }

  const [encryptedAccessToken, encryptError] = await tryCatch(() =>
    encrypt(access_token, ENCRYPTION_KEY_32 as string, ENCRYPTION_IV as string)
  );

  if (encryptError) {
    logger.error("GitHub login error:", encryptError);
    throw new ApiError("Internal Server Error", 500);
  }

  const [userGH, userGHError] = await tryCatch(
    axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    })
  );

  if (userGHError) {
    logger.error("GitHub login error:", userGHError);
    throw new ApiError("Internal Server Error", 500);
  }

  const {
    id: github_id,
    login: username,
    name,
    avatar_url: profile_image_url,
  } = userGH.data;

  const [existingUser, findError] = await tryCatch(
    User.findOne({ github_id: github_id.toString() })
  );

  if (findError) {
    logger.error("GitHub login error:", findError);
    throw new ApiError("Internal Server Error", 500);
  }

  if (existingUser) {
    const session_token = createSessionToken(
      existingUser._id,
      username,
      name || "",
      profile_image_url
    );

    Object.assign(existingUser, {
      github_access_token: encryptedAccessToken,
      username,
      name: name || "",
      profile_image_url,
    });

    const [, saveError] = await tryCatch(existingUser.save());
    if (saveError) {
      logger.error("GitHub login error:", saveError);
      throw new ApiError("Internal Server Error", 500);
    }

    response(
      res,
      200,
      "User login successful",
      {
        id: existingUser.id,
        username,
        name,
        profile_image_url,
      },
      {},
      false,
      session_token
    );
  } else {
    const [newUser, createError] = await tryCatch(
      User.create({
        github_id: github_id.toString(),
        name: name || "",
        username,
        profile_image_url: profile_image_url,
        github_access_token: encryptedAccessToken,
      })
    );

    if (createError) {
      logger.error("GitHub login error:", createError);
      throw new ApiError("Internal Server Error", 500);
    }

    const session_token = createSessionToken(
      newUser._id,
      username,
      name || "",
      profile_image_url
    );
    response(
      res,
      200,
      "User login successful",
      {
        id: newUser.id,
        username,
        name,
        profile_image_url,
      },
      {},
      false,
      session_token
    );
  }
});

const authValidation = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError("Error during validation", 401);
  }
  response(res, 200, "User login validated", {
    _id: req.user._id,
    username: req.user.username,
    name: req.user.name,
    profile_image_url: req.user.profile_image_url,
  });
});

const githubLogout = asyncHandler(async (req: Request, res: Response) => {
  response(res, 200, "User Logged out successfully", {}, {}, true);
});

export { githubLogin, authValidation, githubLogout };
