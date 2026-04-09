import { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import { AxiosError } from "axios";
import { User } from "../models/user.model";
import { Project } from "../models/project.model";
import { Purchase } from "../models/purchase.model";
import { Sales } from "../models/sales.model";
import { Review } from "../models/projectReview.model";
import { SiteReview } from "../models/siteReview.model";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { DeletedUser } from "../models/deletedUser.model";
import { performProjectHardDelete } from "../utils/projectCleanup.util";
import { recalculateProjectAggregates } from "../utils/reviewsHelper.util";
import { encrypt } from "../utils/encryption.util";
import asyncHandler from "../utils/asyncHandler.util";
import response from "../utils/response.util";
import ApiError from "../utils/ApiError.util";
import axios from "axios";
import logger from "../logger/logger";
import { githubCodeSchema } from "../validations/auth.validation";
import { refreshTokenCookieSchema } from "../validations/refresh.validation";
import { tryCatch } from "../utils/tryCatch.util";
import { enrichContext } from "../utils/asyncContext";
import {
  generateRefreshToken,
  addRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  createSessionToken,
} from "../utils/authToken.util";
import {
  AUTH_COOKIE_NAMES,
  OAUTH_STATE_MAX_AGE_MS,
  authCookieOptions,
  authPurchaseConfig,
  authRetentionConfig,
  authUserDefaults,
  githubAuthConfig,
} from "../config/auth.config";
import { isTrustedOrigin } from "../utils/trustedOrigin.util";

const clearOAuthCookies = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAMES.oauthState, authCookieOptions);
  res.clearCookie(AUTH_COOKIE_NAMES.oauthNext, authCookieOptions);
};

