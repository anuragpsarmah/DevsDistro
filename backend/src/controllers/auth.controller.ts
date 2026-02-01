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
import { enrichContext } from "../utils/asyncContext";

const createSessionToken = (
  userid: mongoose.Types.ObjectId,
  username: string,
  name: string,
  profile_image_url: string
) => {
  const expiresIn = "3d";
  enrichContext({
    auth_session_created: true,
    auth_session_expires_in: expiresIn
  });
  const session_token = jwt.sign(
    { _id: userid, username, name, profile_image_url },
    process.env.JWT_SECRET as string,
    { expiresIn }
  );

  return session_token;
};

const githubLogin = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "github_login" });

  const result = githubCodeSchema.safeParse(req.query);
  if (!result.success) {
    enrichContext({ outcome: "validation_failed" });
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

  const tokenStartTime = performance.now();
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
  enrichContext({ external_api_latency_ms: Math.round(performance.now() - tokenStartTime) });

  if (tokenError) {
    const isClientError = axios.isAxiosError(tokenError) && tokenError.response?.status && tokenError.response.status < 500;

    enrichContext({
      outcome: isClientError ? "unauthorized" : "error",
      error: {
        name: "GitHubTokenError",
        message: tokenError instanceof Error ? tokenError.message : "Failed to get access token",
        code: axios.isAxiosError(tokenError) ? tokenError.code : undefined
      }
    });

    if (isClientError) {
      logger.warn("GitHub OAuth token exchange rejected (client error)", { status: tokenError.response?.status });
      response(res, 401, "Authentication failed");
      return;
    }

    logger.error("GitHub OAuth token exchange failed", tokenError);
    throw new ApiError("Internal Server Error", 500);
  }

  const { access_token, error, scope } = accessTokenResponse.data;

  enrichContext({
    github_scopes: scope,
    github_rate_limit_remaining: accessTokenResponse.headers["x-ratelimit-remaining"],
    github_rate_limit_reset: accessTokenResponse.headers["x-ratelimit-reset"]
  });

  if (error) {
    enrichContext({
      outcome: "unauthorized",
      error: { name: "GitHubOAuthError", message: error }
    });
    logger.error("GitHub OAuth error response", { github_error: error });
    response(res, 401, "Unauthorized Access");
    return;
  }

  const [encryptedAccessToken, encryptError] = await tryCatch(() =>
    encrypt(access_token, ENCRYPTION_KEY_32 as string, ENCRYPTION_IV as string)
  );

  if (encryptError) {
    enrichContext({
      outcome: "error",
      error: { name: "EncryptionError", message: encryptError instanceof Error ? encryptError.message : "Encryption failed" }
    });
    logger.error("Access token encryption failed", encryptError);
    throw new ApiError("Internal Server Error", 500);
  }

  const [userGH, userGHError] = await tryCatch(
    axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    })
  );

  if (userGHError) {
    const isClientError = axios.isAxiosError(userGHError) && userGHError.response?.status && userGHError.response.status < 500;

    enrichContext({
      outcome: isClientError ? "unauthorized" : "error",
      error: { name: "GitHubAPIError", message: userGHError instanceof Error ? userGHError.message : "Failed to fetch user" }
    });

    if (isClientError) {
      logger.warn("GitHub User Profile fetch rejected", { status: userGHError.response?.status });
      response(res, 401, "Authentication failed");
      return;
    }

    logger.error("Failed to fetch GitHub user profile", userGHError);
    throw new ApiError("Internal Server Error", 500);
  }

  const {
    id: github_id,
    login: username,
    name,
    avatar_url: profile_image_url,
  } = userGH.data;

  enrichContext({
    user: { github_id: github_id.toString(), username },
  });

  const dbStartTime = performance.now();
  const [existingUser, findError] = await tryCatch(
    User.findOne({ github_id: github_id.toString() })
  );
  enrichContext({ db_latency_ms: Math.round(performance.now() - dbStartTime) });

  if (findError) {
    enrichContext({
      outcome: "error",
      error: { name: "DatabaseError", message: findError instanceof Error ? findError.message : "Database query failed" }
    });
    logger.error("Failed to find user in database", findError);
    throw new ApiError("Internal Server Error", 500);
  }

  if (existingUser) {
    enrichContext({
      user: { id: existingUser._id.toString() },
      entity: { type: "user", id: existingUser._id.toString() },
      is_new_user: false,
    });

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

    const saveStartTime = performance.now();
    const [, saveError] = await tryCatch(existingUser.save());
    enrichContext({ db_write_latency_ms: Math.round(performance.now() - saveStartTime) });

    if (saveError) {
      enrichContext({
        outcome: "error",
        error: { name: "DatabaseError", message: saveError instanceof Error ? saveError.message : "Failed to save user" }
      });
      logger.error("Failed to update existing user", saveError);
      throw new ApiError("Internal Server Error", 500);
    }

    enrichContext({ outcome: "success" });
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
    const createStartTime = performance.now();
    const [newUser, createError] = await tryCatch(
      User.create({
        github_id: github_id.toString(),
        name: name || "",
        username,
        profile_image_url: profile_image_url,
        github_access_token: encryptedAccessToken,
      })
    );
    enrichContext({ db_write_latency_ms: Math.round(performance.now() - createStartTime) });

    if (createError) {
      enrichContext({
        outcome: "error",
        error: { name: "DatabaseError", message: createError instanceof Error ? createError.message : "Failed to create user" }
      });
      logger.error("Failed to create new user", createError);
      throw new ApiError("Internal Server Error", 500);
    }

    enrichContext({
      user: { id: newUser._id.toString() },
      entity: { type: "user", id: newUser._id.toString() },
      is_new_user: true,
      outcome: "success",
    });

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
  enrichContext({ action: "auth_validation" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  enrichContext({
    outcome: "success",
    entity: { type: "user", id: req.user._id },
  });

  response(res, 200, "User login validated", {
    _id: req.user._id,
    username: req.user.username,
    name: req.user.name,
    profile_image_url: req.user.profile_image_url,
  });
});

const githubLogout = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "github_logout", outcome: "success" });
  response(res, 200, "User Logged out successfully", {}, {}, true);
});

export { githubLogin, authValidation, githubLogout };

