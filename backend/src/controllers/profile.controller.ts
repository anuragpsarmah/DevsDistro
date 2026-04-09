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
import { enrichContext } from "../utils/asyncContext";
import { verifyWalletSignature } from "../utils/walletVerification.util";
import {
  WALLET_VERIFICATION_WINDOW_MS,
  WALLET_CLOCK_SKEW_MS,
  DIFFERENT_WALLET_COOLDOWN_MS,
} from "../config/profile.config";
import { resolveUsdcMintAddress } from "../utils/payment.util";
import {
  getAssociatedTokenAccountStatus,
  sponsorAssociatedTokenAccount,
} from "../utils/solanaAta.util";

// GET /api/profile/getProfileInformation
const getProfileInformation = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_profile" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    enrichContext({ entity: { type: "user", id: userId.toString() } });

    const dbStartTime = performance.now();
    const [user, findError] = await tryCatch(User.findById(userId));
    enrichContext({
      db_latency_ms: Math.round(performance.now() - dbStartTime),
    });

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
      logger.error("Failed to fetch user profile", findError);
      throw new ApiError("Internal Server Error", 500, {}, findError);
    }

    if (!user) {
      enrichContext({ outcome: "not_found" });
      response(res, 401, "User not found. Unauthorized access.");
      return;
    }

    enrichContext({ outcome: "success" });
    const responseObj = {
      website_url: user.website_url,
      x_username: user.x_username,
      short_bio: user.short_bio,
      job_role: user.job_role,
      location: user.location,
      review_description: user.review_description,
      review_stars: user.review_stars,
      profile_visibility: user.profile_visibility,
      auto_repackage_on_push: user.auto_repackage_on_push,
    };

    response(res, 200, "User info fetched successfully", responseObj);
  }
);

// PUT /api/profile/updateProfileInformation
const updateProfileInformation = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "update_profile" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    enrichContext({ entity: { type: "user", id: userId.toString() } });

    const {
      website_url,
      x_username,
      short_bio,
      job_role,
      review_description,
      review_stars,
      location,
      profile_visibility,
      auto_repackage_on_push,
    } = req.body;

    const result = profileInformationSchema.safeParse({
      website_url,
      x_username,
      short_bio,
      job_role,
      review_description,
      review_stars,
      location,
      profile_visibility,
      auto_repackage_on_push,
    });

    if (!result.success) {
      enrichContext({ outcome: "validation_failed" });
      response(
        res,
        400,
        "Payload failed validation",
        {},
        result.error.errors[0].message
      );
      return;
    }

    const dbStartTime = performance.now();
    const [user, userFindError] = await tryCatch(User.findById(userId));
    enrichContext({
      db_latency_ms: Math.round(performance.now() - dbStartTime),
    });

    if (userFindError) {
      enrichContext({
        outcome: "error",
        error: {
          name: "DatabaseError",
          message:
            userFindError instanceof Error
              ? userFindError.message
              : "Database query failed",
        },
      });
      logger.error("Failed to find user for profile update", userFindError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (!user) {
      enrichContext({ outcome: "not_found" });
      response(res, 401, "User not found. Unauthorized access.");
      return;
    }

    Object.assign(user, result.data);

    const [, saveUserError] = await tryCatch(user.save());
    if (saveUserError) {
      enrichContext({
        outcome: "error",
        error: {
          name: "DatabaseError",
          message:
            saveUserError instanceof Error
              ? saveUserError.message
              : "Failed to save user",
        },
      });
      logger.error("Failed to save user profile", saveUserError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (!review_description || !review_stars) {
      const [, deleteReviewError] = await tryCatch(
        SiteReview.deleteOne({ username: req.user.username })
      );
      if (deleteReviewError) {
        enrichContext({
          outcome: "error",
          error: {
            name: "DatabaseError",
            message:
              deleteReviewError instanceof Error
                ? deleteReviewError.message
                : "Failed to delete site review",
          },
        });
        logger.error("Failed to delete cleared site review", deleteReviewError);
        throw new ApiError("Internal Server Error", 500);
      }
      enrichContext({ outcome: "success", has_review: false });
      response(res, 200, "User profile information updated successfully.");
      return;
    }

    enrichContext({ has_review: true });

    const [siteUserReview, findReviewError] = await tryCatch(
      SiteReview.findOne({
        username: req.user.username,
      })
    );

    if (findReviewError) {
      enrichContext({
        outcome: "error",
        error: {
          name: "DatabaseError",
          message:
            findReviewError instanceof Error
              ? findReviewError.message
              : "Failed to find review",
        },
      });
      logger.error("Failed to find user site review", findReviewError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (siteUserReview) {
      enrichContext({ review_action: "update" });
      Object.assign(siteUserReview, {
        username: req.user.username,
        profile_image_url: req.user.profile_image_url,
        job_role,
        review_description,
        review_stars,
      });

      const [, saveReviewError] = await tryCatch(siteUserReview.save());
      if (saveReviewError) {
        enrichContext({
          outcome: "error",
          error: {
            name: "DatabaseError",
            message:
              saveReviewError instanceof Error
                ? saveReviewError.message
                : "Failed to save review",
          },
        });
        logger.error("Failed to update site review", saveReviewError);
        throw new ApiError("Internal Server Error", 500);
      }
    } else {
      enrichContext({ review_action: "create" });
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
        enrichContext({
          outcome: "error",
          error: {
            name: "DatabaseError",
            message:
              newReviewError instanceof Error
                ? newReviewError.message
                : "Failed to create review",
          },
        });
        logger.error("Failed to create new site review", newReviewError);
        throw new ApiError("Internal Server Error", 500);
      }
    }

    enrichContext({ outcome: "success" });
    response(res, 200, "User profile information updated successfully.");
  }
);

// GET /api/profile/getWalletAddress
const getWalletAddress = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "get_wallet" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Error during validation", 401);
  }

  const userId = new mongoose.Types.ObjectId(req.user._id);
  enrichContext({ entity: { type: "user", id: userId.toString() } });

  const dbStartTime = performance.now();
  const [user, findUserError] = await tryCatch(User.findById(userId));
  enrichContext({ db_latency_ms: Math.round(performance.now() - dbStartTime) });

  if (findUserError) {
    enrichContext({
      outcome: "error",
      error: {
        name: "DatabaseError",
        message:
          findUserError instanceof Error
            ? findUserError.message
            : "Database query failed",
      },
    });
    logger.error("Failed to fetch user wallet address", findUserError);
    throw new ApiError("Internal Server Error", 500);
  }

  if (!user) {
    enrichContext({ outcome: "not_found" });
    response(res, 401, "User not found. Unauthorized access.");
    return;
  }

  enrichContext({
    outcome: "success",
    has_wallet: !!user.wallet_address,
  });

  const responseObj = {
    wallet_address: user.wallet_address,
  };

  response(res, 200, "Wallet address fetched successfully", responseObj);
});

