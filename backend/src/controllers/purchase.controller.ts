import { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import asyncHandler from "../utils/asyncHandler.util";
import ApiError from "../utils/ApiError.util";
import response from "../utils/response.util";
import { enrichContext } from "../utils/asyncContext";
import { tryCatch } from "../utils/tryCatch.util";
import logger from "../logger/logger";
import { redisClient, s3Service } from "..";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import { GitHubAppInstallation } from "../models/githubAppInstallation.model";
import { Purchase } from "../models/purchase.model";
import { ProjectDownload } from "../models/projectDownload.model";
import { Sales } from "../models/sales.model";
import {
  initiatePurchaseSchema,
  confirmPurchaseSchema,
} from "../validations/purchase.validation";
import {
  getSolanaUsdRate,
  computeLamportSplit,
} from "../utils/solanaPrice.util";
import { verifySolanaTransaction } from "../utils/solanaVerification.util";
import { isProjectMarketplaceVisible } from "../utils/projectVisibility.util";

const PURCHASE_INTENT_TTL = 600; // 10 minutes

const PURCHASED_PROJECT_SELECT =
  "title description project_type tech_stack price avgRating totalReviews live_link createdAt project_images repo_zip_status scheduled_deletion_at";

const PURCHASED_SELLER_POPULATE = {
  path: "userid",
  select: "username name profile_image_url -_id",
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/purchases/initiate
// ─────────────────────────────────────────────────────────────────────────────
const initiatePurchase = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "initiate_purchase" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Unauthorized Access", 401);
  }

  // Validate request body
  const parseResult = initiatePurchaseSchema.safeParse(req.body);
  if (!parseResult.success) {
    enrichContext({ outcome: "validation_failed" });
    response(res, 400, parseResult.error.errors[0].message);
    return;
  }

  const { project_id } = parseResult.data;
  const buyerId = new mongoose.Types.ObjectId(req.user._id);
  const projectObjectId = new mongoose.Types.ObjectId(project_id);

  enrichContext({ entity: { type: "purchase", id: project_id } });

  // Fetch project
  const [project, projectError] = await tryCatch(
    Project.findById(projectObjectId)
      .select(
        "userid price isActive github_access_revoked repo_zip_status repo_zip_s3_key github_installation_id"
      )
      .lean()
  );

  if (projectError || !project) {
    enrichContext({ outcome: "not_found" });
    response(res, 404, "Project not found");
    return;
  }

  // Pre-purchase validation checks
  if (!project.isActive) {
    enrichContext({ outcome: "validation_failed", reason: "project_inactive" });
    response(res, 400, "Project is not currently active");
    return;
  }

  if (project.github_access_revoked) {
    enrichContext({
      outcome: "validation_failed",
      reason: "github_access_revoked",
    });
    response(res, 400, "Project source code access has been revoked");
    return;
  }

  if (project.repo_zip_status !== "SUCCESS" || !project.repo_zip_s3_key) {
    enrichContext({ outcome: "validation_failed", reason: "zip_not_ready" });
    response(res, 400, "Project files are not ready for download yet");
    return;
  }

  if (!project.price || project.price <= 0) {
    enrichContext({ outcome: "validation_failed", reason: "free_project" });
    response(res, 400, "This project is free and does not require a purchase");
    return;
  }

  const sellerId = project.userid as mongoose.Types.ObjectId;

  // Cannot purchase own project
  if (sellerId.toString() === buyerId.toString()) {
    enrichContext({ outcome: "validation_failed", reason: "self_purchase" });
    response(res, 400, "You cannot purchase your own project");
    return;
  }

  // Check if already purchased
  const [existingPurchase, existingPurchaseError] = await tryCatch(
    Purchase.findOne({ buyerId, projectId: projectObjectId }).lean()
  );

  if (existingPurchaseError) {
    logger.error("Failed to check existing purchase", existingPurchaseError);
    response(res, 500, "Failed to process purchase. Try again later.");
    return;
  }

  if (existingPurchase) {
    enrichContext({
      outcome: "validation_failed",
      reason: "already_purchased",
    });
    response(res, 409, "You have already purchased this project");
    return;
  }

  // Fetch seller to verify wallet
  const [seller, sellerError] = await tryCatch(
    User.findById(sellerId).select("wallet_address").lean()
  );

  if (sellerError || !seller) {
    logger.error("Failed to fetch seller", sellerError);
    response(res, 500, "Failed to process purchase. Try again later.");
    return;
  }

  if (!seller.wallet_address) {
    enrichContext({ outcome: "validation_failed", reason: "seller_no_wallet" });
    response(res, 400, "Seller has not connected a payment wallet");
    return;
  }

  // Check GitHub App installation is not suspended
  const [installation, installationError] = await tryCatch(
    GitHubAppInstallation.findOne({ user_id: sellerId })
      .select("suspended_at")
      .lean()
  );

  if (installationError) {
    logger.error("Failed to fetch installation", installationError);
    response(res, 500, "Failed to process purchase. Try again later.");
    return;
  }

  if (installation?.suspended_at) {
    enrichContext({
      outcome: "validation_failed",
      reason: "installation_suspended",
    });
    response(
      res,
      400,
      "Seller's GitHub App integration is currently suspended"
    );
    return;
  }

  // Get SOL/USD exchange rate
  let rateResult;
  try {
    rateResult = await getSolanaUsdRate();
  } catch (rateError: any) {
    enrichContext({ outcome: "error", reason: "oracle_unavailable" });
    response(
      res,
      503,
      rateError.message || "Price oracle unavailable, please try again shortly"
    );
    return;
  }

  const { rate, source, fetched_at } = rateResult;
  const price_usd = project.price as number;
  const price_sol_total = parseFloat((price_usd / rate).toFixed(9));

  const {
    totalLamports,
    sellerLamports,
    platformLamports,
    priceSolSeller,
    priceSolPlatform,
  } = computeLamportSplit(price_sol_total);

  const treasuryWallet = process.env.SOLANA_TREASURY_WALLET as string;
  if (!treasuryWallet) {
    logger.error("SOLANA_TREASURY_WALLET env var not set");
    response(res, 500, "Payment system configuration error");
    return;
  }

  // Generate unique purchase reference (nonce)
  const purchase_reference = crypto.randomBytes(32).toString("hex");

  const intentData = {
    buyerId: buyerId.toString(),
    sellerId: sellerId.toString(),
    projectId: projectObjectId.toString(),
    price_usd,
    price_sol_total,
    price_sol_seller: priceSolSeller,
    price_sol_platform: priceSolPlatform,
    total_lamports: totalLamports,
    seller_lamports: sellerLamports,
    treasury_lamports: platformLamports,
    sol_usd_rate: rate,
    exchange_rate_source: source,
    exchange_rate_fetched_at: fetched_at.toISOString(),
    seller_wallet: seller.wallet_address,
    treasury_wallet: treasuryWallet,
  };

  const [, redisError] = await tryCatch(
    redisClient.setex(
      `purchase_intent_${purchase_reference}`,
      PURCHASE_INTENT_TTL,
      JSON.stringify(intentData)
    )
  );

  if (redisError) {
    logger.error("Failed to store purchase intent in Redis", redisError);
    response(res, 500, "Failed to process purchase. Try again later.");
    return;
  }

  enrichContext({ outcome: "success", purchase_reference });
  response(res, 200, "Purchase initiated", {
    purchase_reference,
    price_usd,
    price_sol_total,
    price_sol_seller: priceSolSeller,
    price_sol_platform: priceSolPlatform,
    // Raw lamport values so the frontend constructs the TX using the exact same
    // amounts the backend will verify. Avoids any float re-computation divergence.
    seller_lamports: sellerLamports,
    treasury_lamports: platformLamports,
    seller_wallet: seller.wallet_address,
    treasury_wallet: treasuryWallet,
    sol_usd_rate: rate,
    exchange_rate_fetched_at: fetched_at.toISOString(),
    expires_in: PURCHASE_INTENT_TTL,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/purchases/confirm
// ─────────────────────────────────────────────────────────────────────────────
const confirmPurchase = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "confirm_purchase" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Unauthorized Access", 401);
  }

  const parseResult = confirmPurchaseSchema.safeParse(req.body);
  if (!parseResult.success) {
    enrichContext({ outcome: "validation_failed" });
    response(res, 400, parseResult.error.errors[0].message);
    return;
  }

  const { purchase_reference, tx_signature, buyer_wallet } = parseResult.data;
  const buyerId = new mongoose.Types.ObjectId(req.user._id);

  enrichContext({
    entity: { type: "purchase" },
    purchase_reference,
    tx_signature,
  });

  // ── Step 1: Check tx_signature idempotency BEFORE touching Redis.
  // This is the critical fix for the retryConfirm failure scenario:
  //   1st attempt: GET intent → verify TX → Purchase.create fails (DB down) → 500, intent NOT deleted
  //   Retry: tx_sig still not in DB → GET intent → still valid → proceed → create → success
  //
  // If Purchase.create already succeeded (e.g. duplicate network request), we short-circuit here
  // before even reading Redis — saves a Redis round-trip on the hot idempotent path.
  const [existingByTx, txCheckError] = await tryCatch(
    Purchase.findOne({ tx_signature }).select("_id projectId").lean()
  );

  if (txCheckError) {
    logger.error("Failed to check tx_signature uniqueness", txCheckError);
    response(res, 500, "Failed to process purchase. Try again later.");
    return;
  }

  if (existingByTx) {
    enrichContext({
      outcome: "success",
      reason: "already_confirmed_idempotent",
    });
    response(res, 200, "Purchase already confirmed", {
      projectId: existingByTx.projectId,
    });
    return;
  }

  // ── Step 2: GET the intent from Redis (non-destructive — do NOT delete yet).
  // We delete it only after a successful Purchase.create so that if the DB write
  // fails, the user can retry and the intent is still available.
  const intentKey = `purchase_intent_${purchase_reference}`;
  let intentStr: string | null = null;
  try {
    intentStr = await redisClient.get(intentKey);
  } catch (redisErr) {
    logger.error("Redis GET failed during confirm purchase", redisErr);
    response(res, 500, "Failed to process purchase. Try again later.");
    return;
  }

  if (!intentStr) {
    // Intent is gone (expired or never existed). As a last-resort check, look up
    // by tx_signature one more time in case the intent was already deleted by a
    // successful concurrent request that raced us here.
    const [raceCheck, raceCheckErr] = await tryCatch(
      Purchase.findOne({ tx_signature }).select("_id projectId").lean()
    );
    if (!raceCheckErr && raceCheck) {
      enrichContext({
        outcome: "success",
        reason: "race_condition_idempotent_late",
      });
      response(res, 200, "Purchase already confirmed", {
        projectId: raceCheck.projectId,
      });
      return;
    }
    enrichContext({
      outcome: "validation_failed",
      reason: "intent_expired",
    });
    response(
      res,
      410,
      "Purchase session expired. Please start a new purchase."
    );
    return;
  }

  let intent: any;
  try {
    intent = JSON.parse(intentStr);
  } catch {
    response(res, 500, "Invalid purchase intent data");
    return;
  }

  // Verify this buyer matches the intent
  if (intent.buyerId !== buyerId.toString()) {
    enrichContext({ outcome: "forbidden", reason: "buyer_mismatch" });
    response(res, 403, "Purchase intent does not match your session");
    return;
  }

  // Check no duplicate purchase exists
  const projectObjectId = new mongoose.Types.ObjectId(intent.projectId);
  const [existingPurchase, existingError] = await tryCatch(
    Purchase.findOne({ buyerId, projectId: projectObjectId }).lean()
  );

  if (existingError) {
    logger.error("Failed to check existing purchase", existingError);
    response(res, 500, "Failed to process purchase. Try again later.");
    return;
  }

  if (existingPurchase) {
    enrichContext({
      outcome: "validation_failed",
      reason: "already_purchased",
    });
    response(res, 409, "You have already purchased this project");
    return;
  }

  // Verify the Solana transaction on-chain
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    logger.error("SOLANA_RPC_URL env var not set");
    response(res, 500, "Payment system configuration error");
    return;
  }

  // Only fall back to public mainnet if configured for mainnet-beta.
  // Never use mainnet as a fallback for devnet/testnet — transactions don't cross networks.
  const isMainnet = process.env.SOLANA_NETWORK === "mainnet-beta";
  const verifyResult = await verifySolanaTransaction({
    txSignature: tx_signature,
    expectedBuyerWallet: buyer_wallet,
    expectedSellerWallet: intent.seller_wallet,
    expectedTreasuryWallet: intent.treasury_wallet,
    expectedSellerLamports: intent.seller_lamports,
    expectedTreasuryLamports: intent.treasury_lamports,
    purchaseReference: purchase_reference,
    rpcUrl,
    fallbackRpcUrl: isMainnet
      ? "https://api.mainnet-beta.solana.com"
      : undefined,
  });

  if (!verifyResult.valid) {
    enrichContext({
      outcome: "validation_failed",
      reason: "tx_verification_failed",
      tx_error: verifyResult.error,
    });
    logger.warn("Transaction verification failed", {
      tx_signature,
      error: verifyResult.error,
    });
    response(res, 400, verifyResult.error || "Transaction verification failed");
    return;
  }

  // Save Purchase document
  const platformFeePercent = parseInt(
    process.env.PLATFORM_FEE_PERCENT || "1",
    10
  );

  // Fetch project and seller snapshots (non-fatal — fall back to placeholders)
  const [[projectSnap], [sellerSnap]] = await Promise.all([
    tryCatch(
      Project.findById(projectObjectId).select("title project_type").lean()
    ),
    tryCatch(
      User.findById(new mongoose.Types.ObjectId(intent.sellerId))
        .select("name username profile_image_url")
        .lean()
    ),
  ]);

  const [newPurchase, saveError] = await tryCatch(
    Purchase.create({
      buyerId,
      sellerId: new mongoose.Types.ObjectId(intent.sellerId),
      projectId: projectObjectId,
      price_usd: intent.price_usd,
      price_sol_total: intent.price_sol_total,
      price_sol_seller: intent.price_sol_seller,
      price_sol_platform: intent.price_sol_platform,
      platform_fee_percent: platformFeePercent,
      sol_usd_rate: intent.sol_usd_rate,
      exchange_rate_source: intent.exchange_rate_source,
      exchange_rate_fetched_at: new Date(intent.exchange_rate_fetched_at),
      buyer_wallet,
      seller_wallet: intent.seller_wallet,
      treasury_wallet: intent.treasury_wallet,
      tx_signature,
      purchase_reference,
      status: "CONFIRMED",
      project_snapshot: {
        title: (projectSnap?.title as string) || "Unknown Project",
        project_type: (projectSnap?.project_type as string) || "Unknown",
      },
      seller_snapshot: {
        name:
          (sellerSnap?.name as string) ||
          (sellerSnap?.username as string) ||
          "Unknown",
        username: (sellerSnap?.username as string) || "",
        profile_image_url: (sellerSnap?.profile_image_url as string) || "",
      },
    })
  );

  if (saveError || !newPurchase) {
    // Check if it was a duplicate key error (race condition — another request confirmed first).
    // DEL the intent since the purchase IS confirmed (by the other concurrent request).
    if ((saveError as any)?.code === 11000) {
      await tryCatch(redisClient.del(intentKey));
      enrichContext({
        outcome: "success",
        reason: "race_condition_idempotent",
      });
      response(res, 200, "Purchase already confirmed", {
        projectId: intent.projectId,
      });
      return;
    }
    // Generic DB error: do NOT delete the intent from Redis.
    // The user can retry /confirm and the intent will still be there (within its TTL).
    logger.error("Failed to save purchase", saveError);
    response(
      res,
      500,
      "Failed to record purchase. Contact support with your transaction ID."
    );
    return;
  }

  // Purchase saved — now atomically delete the intent to prevent future replay.
  // (No need to check error here: if DEL fails, the intent expires naturally after TTL.)
  await tryCatch(redisClient.del(intentKey));

  // Remove project from buyer's wishlist if present (non-fatal)
  const [, wishlistCleanupErr] = await tryCatch(
    User.updateOne({ _id: buyerId }, { $pull: { wishlist: projectObjectId } })
  );
  if (wishlistCleanupErr) {
    logger.error(
      "Failed to remove purchased project from wishlist",
      wishlistCleanupErr
    );
  }

  // Update seller Sales document (fully atomic, race-condition-safe).
  //
  // The previous approach (findOne → conditional save → updateOne) had a TOCTOU race:
  // two concurrent purchases for the same seller could both find no Sales doc and both
  // try to create one (duplicate-key violation), OR both push a year entry leading to
  // duplicate year sub-documents that double-count on subsequent $inc operations.
  //
  // Fix: two individually-atomic MongoDB operations.
  //
  // Step 1 — ensure the Sales doc and current year/month skeleton exist (idempotent).
  //   • upsert:true creates the doc if absent.
  //   • The filter `"yearly_sales.year": { $ne: currentYear }` ensures $push only runs
  //     when the year is absent — if two concurrent calls race here, only the first $push
  //     wins (MongoDB atomically checks the filter + applies the update). The second call's
  //     filter no longer matches so it becomes a no-op.  No duplicate year entries.
  //
  // Step 2 — atomically $inc total_sales and the correct monthly bucket.
  //   • arrayFilters guarantee we hit exactly the right year/month sub-document.
  //   • $inc is always atomic regardless of concurrent callers.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const sellerId = new mongoose.Types.ObjectId(intent.sellerId);

  const blankMonthlySales = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    sales: 0,
  }));

  const [, salesError] = await tryCatch(async () => {
    // Step 1a: upsert the Sales document itself (no-op if it already exists).
    await Sales.updateOne(
      { userId: sellerId },
      {
        $setOnInsert: {
          userId: sellerId,
          yearly_sales: [],
          total_sales: 0,
          active_projects: 0,
          customer_rating: 0,
          best_seller: "",
        },
      },
      { upsert: true }
    );

    // Step 1b: push the current year entry only if it doesn't already exist.
    // The compound filter `"yearly_sales.year": { $ne: currentYear }` makes this a no-op
    // if the year is present, so concurrent calls cannot create duplicate year entries.
    await Sales.updateOne(
      { userId: sellerId, "yearly_sales.year": { $ne: currentYear } },
      {
        $push: {
          yearly_sales: {
            year: currentYear,
            monthly_sales: blankMonthlySales,
          },
        },
      }
    );

    // Step 2: atomic $inc — both total_sales and the matching monthly bucket.
    await Sales.updateOne(
      { userId: sellerId },
      {
        $inc: {
          total_sales: intent.price_usd,
          "yearly_sales.$[yr].monthly_sales.$[mo].sales": intent.price_usd,
        },
      },
      {
        arrayFilters: [
          { "yr.year": currentYear },
          { "mo.month": currentMonth },
        ],
      }
    );
  });

  if (salesError) {
    // Non-fatal: log but don't fail the purchase response
    logger.error("Failed to update seller Sales document", salesError);
  }

  enrichContext({ outcome: "success", projectId: intent.projectId });
  response(res, 200, "Purchase confirmed successfully", {
    projectId: intent.projectId,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/purchases/getPurchasedProjects
// ─────────────────────────────────────────────────────────────────────────────
const getPurchasedProjects = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_purchased_projects" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Unauthorized Access", 401);
    }

    const buyerId = new mongoose.Types.ObjectId(req.user._id);

    // Parse optional pagination params (only active when limit is explicitly provided)
    const rawLimit = req.query.limit;
    const rawOffset = req.query.offset;
    const limit = rawLimit
      ? Math.min(Math.max(parseInt(rawLimit as string, 10) || 12, 1), 50)
      : null;
    const offset = rawOffset
      ? Math.max(parseInt(rawOffset as string, 10) || 0, 0)
      : 0;

    const baseQuery = { buyerId, status: "CONFIRMED" };

    const mapPurchase = (p: any) => ({
      _id: p._id,
      projectId: p.projectId
        ? {
            ...p.projectId,
            project_images: p.projectId.project_images?.[0] ?? "",
          }
        : null,
      price_usd: p.price_usd,
      price_sol_total: p.price_sol_total,
      buyer_wallet: p.buyer_wallet,
      tx_signature: p.tx_signature,
      createdAt: p.createdAt,
      project_snapshot: p.project_snapshot,
      seller_snapshot: p.seller_snapshot,
    });

    if (limit !== null) {
      // Paginated path
      const [[purchases, purchasesError], [totalCount, countError]] =
        await Promise.all([
          tryCatch(
            Purchase.find(baseQuery)
              .populate({
                path: "projectId",
                select: PURCHASED_PROJECT_SELECT,
                populate: PURCHASED_SELLER_POPULATE,
              })
              .sort({ createdAt: -1 })
              .skip(offset)
              .limit(limit)
              .lean()
          ),
          tryCatch(Purchase.countDocuments(baseQuery)),
        ]);

      if (purchasesError || countError) {
        logger.error(
          "Failed to fetch purchased projects",
          purchasesError ?? countError
        );
        response(res, 500, "Failed to fetch purchases. Try again later.");
        return;
      }

      const validPurchases = (purchases ?? []).map(mapPurchase);
      const total = totalCount ?? 0;
      const hasNextPage = offset + limit < total;
      const hasPrevPage = offset > 0;
      const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
      const currentPage = Math.floor(offset / limit) + 1;

      enrichContext({ outcome: "success", purchase_count: total });
      response(res, 200, "Purchased projects fetched successfully", {
        purchases: validPurchases,
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
      // Non-paginated path (backward compatible — returns all purchases)
      const [purchases, purchasesError] = await tryCatch(
        Purchase.find(baseQuery)
          .populate({
            path: "projectId",
            select: PURCHASED_PROJECT_SELECT,
            populate: PURCHASED_SELLER_POPULATE,
          })
          .sort({ createdAt: -1 })
          .lean()
      );

      if (purchasesError) {
        logger.error("Failed to fetch purchased projects", purchasesError);
        response(res, 500, "Failed to fetch purchases. Try again later.");
        return;
      }

      // Return all purchases, including those where the project has been hard-deleted (projectId = null).
      // Snapshot fields provide fallback data for deleted-project purchases.
      const validPurchases = (purchases ?? []).map(mapPurchase);

      enrichContext({
        outcome: "success",
        purchase_count: validPurchases.length,
      });
      response(res, 200, "Purchased projects fetched successfully", {
        purchases: validPurchases,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/purchases/download?project_id=X
// ─────────────────────────────────────────────────────────────────────────────
const downloadProject = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "download_project" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Unauthorized Access", 401);
  }

  const { project_id } = req.query;

  if (
    !project_id ||
    typeof project_id !== "string" ||
    !mongoose.Types.ObjectId.isValid(project_id)
  ) {
    enrichContext({ outcome: "validation_failed" });
    response(res, 400, "Valid project_id is required");
    return;
  }

  const buyerId = new mongoose.Types.ObjectId(req.user._id);
  const projectObjectId = new mongoose.Types.ObjectId(project_id);

  // Fetch project info first (price determines whether a purchase record is required)
  const [project, projectError] = await tryCatch(
    Project.findById(projectObjectId)
      .select(
        "userid isActive github_access_revoked scheduled_deletion_at repo_zip_status repo_zip_s3_key title price"
      )
      .lean()
  );

  if (projectError || !project) {
    response(res, 404, "Project not found");
    return;
  }

  if (project.repo_zip_status !== "SUCCESS" || !project.repo_zip_s3_key) {
    enrichContext({
      outcome: "validation_failed",
      reason: "zip_not_available",
    });
    response(
      res,
      400,
      "Project files are not available for download at this time"
    );
    return;
  }

  const [zipExists, zipExistsError] = await tryCatch(
    s3Service.objectExists(project.repo_zip_s3_key as string)
  );

  if (zipExistsError) {
    logger.error("Failed to verify repo ZIP existence before download", {
      projectId: project_id,
      s3Key: project.repo_zip_s3_key,
      error:
        zipExistsError instanceof Error
          ? zipExistsError.message
          : "Unknown error",
    });
    response(res, 500, "Failed to generate download link. Try again later.");
    return;
  }

  if (!zipExists) {
    enrichContext({
      outcome: "validation_failed",
      reason: "zip_missing_from_storage",
    });
    logger.warn("Project repo ZIP missing from storage during download", {
      projectId: project_id,
      s3Key: project.repo_zip_s3_key,
    });
    response(
      res,
      400,
      "Project files are not available for download at this time"
    );
    return;
  }

  let hasConfirmedPurchase = false;

  // For paid projects, verify the buyer has purchased this project
  if (project.price > 0) {
    const [purchase, purchaseError] = await tryCatch(
      Purchase.findOne({
        buyerId,
        projectId: projectObjectId,
        status: "CONFIRMED",
      })
        .select("_id")
        .lean()
    );

    if (purchaseError) {
      logger.error("Failed to verify purchase for download", purchaseError);
      response(res, 500, "Failed to process download. Try again later.");
      return;
    }

    hasConfirmedPurchase = Boolean(purchase);
  }

  if (!hasConfirmedPurchase && !isProjectMarketplaceVisible(project)) {
    enrichContext({
      outcome: "forbidden",
      reason: "project_not_marketplace_visible",
    });
    response(res, 403, "This project is not currently available for download");
    return;
  }

  if (project.price > 0 && !hasConfirmedPurchase) {
    enrichContext({ outcome: "forbidden", reason: "not_purchased" });
    response(res, 403, "You have not purchased this project");
    return;
  }

  // Build a clean filename from the project title (strip characters unsafe in filenames)
  const safeTitle = ((project.title as string) || "project")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);
  const downloadFilename = `${safeTitle}.zip`;

  // Generate presigned download URL (15 minutes)
  const [downloadUrl, downloadError] = await tryCatch(
    s3Service.createSignedDownloadUrl(
      project.repo_zip_s3_key as string,
      900,
      downloadFilename
    )
  );

  if (downloadError || !downloadUrl) {
    logger.error("Failed to generate download URL", downloadError);
    response(res, 500, "Failed to generate download link. Try again later.");
    return;
  }

  const sellerId = (project.userid as mongoose.Types.ObjectId | undefined)
    ?.toString?.()
    ?.trim();

  if (sellerId && sellerId !== buyerId.toString()) {
    const [, projectDownloadError] = await tryCatch(
      ProjectDownload.updateOne(
        {
          projectId: projectObjectId,
          userId: buyerId,
        },
        {
          $setOnInsert: {
            projectId: projectObjectId,
            userId: buyerId,
            sellerId: new mongoose.Types.ObjectId(sellerId),
          },
        },
        { upsert: true }
      )
    );

    if (projectDownloadError) {
      logger.error("Failed to record unique project download", {
        projectId: project_id,
        buyerId: buyerId.toString(),
        error:
          projectDownloadError instanceof Error
            ? projectDownloadError.message
            : "Unknown error",
      });
    }
  }

  enrichContext({ outcome: "success", project_id });
  response(res, 200, "Download URL generated", { download_url: downloadUrl });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/purchases/receipt?purchase_id=X
// ─────────────────────────────────────────────────────────────────────────────
const downloadReceipt = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "download_receipt" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Unauthorized Access", 401);
  }

  const { purchase_id } = req.query;

  if (
    !purchase_id ||
    typeof purchase_id !== "string" ||
    !mongoose.Types.ObjectId.isValid(purchase_id)
  ) {
    enrichContext({ outcome: "validation_failed" });
    response(res, 400, "Valid purchase_id is required");
    return;
  }

  const buyerId = new mongoose.Types.ObjectId(req.user._id);
  const purchaseObjectId = new mongoose.Types.ObjectId(purchase_id);

  // Fetch purchase — only for this buyer, only confirmed
  const [purchase, purchaseError] = await tryCatch(
    Purchase.findOne({
      _id: purchaseObjectId,
      buyerId,
      status: "CONFIRMED",
    }).lean()
  );

  if (purchaseError) {
    logger.error("Failed to fetch purchase for receipt", purchaseError);
    response(res, 500, "Failed to generate receipt. Try again later.");
    return;
  }

  if (!purchase) {
    enrichContext({ outcome: "not_found" });
    response(res, 404, "Purchase not found");
    return;
  }

  // Fetch buyer, seller, and project details in parallel
  // Project may be null if hard-deleted; fall back to purchase snapshots
  const [buyerResult, sellerResult, projectResult] = await Promise.all([
    tryCatch(User.findById(purchase.buyerId).select("username name").lean()),
    tryCatch(User.findById(purchase.sellerId).select("username name").lean()),
    tryCatch(
      Project.findById(purchase.projectId)
        .select("title project_type tech_stack price")
        .lean()
    ),
  ]);

  const [buyer, buyerErr] = buyerResult;
  const [seller, sellerErr] = sellerResult;
  const [project, projectErr] = projectResult;

  if (buyerErr || sellerErr || !buyer || !seller) {
    logger.error("Failed to fetch receipt data", {
      buyerErr,
      sellerErr,
      projectErr,
    });
    response(res, 500, "Failed to generate receipt. Try again later.");
    return;
  }

  // Resolve project fields — live data preferred, snapshot as fallback
  const snap = (purchase as any).project_snapshot ?? {};
  const projectTitle = (project?.title as string) || snap.title || "N/A";
  const projectType =
    (project?.project_type as string) || snap.project_type || "N/A";
  const projectTechStack: string[] = (project?.tech_stack as string[]) || [];
  const projectPrice = project
    ? `$${project.price} USD`
    : `$${(purchase.price_usd as number).toFixed(2)} USD (at time of purchase)`;

  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const safeRef = (purchase.purchase_reference as string)
    .slice(0, 16)
    .toUpperCase();
  const filename = `devsdistro-receipt-${safeRef}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Helper: draw the DevsDistro "D" logo in two-tone (black top-left / red bottom-right)
  const drawDevsDistroLogo = (lx: number, ly: number, size: number): void => {
    const s = size / 100;
    // Builds the D-shape path (outer hexagon minus inner rectangle) at an offset
    const buildDPath = (offsetX: number, offsetY: number): string => {
      const px = (v: number) => (lx + offsetX + v * s).toFixed(2);
      const py = (v: number) => (ly + offsetY + v * s).toFixed(2);
      return [
        `M ${px(20)} ${py(15)}`,
        `L ${px(60)} ${py(15)}`,
        `L ${px(80)} ${py(35)}`,
        `L ${px(80)} ${py(65)}`,
        `L ${px(60)} ${py(85)}`,
        `L ${px(20)} ${py(85)}`,
        `Z`,
        `M ${px(42)} ${py(37)}`,
        `L ${px(58)} ${py(37)}`,
        `L ${px(58)} ${py(63)}`,
        `L ${px(42)} ${py(63)}`,
        `Z`,
      ].join(" ");
    };
    // Diagonal clip: split at the anti-diagonal (top-right → bottom-left)
    const r = (n: number) => n.toFixed(2);
    const clipTop = `M ${r(lx)} ${r(ly)} L ${r(lx + size)} ${r(ly)} L ${r(lx)} ${r(ly + size)} Z`;
    const clipBottom = `M ${r(lx + size)} ${r(ly)} L ${r(lx + size)} ${r(ly + size)} L ${r(lx)} ${r(ly + size)} Z`;
    // Black top-left portion
    doc.save();
    doc.path(clipTop).clip();
    doc.path(buildDPath(0, 0)).fill("#1a1a1a", "even-odd");
    doc.restore();
    // Red bottom-right portion (offset -6, +6 matching the SVG source)
    doc.save();
    doc.path(clipBottom).clip();
    doc.path(buildDPath(-6 * s, 6 * s)).fill("#FF3333", "even-odd");
    doc.restore();
  };

  const purchaseDate = new Date(purchase.createdAt as Date).toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }
  );
  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const pageWidth = doc.page.width - 100; // accounting for margins

  // ── HEADER ──
  drawDevsDistroLogo(50, 46, 28); // 28×28pt logo

  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor("#000000")
    .text("DEVSDISTRO", 84, 50);

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#666666")
    .text(
      "A decentralized protocol for code monetization powered by Solana and GitHub.",
      84,
      78
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#000000")
    .text("PURCHASE RECEIPT", 50, 110);

  doc
    .moveTo(50, 135)
    .lineTo(doc.page.width - 50, 135)
    .lineWidth(2)
    .stroke("#000000");

  // ── TRANSACTION INFO ──
  doc.moveDown(1);
  let y = 150;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("TRANSACTION DETAILS", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  // Guards against content overflowing the A4 page (841pt height, 50pt margin).
  // Called before rendering each section header.
  const PAGE_BOTTOM_MARGIN = 100; // leave room for footer
  const ensurePageRoom = (currentY: number, needed = 60): number => {
    if (currentY + needed > doc.page.height - PAGE_BOTTOM_MARGIN) {
      doc.addPage();
      return 50;
    }
    return currentY;
  };

  const row = (label: string, value: string, yPos: number): number => {
    const safeY = ensurePageRoom(yPos, 20);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#333333")
      .text(label, 50, safeY, { width: 160, lineGap: 2 });
    const labelEndY = doc.y;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#000000")
      .text(value, 215, safeY, { width: pageWidth - 165, lineGap: 2 });
    const valueEndY = doc.y;
    return Math.max(labelEndY, valueEndY) + 6;
  };

  y = row("Purchase Reference:", purchase.purchase_reference as string, y);
  y = row("Transaction Signature:", purchase.tx_signature as string, y);
  y = row("Purchase Date:", purchaseDate, y);
  y = row("Status:", "CONFIRMED", y);
  y += 12;

  // ── PROJECT INFO ──
  y = ensurePageRoom(y);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("PROJECT", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  y = row("Title:", projectTitle, y);
  y = row("Type:", projectType, y);
  y = row("Tech Stack:", projectTechStack.join(", ") || "N/A", y);
  y = row("Listed Price:", projectPrice, y);
  y += 12;

  // ── FINANCIAL SUMMARY ──
  y = ensurePageRoom(y);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("FINANCIAL SUMMARY", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  y = row(
    "Amount Paid (USD):",
    `$${(purchase.price_usd as number).toFixed(2)}`,
    y
  );
  y = row("Amount Paid (SOL):", `${purchase.price_sol_total} SOL`, y);
  y = row(
    `Seller Received (${100 - (purchase.platform_fee_percent as number)}%):`,
    `${purchase.price_sol_seller} SOL`,
    y
  );
  y = row(
    `Platform Fee (${purchase.platform_fee_percent}%):`,
    `${purchase.price_sol_platform} SOL`,
    y
  );
  y = row("SOL/USD Rate at Purchase:", `$${purchase.sol_usd_rate} per SOL`, y);
  y = row(
    "Rate Source:",
    (purchase.exchange_rate_source as string) || "CoinGecko",
    y
  );
  y = row(
    "Rate Timestamp:",
    new Date(purchase.exchange_rate_fetched_at as Date).toISOString(),
    y
  );
  y += 12;

  // ── PARTIES ──
  y = ensurePageRoom(y, 100);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("PARTIES", 50, y);
  y += 18;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 10;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#333333")
    .text("BUYER", 50, y);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#333333")
    .text("SELLER", doc.page.width / 2, y);
  y += 14;

  const halfWidth = pageWidth / 2 - 10;
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text(
    `Name: ${(buyer.name as string) || (buyer.username as string)}`,
    50,
    y,
    { width: halfWidth }
  );
  doc.text(
    `Name: ${(seller.name as string) || (seller.username as string)}`,
    doc.page.width / 2,
    y,
    { width: halfWidth }
  );
  y += 14;
  doc.text(`@${buyer.username}`, 50, y, { width: halfWidth });
  doc.text(`@${seller.username}`, doc.page.width / 2, y, { width: halfWidth });
  y += 14;
  doc.font("Helvetica").fontSize(8).fillColor("#555555");
  doc.text(`Wallet: ${purchase.buyer_wallet}`, 50, y, { width: halfWidth });
  doc.text(`Wallet: ${purchase.seller_wallet}`, doc.page.width / 2, y, {
    width: halfWidth,
  });
  y += 20;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(0.5)
    .stroke("#CCCCCC");
  y += 14;

  // ── LEGAL TERMS ──
  y = ensurePageRoom(y, 120);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#CC0000")
    .text("TERMS & CONDITIONS", 50, y);
  y += 18;

  const terms = [
    "1. This receipt confirms that the above purchase was executed on the DevsDistro platform and that payment was transferred via the Solana blockchain as indicated by the transaction signature above.",
    "2. This purchase grants the buyer a non-exclusive, non-transferable license to use the acquired source code for personal or commercial projects. Resale or redistribution of the source code as-is is prohibited unless separately agreed in writing with the seller.",
    "3. Intellectual property rights, including copyright, remain with the original seller unless a separate written agreement explicitly transfers such rights.",
    "4. This sale is final. No refunds will be issued once payment has been confirmed on-chain.",
    "5. DevsDistro acts solely as a marketplace facilitator and is not liable for the quality, functionality, security, or fitness for purpose of any project sold through the platform.",
    "6. In the event of a dispute, buyers should contact DevsDistro support with the Purchase Reference above. DevsDistro will make reasonable efforts to assist but cannot guarantee resolution.",
    "7. This document serves as proof of purchase for the transaction described herein. It is generated automatically by DevsDistro and is valid without a physical signature.",
  ];

  doc.font("Helvetica").fontSize(8.5).fillColor("#222222");
  for (const term of terms) {
    y = ensurePageRoom(y, 40);
    doc.text(term, 50, y, { width: pageWidth, lineGap: 2 });
    y = doc.y + 8;
  }

  y += 10;
  doc
    .moveTo(50, y)
    .lineTo(doc.page.width - 50, y)
    .lineWidth(2)
    .stroke("#000000");
  y += 12;

  // ── FOOTER ──
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#888888")
    .text(`Generated by DevsDistro · ${generatedAt}`, 50, y, {
      width: pageWidth,
      align: "center",
    });

  doc.end();

  enrichContext({ outcome: "success", purchase_id });
});

export {
  initiatePurchase,
  confirmPurchase,
  getPurchasedProjects,
  downloadProject,
  downloadReceipt,
};
