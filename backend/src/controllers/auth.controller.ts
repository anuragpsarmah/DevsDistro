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

const createSessionToken = (
  userid: mongoose.Types.ObjectId,
  username: string,
  name: string,
  profileImageUrl: string
) => {
  const session_token = jwt.sign(
    { _id: userid, username, name, profileImageUrl },
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

  try {
    const accessTokenResponse = await axios.post(
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
    );

    const { access_token, error } = accessTokenResponse.data;

    if (error) {
      logger.error("GitHub OAuth Error:", error);
      response(res, 401, "Unauthorized Access");
      return;
    }

    const encryptedAccessToken = encrypt(
      access_token,
      ENCRYPTION_KEY_32 as string,
      ENCRYPTION_IV as string
    );

    const userGH = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { login: username, name, avatar_url: profileImageUrl } = userGH.data;

    let user = await User.findOne({ username });

    if (user) {
      const session_token = createSessionToken(
        user._id,
        username,
        name || "",
        profileImageUrl
      );

      user.github_access_token = encryptedAccessToken;
      await user.save();

      response(
        res,
        200,
        "User login successful",
        {
          _id: user._id,
          username,
          name,
          profileImageUrl,
        },
        {},
        false,
        session_token
      );
    } else {
      user = await User.create({
        name: name || "",
        username,
        profile_image_url: profileImageUrl,
        github_access_token: encryptedAccessToken,
      });

      const session_token = createSessionToken(
        user._id,
        username,
        name || "",
        profileImageUrl
      );

      response(
        res,
        200,
        "User login successful",
        {
          _id: user._id,
          username,
          name,
          profileImageUrl,
        },
        {},
        false,
        session_token
      );
    }
  } catch (error) {
    logger.error("GitHub login error:", error);
    throw new ApiError("Internal Server Error", 500);
  }
});

const authValidation = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    response(res, 200, "User login validated", {
      _id: req.user._id,
      username: req.user.username,
      name: req.user.name,
      profileImageUrl: req.user.profileImageUrl,
    });
  } else {
    throw new ApiError("Error during validation", 401);
  }
});

const githubLogout = asyncHandler(async (req: Request, res: Response) => {
  response(res, 200, "User Logged out successfully", {}, {}, true);
});

export { githubLogin, authValidation, githubLogout };