const githubLoginStart = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "github_login_start" });

  const oauthState = crypto.randomBytes(24).toString("hex");
  const clientId = githubAuthConfig.clientId;
  if (!clientId) {
    enrichContext({
      outcome: "error",
      error: { name: "ConfigError", message: "Missing GITHUB_CLIENT_ID" },
    });
    throw new ApiError("Internal Server Error", 500);
  }
  const redirectUri = githubAuthConfig.redirectUri;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: githubAuthConfig.oauthScope,
    state: oauthState,
  });

  if (redirectUri) {
    params.set("redirect_uri", redirectUri);
  }

  const authorize_url = `${githubAuthConfig.authorizeUrl}?${params.toString()}`;

  enrichContext({ outcome: "success" });
  res.cookie(AUTH_COOKIE_NAMES.oauthState, oauthState, {
    ...authCookieOptions,
    maxAge: OAUTH_STATE_MAX_AGE_MS,
  });

  const nextParam = req.query.next;
  if (
    typeof nextParam === "string" &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//") &&
    !nextParam.includes("://")
  ) {
    res.cookie(AUTH_COOKIE_NAMES.oauthNext, decodeURIComponent(nextParam), {
      ...authCookieOptions,
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });
  }

  response(res, 200, "GitHub OAuth URL generated", {
    authorize_url,
  });
});

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
  const { code, state } = result.data;
  const stateFromCookie = req.cookies[AUTH_COOKIE_NAMES.oauthState];
  if (
    typeof stateFromCookie !== "string" ||
    stateFromCookie.length !== state.length ||
    !crypto.timingSafeEqual(Buffer.from(stateFromCookie), Buffer.from(state))
  ) {
    enrichContext({ outcome: "unauthorized", auth_status: "token_invalid" });
    clearOAuthCookies(res);
    response(res, 401, "Unauthorized Access");
    return;
  }

  const oauthNextRaw = req.cookies[AUTH_COOKIE_NAMES.oauthNext];
  const oauthNext =
    typeof oauthNextRaw === "string" &&
    oauthNextRaw.startsWith("/") &&
    !oauthNextRaw.startsWith("//") &&
    !oauthNextRaw.includes("://")
      ? oauthNextRaw
      : null;

  const tokenExchangePayload = new URLSearchParams({
    client_id: githubAuthConfig.clientId as string,
    client_secret: githubAuthConfig.clientSecret as string,
    code,
  });
  if (githubAuthConfig.redirectUri) {
    tokenExchangePayload.set("redirect_uri", githubAuthConfig.redirectUri);
  }

  const tokenStartTime = performance.now();
  const [accessTokenResponse, tokenError] = await tryCatch(
    axios.post(
      githubAuthConfig.accessTokenUrl,
      tokenExchangePayload.toString(),
      {
        headers: githubAuthConfig.tokenExchangeHeaders,
        timeout: githubAuthConfig.requestTimeoutMs,
      }
    )
  );
  enrichContext({
    external_api_latency_ms: Math.round(performance.now() - tokenStartTime),
  });

  if (tokenError) {
    const isClientError =
      axios.isAxiosError(tokenError) &&
      tokenError.response?.status &&
      tokenError.response.status < 500;

    enrichContext({
      outcome: isClientError ? "unauthorized" : "error",
      error: {
        name: "GitHubTokenError",
        message:
          tokenError instanceof Error
            ? tokenError.message
            : "Failed to get access token",
        code: axios.isAxiosError(tokenError) ? tokenError.code : undefined,
      },
    });

    if (isClientError) {
      logger.warn("GitHub OAuth token exchange rejected (client error)", {
        status: tokenError.response?.status,
      });
      clearOAuthCookies(res);
      response(res, 401, "Authentication failed");
      return;
    }

    logger.error("GitHub OAuth token exchange failed", tokenError);
    throw new ApiError("Internal Server Error", 500);
  }

  const { access_token, error, scope } = accessTokenResponse.data;

  enrichContext({
    github_scopes: scope,
    github_rate_limit_remaining:
      accessTokenResponse.headers["x-ratelimit-remaining"],
    github_rate_limit_reset: accessTokenResponse.headers["x-ratelimit-reset"],
  });

  if (error) {
    enrichContext({
      outcome: "unauthorized",
      error: { name: "GitHubOAuthError", message: error },
    });
    logger.error("GitHub OAuth error response", { github_error: error });
    clearOAuthCookies(res);
    response(res, 401, "Unauthorized Access");
    return;
  }

  const [encryptedAccessToken, encryptError] = await tryCatch(() =>
    encrypt(access_token, githubAuthConfig.encryptionKey as string)
  );

  if (encryptError) {
    enrichContext({
      outcome: "error",
      error: {
        name: "EncryptionError",
        message:
          encryptError instanceof Error
            ? encryptError.message
            : "Encryption failed",
      },
    });
    logger.error("Access token encryption failed", encryptError);
    throw new ApiError("Internal Server Error", 500);
  }

  const [userGH, userGHError] = await tryCatch(
    axios.get(githubAuthConfig.userApiUrl, {
      headers: {
        ...githubAuthConfig.userApiHeaders,
        Authorization: `Bearer ${access_token}`,
      },
      timeout: githubAuthConfig.requestTimeoutMs,
    })
  );

  if (userGHError || !userGH) {
    const axiosUserError = axios.isAxiosError(userGHError)
      ? (userGHError as AxiosError)
      : null;
    const responseStatus = axiosUserError?.response?.status;
    const isClientError = !!responseStatus && responseStatus < 500;

    enrichContext({
      outcome: isClientError ? "unauthorized" : "error",
      error: {
        name: "GitHubAPIError",
        message:
          userGHError instanceof Error
            ? userGHError.message
            : "Failed to fetch user",
      },
    });

    if (isClientError) {
      logger.warn("GitHub User Profile fetch rejected", {
        status: responseStatus,
      });
      clearOAuthCookies(res);
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
      error: {
        name: "DatabaseError",
        message:
          findError instanceof Error
            ? findError.message
            : "Database query failed",
      },
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
      github_user_token: encryptedAccessToken,
      username,
      name: name || "",
      profile_image_url,
    });

    const saveStartTime = performance.now();
    const [, saveError] = await tryCatch(existingUser.save());
    enrichContext({
      db_write_latency_ms: Math.round(performance.now() - saveStartTime),
    });

    if (saveError) {
      enrichContext({
        outcome: "error",
        error: {
          name: "DatabaseError",
          message:
            saveError instanceof Error
              ? saveError.message
              : "Failed to save user",
        },
      });
      logger.error("Failed to update existing user", saveError);
      throw new ApiError("Internal Server Error", 500);
    }

    const rawRefreshToken = generateRefreshToken();
    const [, rtSaveError] = await tryCatch(
      addRefreshToken(existingUser._id, rawRefreshToken)
    );
    if (rtSaveError) {
      logger.error(
        "Failed to save refresh token for existing user",
        rtSaveError
      );
      throw new ApiError("Internal Server Error", 500);
    }

    enrichContext({ outcome: "success" });
    clearOAuthCookies(res);
    response(
      res,
      200,
      "User login successful",
      {
        user: {
          _id: existingUser.id,
          username,
          name,
          profile_image_url,
        },
        next: oauthNext,
      },
      {},
      false,
      session_token,
      rawRefreshToken
    );
  } else {
    // Check the GitHub deletion cooldown.
    const [deletedUser] = await tryCatch(
      DeletedUser.findOne({ github_id: github_id.toString() }).lean()
    );

    if (deletedUser) {
      const allowedAfter = new Date(
        (deletedUser as any).deleted_at.getTime() +
          authRetentionConfig.accountDeletionCooldownMs
      );
      const formattedDate = allowedAfter.toLocaleDateString(
        authRetentionConfig.deletedAccountRejoinDateLocale,
        {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: authRetentionConfig.deletedAccountRejoinDateTimeZone,
        }
      );
      enrichContext({
        outcome: "forbidden",
        reason: "account_deletion_cooldown",
      });
      clearOAuthCookies(res);
      response(
        res,
        403,
        `This GitHub account was recently deleted. You can create a new account after ${formattedDate}.`
      );
      return;
    }

    const createStartTime = performance.now();
    const [newUser, createError] = await tryCatch(
      User.create({
        github_id: github_id.toString(),
        name: name || "",
        username,
        profile_image_url: profile_image_url,
        github_user_token: encryptedAccessToken,
        project_listing_limit: authUserDefaults.projectListingLimit,
      })
    );
    enrichContext({
      db_write_latency_ms: Math.round(performance.now() - createStartTime),
    });

    if (createError) {
      enrichContext({
        outcome: "error",
        error: {
          name: "DatabaseError",
          message:
            createError instanceof Error
              ? createError.message
              : "Failed to create user",
        },
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

    const rawRefreshToken = generateRefreshToken();
    const [, rtSaveError] = await tryCatch(
      addRefreshToken(newUser._id, rawRefreshToken)
    );
    if (rtSaveError) {
      logger.error("Failed to save refresh token for new user", rtSaveError);
      throw new ApiError("Internal Server Error", 500);
    }

    clearOAuthCookies(res);
    response(
      res,
      200,
      "User login successful. New User created.",
      {
        user: {
          _id: newUser.id,
          username,
          name,
          profile_image_url,
        },
        next: oauthNext,
      },
      {},
      false,
      session_token,
      rawRefreshToken
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
  enrichContext({ action: "github_logout" });
  if (!isTrustedOrigin(req)) {
    enrichContext({ outcome: "forbidden" });
    response(res, 403, "Forbidden");
    return;
  }

  const rawRefreshToken = req.cookies[AUTH_COOKIE_NAMES.refreshToken];

  if (rawRefreshToken) {
    const [, revokeError] = await tryCatch(revokeRefreshToken(rawRefreshToken));
    if (revokeError) {
      logger.warn("Failed to revoke refresh token during logout", revokeError);
    }
  }

  enrichContext({ outcome: "success" });
  response(
    res,
    200,
    "User Logged out successfully",
    {},
    {},
    true,
    "",
    "",
    true
  );
});

const refreshTokenHandler = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "token_refresh" });
    if (!isTrustedOrigin(req)) {
      enrichContext({ outcome: "forbidden" });
      response(res, 403, "Forbidden");
      return;
    }

    const cookieValidation = refreshTokenCookieSchema.safeParse(req.cookies);
    if (!cookieValidation.success) {
      enrichContext({ outcome: "unauthorized", auth_status: "token_invalid" });
      response(res, 401, "Unauthorized Access");
      return;
    }

    const rawRefreshToken = cookieValidation.data.refresh_token;
    const newRawRefreshToken = generateRefreshToken();

    const [result, rotateError] = await tryCatch(
      rotateRefreshToken(rawRefreshToken, newRawRefreshToken)
    );

    if (rotateError) {
      logger.error("Failed to rotate refresh token", rotateError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (result === "REUSE_DETECTED") {
      enrichContext({
        outcome: "unauthorized",
        auth_status: "token_reuse_detected",
      });
      logger.warn(
        "Refresh token reuse detected — all sessions revoked for user"
      );
      response(res, 401, "Unauthorized Access", {}, {}, true, "", "", true);
      return;
    }

    if (!result) {
      enrichContext({ outcome: "unauthorized", auth_status: "token_invalid" });
      response(res, 401, "Unauthorized Access", {}, {}, true, "", "", true);
      return;
    }

    enrichContext({
      entity: { type: "user", id: result._id.toString() },
    });

    const newSessionToken = createSessionToken(
      result._id,
      result.username,
      result.name,
      result.profile_image_url
    );

    enrichContext({ outcome: "success" });
    response(
      res,
      200,
      "Token refreshed successfully",
      {},
      {},
      false,
      newSessionToken,
      newRawRefreshToken
    );
  }
);

const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "delete_account" });

  if (!isTrustedOrigin(req)) {
    enrichContext({ outcome: "forbidden" });
    response(res, 403, "Forbidden");
    return;
  }

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Unauthorized Access", 401);
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);

  // Step 1: fetch the user record.
  const [user, userFetchError] = await tryCatch(
    User.findById(userId).select("username github_id").lean()
  );

  if (userFetchError || !user) {
    enrichContext({ outcome: "not_found" });
    logger.error("deleteAccount: user not found or DB error", userFetchError);
    response(res, 404, "User not found");
    return;
  }

  enrichContext({
    entity: { type: "user", id: userId.toString() },
    user: { username: (user as any).username },
  });

  // Step 2: fetch all owned projects.
  const [projects, projectsFetchError] = await tryCatch(
    Project.find({ userid: userId })
      .select(
        "_id project_images project_images_detail project_video repo_zip_s3_key scheduled_deletion_at"
      )
      .lean()
  );

  if (projectsFetchError) {
    logger.error("deleteAccount: failed to fetch projects", projectsFetchError);
  }

  const projectList = projects ?? [];

  // Step 3: delete reviews on owned projects.
  if (projectList.length > 0) {
    const allProjectIds = projectList.map((p) => p._id);
    const [, bulkReviewsDeleteError] = await tryCatch(
      Review.deleteMany({ projectId: { $in: allProjectIds } })
    );
    if (bulkReviewsDeleteError) {
      logger.error(
        "deleteAccount: failed to bulk delete project reviews",
        bulkReviewsDeleteError
      );
    }
  }

  // Step 4: hard- or soft-delete each project.
  for (const project of projectList) {
    // Skip projects already scheduled for deletion.
    if ((project as any).scheduled_deletion_at) {
      continue;
    }

    const [hasSales, salesCheckError] = await tryCatch(
      Purchase.exists({
        projectId: project._id,
        status: authPurchaseConfig.confirmedStatus,
      })
    );

    if (salesCheckError) {
      logger.error("deleteAccount: failed to check sales for project", {
        projectId: project._id.toString(),
        error: salesCheckError,
      });
      continue;
    }

    if (hasSales) {
      // Soft-delete projects with sales.
      const [, softDeleteError] = await tryCatch(
        Project.updateOne(
          { _id: project._id },
          {
            isActive: false,
            scheduled_deletion_at: new Date(
              Date.now() + authRetentionConfig.projectSoftDeleteGracePeriodMs
            ),
          }
        )
      );
      if (softDeleteError) {
        logger.error("deleteAccount: soft delete failed for project", {
          projectId: project._id.toString(),
          error: softDeleteError,
        });
      }

      const [, wishlistError] = await tryCatch(
        User.updateMany(
          { wishlist: project._id },
          { $pull: { wishlist: project._id } }
        )
      );
      if (wishlistError) {
        logger.error("deleteAccount: wishlist cleanup failed for project", {
          projectId: project._id.toString(),
          error: wishlistError,
        });
      }
    } else {
      // Hard-delete projects without sales.
      await performProjectHardDelete(project as any);
    }
  }

  // Step 5: delete the sales record.
  const [, salesDeleteError] = await tryCatch(Sales.deleteOne({ userId }));
  if (salesDeleteError) {
    logger.error(
      "deleteAccount: failed to delete Sales document",
      salesDeleteError
    );
  }

  // Step 6: delete GitHub app installation records.
  const [, ghInstallDeleteError] = await tryCatch(
    GitHubAppInstallation.deleteMany({ user_id: userId })
  );
  if (ghInstallDeleteError) {
    logger.error(
      "deleteAccount: failed to delete GitHubAppInstallation records",
      ghInstallDeleteError
    );
  }

  // Step 7: delete authored reviews and recalculate aggregates.
  const [userReviews, reviewsFetchError] = await tryCatch(
    Review.find({ userId }).select("projectId").lean()
  );

  if (reviewsFetchError) {
    logger.error(
      "deleteAccount: failed to fetch user's reviews on others' projects",
      reviewsFetchError
    );
  } else {
    const affectedProjectIds = [
      ...new Set((userReviews ?? []).map((r: any) => r.projectId.toString())),
    ];

    const [, reviewsDeleteError] = await tryCatch(
      Review.deleteMany({ userId })
    );
    if (reviewsDeleteError) {
      logger.error(
        "deleteAccount: failed to delete user's reviews",
        reviewsDeleteError
      );
    } else {
      for (const projectIdStr of affectedProjectIds) {
        const [, recalcError] = await tryCatch(
          recalculateProjectAggregates(
            new mongoose.Types.ObjectId(projectIdStr)
          )
        );
        if (recalcError) {
          logger.error("deleteAccount: aggregate recalculation failed", {
            projectId: projectIdStr,
            error: recalcError,
          });
        }
      }
    }
  }

  // Step 8: delete site reviews by username.
  const [, siteReviewDeleteError] = await tryCatch(
    SiteReview.deleteMany({ username: (user as any).username })
  );
  if (siteReviewDeleteError) {
    logger.error(
      "deleteAccount: failed to delete SiteReview",
      siteReviewDeleteError
    );
  }

  // Step 9: delete the user record.
  const [, userDeleteError] = await tryCatch(User.deleteOne({ _id: userId }));
  if (userDeleteError) {
    logger.error(
      "deleteAccount: CRITICAL — failed to delete user document",
      userDeleteError
    );
    response(res, 500, "Account deletion failed. Please contact support.");
    return;
  }

  // Step 10a: record the deletion cooldown.
  const [, deletedUserCreateError] = await tryCatch(
    DeletedUser.create({
      github_id: (user as any).github_id,
      deleted_at: new Date(),
    })
  );
  if (deletedUserCreateError) {
    logger.error(
      "deleteAccount: failed to record DeletedUser for cooldown",
      deletedUserCreateError
    );
  }

  enrichContext({ outcome: "success" });

  // Step 10b: clear both auth cookies.
  response(
    res,
    200,
    "Account deleted successfully",
    {},
    {},
    true,
    "",
    "",
    true
  );
});

export {
  githubLoginStart,
  githubLogin,
  authValidation,
  githubLogout,
  refreshTokenHandler,
  deleteAccount,
};