// PUT /api/profile/updateWalletAddress
const updateWalletAddress = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "update_wallet" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Error during validation", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    enrichContext({ entity: { type: "user", id: userId.toString() } });

    const { wallet_address, signature, message } = req.body;

    const result = walletAddressSchema.safeParse(req.body);
    if (!result.success) {
      enrichContext({ outcome: "validation_failed" });
      response(
        res,
        400,
        "Payload failed validation",
        {},
        result.error.errors[0].message
      );
      return;
    }

    if (wallet_address && signature && message) {
      const messageRegex =
        /^DevsDistro Wallet Verification\nAddress: ([1-9A-HJ-NP-Za-km-z]{32,44})\nTimestamp: (\d+)$/;
      const match = message.match(messageRegex);

      if (!match) {
        enrichContext({
          outcome: "validation_failed",
          reason: "invalid_message_format",
        });
        logger.warn("Invalid message format for wallet verification", {
          wallet_address,
        });
        response(res, 400, "Invalid verification message format.");
        return;
      }

      const [, messageAddress, timestampStr] = match;

      if (messageAddress !== wallet_address) {
        enrichContext({
          outcome: "validation_failed",
          reason: "address_mismatch",
        });
        logger.warn("Address mismatch in wallet verification", {
          submitted: wallet_address,
          in_message: messageAddress,
        });
        response(res, 400, "Address mismatch. Please try connecting again.");
        return;
      }

      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();

      if (
        isNaN(timestamp) ||
        now - timestamp > WALLET_VERIFICATION_WINDOW_MS ||
        timestamp > now + WALLET_CLOCK_SKEW_MS
      ) {
        enrichContext({
          outcome: "validation_failed",
          reason: "timestamp_expired",
        });
        logger.warn("Expired or invalid timestamp in wallet verification", {
          timestamp,
          current: now,
        });
        response(
          res,
          400,
          "Verification expired. Please try connecting again."
        );
        return;
      }

      const isValidSignature = verifyWalletSignature(
        wallet_address,
        signature,
        message
      );

      if (!isValidSignature) {
        enrichContext({ outcome: "validation_failed" });
        logger.warn("Wallet signature verification failed", {
          wallet_address,
        });
        response(
          res,
          400,
          "Signature verification failed. Please try connecting your wallet again."
        );
        return;
      }

      enrichContext({ signature_verified: true });
    }

    const dbStartTime = performance.now();
    const [user, findError] = await tryCatch(User.findById(userId));
    enrichContext({
      db_latency_ms: Math.round(performance.now() - dbStartTime),
    });

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
      logger.error("Failed to find user for wallet update", findError);
      throw new ApiError("Internal Server Error", 500);
    }

    if (!user) {
      enrichContext({ outcome: "not_found" });
      response(res, 401, "User not found. Unauthorized access.");
      return;
    }

    let successMessage = "Wallet address removed successfully";
    const responseData: Record<string, any> = {};

    if (wallet_address) {
      const lastConnectedAddress = user.wallet_last_connected_address || "";
      const lastConnectedAt = user.wallet_last_connected_at
        ? new Date(user.wallet_last_connected_at)
        : null;
      const walletSwitchCooldownActive =
        lastConnectedAddress &&
        lastConnectedAt &&
        lastConnectedAddress !== wallet_address &&
        Date.now() - lastConnectedAt.getTime() < DIFFERENT_WALLET_COOLDOWN_MS;

      if (walletSwitchCooldownActive) {
        enrichContext({
          outcome: "validation_failed",
          reason: "wallet_switch_cooldown_active",
        });
        response(
          res,
          400,
          "You can connect a different wallet 24 hours after your last wallet connection.",
          {
            reason_code: "SELLER_WALLET_SWITCH_COOLDOWN_ACTIVE",
          }
        );
        return;
      }

      const rpcUrl = process.env.SOLANA_RPC_URL;
      if (!rpcUrl) {
        logger.error("SOLANA_RPC_URL env var not set");
        response(res, 500, "Payment system configuration error");
        return;
      }

      const usdcMint = resolveUsdcMintAddress(
        process.env.SOLANA_NETWORK,
        process.env.SOLANA_USDC_MINT
      );

      if (!usdcMint) {
        logger.error("SOLANA_USDC_MINT env var not set and no network default");
        response(res, 500, "Payment system configuration error");
        return;
      }

      let ataStatus;
      try {
        ataStatus = await getAssociatedTokenAccountStatus({
          ownerWallet: wallet_address,
          mintAddress: usdcMint,
          rpcUrl,
        });
      } catch (ataLookupError) {
        logger.error(
          "Failed to check seller USDC ATA during wallet connection",
          ataLookupError
        );
        response(
          res,
          503,
          "We couldn't verify your USDC receiving account right now. Please try again."
        );
        return;
      }

      if (!ataStatus.exists) {
        const sponsorSecretKey = process.env.SOLANA_ATA_SPONSOR_SECRET_KEY;
        if (!sponsorSecretKey) {
          logger.error("SOLANA_ATA_SPONSOR_SECRET_KEY env var not set");
          response(
            res,
            503,
            "Wallet setup is temporarily unavailable. Please try again later.",
            {
              reason_code: "SELLER_USDC_ATA_CREATE_FAILED",
            }
          );
          return;
        }

        try {
          const sponsorshipResult = await sponsorAssociatedTokenAccount({
            ownerWallet: wallet_address,
            mintAddress: usdcMint,
            rpcUrl,
            sponsorSecretKey,
          });

          responseData.reason_code = "SELLER_USDC_ATA_CREATED";
          responseData.usdc_ata_address = sponsorshipResult.ataAddress;
          responseData.ata_creation_tx_signature =
            sponsorshipResult.txSignature;
          logger.info("Seller USDC ATA prepared during wallet connection", {
            userId: user._id?.toString?.() ?? userId,
            walletAddress: wallet_address,
            usdcMint,
            usdcAtaAddress: sponsorshipResult.ataAddress,
            ataCreationTxSignature: sponsorshipResult.txSignature,
            transactionFeeLamports: sponsorshipResult.transactionFeeLamports,
            ataRentLamports: sponsorshipResult.ataRentLamports,
            totalCostLamports: sponsorshipResult.totalCostLamports,
            transactionFeeSol: sponsorshipResult.transactionFeeSol,
            ataRentSol: sponsorshipResult.ataRentSol,
            totalCostSol: sponsorshipResult.totalCostSol,
          });
          successMessage =
            "Wallet connected and USDC receiving account is ready.";
        } catch (sponsorshipError) {
          logger.error(
            "Failed to sponsor seller USDC ATA during wallet connection",
            sponsorshipError
          );
          response(
            res,
            503,
            "We couldn't prepare your USDC receiving account right now. Please try again.",
            {
              reason_code: "SELLER_USDC_ATA_CREATE_FAILED",
            }
          );
          return;
        }
      } else {
        responseData.reason_code = "SELLER_USDC_ATA_ALREADY_EXISTS";
        responseData.usdc_ata_address = ataStatus.ataAddress;
        logger.info("Seller USDC ATA already exists during wallet connection", {
          userId: user._id?.toString?.() ?? userId,
          walletAddress: wallet_address,
          usdcMint,
          usdcAtaAddress: ataStatus.ataAddress,
        });
        successMessage = "Wallet connected successfully";
      }

      user.wallet_last_connected_address = wallet_address;
      user.wallet_last_connected_at = new Date();
    }

    user.wallet_address = wallet_address;
    const [, updateError] = await tryCatch(user.save());

    if (updateError) {
      enrichContext({
        outcome: "error",
        error: {
          name: "DatabaseError",
          message:
            updateError instanceof Error
              ? updateError.message
              : "Database update failed",
        },
      });
      logger.error("Failed to update wallet address", updateError);
      throw new ApiError("Internal Server Error", 500);
    }

    enrichContext({
      outcome: "success",
      wallet_action: wallet_address ? "set" : "removed",
    });

    response(res, 200, successMessage, responseData);
  }
);

export {
  getProfileInformation,
  updateProfileInformation,
  getWalletAddress,
  updateWalletAddress,
};
