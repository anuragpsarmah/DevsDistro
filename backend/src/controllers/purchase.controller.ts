import { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
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
import { ProjectPackage } from "../models/projectPackage.model";
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
import { DownloadVersion } from "../types/types";
import { renderPurchaseReceiptPdf } from "../utils/purchaseReceiptPdf.util";
import {
  computeUsdcSplit,
  derivePaymentSummary,
  normalizePaymentCurrency,
  resolveStoredPaymentCurrency,
  resolveUsdcMintAddress,
  type PaymentCurrency,
} from "../utils/payment.util";
import { getAssociatedTokenAccountStatus } from "../utils/solanaAta.util";
import {
  purchaseDownloadConfig,
  purchaseIntentConfig,
  purchaseNetworkConfig,
  purchasePaginationConfig,
  purchasePlatformConfig,
  purchasePurchasedProjectSelect,
  purchasePurchasedSellerPopulate,
  purchaseReceiptConfig,
  purchaseStatusConfig,
} from "../config/purchase.config";

const buildSafeDownloadFilename = (
  title: string | null | undefined
): string => {
  const safeTitle = (title || purchaseDownloadConfig.filenameFallback)
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, purchaseDownloadConfig.filenameMaxLength);

  return `${safeTitle || purchaseDownloadConfig.filenameFallback}.zip`;
};

const resolveIntentPaymentCurrency = (intent: any): PaymentCurrency =>
  resolveStoredPaymentCurrency(intent ?? {});

const recordProjectDownload = async ({
  projectId,
  sellerId,
  buyerId,
}: {
  projectId: mongoose.Types.ObjectId | null | undefined;
  sellerId: mongoose.Types.ObjectId | null | undefined;
  buyerId: mongoose.Types.ObjectId;
}): Promise<void> => {
  if (!projectId || !sellerId || sellerId.toString() === buyerId.toString()) {
    return;
  }

  const [, projectDownloadError] = await tryCatch(
    ProjectDownload.updateOne(
      {
        projectId,
        userId: buyerId,
      },
      {
        $setOnInsert: {
          projectId,
          userId: buyerId,
          sellerId,
        },
      },
      { upsert: true }
    )
  );

  if (projectDownloadError) {
    logger.error("Failed to record unique project download", {
      projectId: projectId.toString(),
      buyerId: buyerId.toString(),
      error:
        projectDownloadError instanceof Error
          ? projectDownloadError.message
          : "Unknown error",
    });
  }
};

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

  const { project_id, payment_currency } = parseResult.data;
  const paymentCurrency = normalizePaymentCurrency(payment_currency);
  const buyerId = new mongoose.Types.ObjectId(req.user._id);
  const projectObjectId = new mongoose.Types.ObjectId(project_id);

  enrichContext({ entity: { type: "purchase", id: project_id } });

  // Fetch project
  const [project, projectError] = await tryCatch(
    Project.findById(projectObjectId)
      .select(
        "userid price allow_payments_in_sol isActive github_access_revoked repo_zip_status repo_zip_s3_key github_installation_id"
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

  if (
    project.repo_zip_status !== purchaseStatusConfig.packageReadyStatus ||
    !project.repo_zip_s3_key
  ) {
    enrichContext({ outcome: "validation_failed", reason: "zip_not_ready" });
    response(res, 400, "Project files are not ready for download yet");
    return;
  }

  if (!project.price || project.price <= 0) {
    enrichContext({ outcome: "validation_failed", reason: "free_project" });
    response(res, 400, "This project is free and does not require a purchase");
    return;
  }

  if (paymentCurrency === "SOL" && !project.allow_payments_in_sol) {
    enrichContext({
      outcome: "validation_failed",
      reason: "sol_not_allowed",
    });
    response(res, 400, "This seller only accepts USDC for this project");
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

  const price_usd = project.price as number;
  const treasuryWallet = process.env.SOLANA_TREASURY_WALLET as string;
  if (!treasuryWallet) {
    logger.error("SOLANA_TREASURY_WALLET env var not set");
    response(res, 500, "Payment system configuration error");
    return;
  }

  let sol_usd_rate = 0;
  let exchange_rate_source = "USDC_FIXED";
  let exchange_rate_fetched_at = new Date();
  let price_sol_total = 0;
  let price_sol_seller = 0;
  let price_sol_platform = 0;
  let total_lamports = 0;
  let seller_lamports = 0;
  let treasury_lamports = 0;
  let payment_total = 0;
  let payment_seller = 0;
  let payment_platform = 0;
  let total_amount_atomic = 0;
  let seller_amount_atomic = 0;
  let treasury_amount_atomic = 0;
  let payment_mint: string | null = null;
  let payment_decimals = 9;

  if (paymentCurrency === "SOL") {
    let rateResult;
    try {
      rateResult = await getSolanaUsdRate();
    } catch (rateError: any) {
      enrichContext({ outcome: "error", reason: "oracle_unavailable" });
      response(
        res,
        503,
        rateError.message ||
          "Price oracle unavailable, please try again shortly"
      );
      return;
    }

    const { rate, source, fetched_at } = rateResult;
    sol_usd_rate = rate;
    exchange_rate_source = source;
    exchange_rate_fetched_at = fetched_at;
    price_sol_total = parseFloat((price_usd / rate).toFixed(9));

    const {
      totalLamports,
      sellerLamports,
      platformLamports,
      priceSolSeller,
      priceSolPlatform,
    } = computeLamportSplit(price_sol_total);

    total_lamports = totalLamports;
    seller_lamports = sellerLamports;
    treasury_lamports = platformLamports;
    price_sol_seller = priceSolSeller;
    price_sol_platform = priceSolPlatform;
    payment_total = price_sol_total;
    payment_seller = priceSolSeller;
    payment_platform = priceSolPlatform;
    total_amount_atomic = totalLamports;
    seller_amount_atomic = sellerLamports;
    treasury_amount_atomic = platformLamports;
  } else {
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

    let sellerAtaStatus;
    let treasuryAtaStatus;
    try {
      [sellerAtaStatus, treasuryAtaStatus] = await Promise.all([
        getAssociatedTokenAccountStatus({
          ownerWallet: seller.wallet_address,
          mintAddress: usdcMint,
          rpcUrl,
        }),
        getAssociatedTokenAccountStatus({
          ownerWallet: treasuryWallet,
          mintAddress: usdcMint,
          rpcUrl,
        }),
      ]);
    } catch (ataLookupError) {
      logger.error(
        "Failed to verify recipient USDC accounts during purchase initiation",
        ataLookupError
      );
      response(
        res,
        503,
        "Payment network is temporarily unavailable. Please try again."
      );
      return;
    }

    if (!sellerAtaStatus.exists) {
      enrichContext({
        outcome: "validation_failed",
        reason: "seller_usdc_ata_missing",
      });
      response(
        res,
        400,
        "Seller payment wallet is not ready to receive USDC yet."
      );
      return;
    }

    if (!treasuryAtaStatus.exists) {
      logger.error("Treasury USDC ATA is missing", {
        treasuryWallet,
        usdcMint,
      });
      response(res, 500, "Payment system configuration error");
      return;
    }

    const usdcSplit = computeUsdcSplit(price_usd);
    payment_mint = usdcMint;
    payment_decimals = 6;
    payment_total = usdcSplit.paymentTotal;
    payment_seller = usdcSplit.paymentSeller;
    payment_platform = usdcSplit.paymentPlatform;
    total_amount_atomic = usdcSplit.totalAtomic;
    seller_amount_atomic = usdcSplit.sellerAtomic;
    treasury_amount_atomic = usdcSplit.platformAtomic;
  }

  // Generate unique purchase reference (nonce)
  const purchase_reference = crypto
    .randomBytes(purchaseIntentConfig.referenceBytes)
    .toString("hex");

  const intentData = {
    buyerId: buyerId.toString(),
    sellerId: sellerId.toString(),
    projectId: projectObjectId.toString(),
    payment_currency: paymentCurrency,
    payment_total,
    payment_seller,
    payment_platform,
    payment_mint,
    payment_decimals,
    total_amount_atomic,
    seller_amount_atomic,
    treasury_amount_atomic,
    price_usd,
    price_sol_total,
    price_sol_seller,
    price_sol_platform,
    total_lamports,
    seller_lamports,
    treasury_lamports,
    sol_usd_rate,
    exchange_rate_source,
    exchange_rate_fetched_at: exchange_rate_fetched_at.toISOString(),
    seller_wallet: seller.wallet_address,
    treasury_wallet: treasuryWallet,
  };

  const [, redisError] = await tryCatch(
    redisClient.setex(
      `${purchaseIntentConfig.redisKeyPrefix}${purchase_reference}`,
      purchaseIntentConfig.ttlSeconds,
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
    payment_currency: paymentCurrency,
    payment_total,
    payment_seller,
    payment_platform,
    payment_mint,
    payment_decimals,
    seller_amount_atomic,
    treasury_amount_atomic,
    price_usd,
    price_sol_total,
    price_sol_seller,
    price_sol_platform,
    // Raw lamport values for exact frontend transaction construction.
    seller_lamports,
    treasury_lamports,
    seller_wallet: seller.wallet_address,
    treasury_wallet: treasuryWallet,
    sol_usd_rate,
    exchange_rate_source,
    exchange_rate_fetched_at: exchange_rate_fetched_at.toISOString(),
    expires_in: purchaseIntentConfig.ttlSeconds,
  });
});

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

  // Step 1: check tx_signature idempotency before Redis.
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

  // Step 2: read the intent from Redis without deleting it.
  const intentKey = `${purchaseIntentConfig.redisKeyPrefix}${purchase_reference}`;
  let intentStr: string | null = null;
  try {
    intentStr = await redisClient.get(intentKey);
  } catch (redisErr) {
    logger.error("Redis GET failed during confirm purchase", redisErr);
    response(res, 500, "Failed to process purchase. Try again later.");
    return;
  }

  if (!intentStr) {
    // Re-check by tx_signature in case another request already confirmed it.
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

  // Only use the public fallback RPC on mainnet-beta.
  const isMainnet =
    process.env.SOLANA_NETWORK === purchaseNetworkConfig.mainnetNetwork;
  const intentPaymentCurrency = resolveIntentPaymentCurrency(intent);
  const verifyResult = await verifySolanaTransaction({
    txSignature: tx_signature,
    expectedBuyerWallet: buyer_wallet,
    expectedSellerWallet: intent.seller_wallet,
    expectedTreasuryWallet: intent.treasury_wallet,
    paymentCurrency: intentPaymentCurrency,
    expectedMint: intent.payment_mint ?? undefined,
    expectedTotalAmountAtomic: intent.total_amount_atomic ?? 0,
    expectedSellerAmountAtomic: intent.seller_amount_atomic ?? 0,
    expectedTreasuryAmountAtomic: intent.treasury_amount_atomic ?? 0,
    expectedSellerLamports: intent.seller_lamports ?? 0,
    expectedTreasuryLamports: intent.treasury_lamports ?? 0,
    purchaseReference: purchase_reference,
    rpcUrl,
    fallbackRpcUrl: isMainnet
      ? purchaseNetworkConfig.mainnetFallbackRpcUrl
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
  const platformFeePercent = purchasePlatformConfig.platformFeePercent;

  // Fetch project and seller snapshots, with placeholder fallbacks.
  const [[projectSnap], [sellerSnap]] = await Promise.all([
    tryCatch(
      Project.findById(projectObjectId)
        .select(
          "title project_type tech_stack latest_package_id latest_package_commit_sha repo_zip_s3_key"
        )
        .lean()
    ),
    tryCatch(
      User.findById(new mongoose.Types.ObjectId(intent.sellerId))
        .select("name username profile_image_url")
        .lean()
    ),
  ]);

  if (
    !projectSnap?.latest_package_id ||
    !projectSnap?.latest_package_commit_sha ||
    !projectSnap?.repo_zip_s3_key
  ) {
    logger.error("Purchase confirm missing latest package metadata", {
      projectId: projectObjectId.toString(),
    });
    response(
      res,
      503,
      "Project package metadata is not ready yet. Please try again shortly."
    );
    return;
  }

  const [latestPackage, latestPackageError] = await tryCatch(
    ProjectPackage.findById(projectSnap.latest_package_id)
      .select("createdAt s3_key commit_sha")
      .lean()
  );

  if (
    latestPackageError ||
    !latestPackage ||
    latestPackage.s3_key !== projectSnap.repo_zip_s3_key ||
    latestPackage.commit_sha !== projectSnap.latest_package_commit_sha
  ) {
    logger.error("Purchase confirm failed to resolve retained package", {
      projectId: projectObjectId.toString(),
      error:
        latestPackageError instanceof Error
          ? latestPackageError.message
          : "Package missing or mismatched",
    });
    response(
      res,
      503,
      "Project package metadata is not ready yet. Please try again shortly."
    );
    return;
  }

  const [newPurchase, saveError] = await tryCatch(
    Purchase.create({
      buyerId,
      sellerId: new mongoose.Types.ObjectId(intent.sellerId),
      projectId: projectObjectId,
      price_usd: intent.price_usd,
      payment_currency: intentPaymentCurrency,
      payment_total: intent.payment_total,
      payment_seller: intent.payment_seller,
      payment_platform: intent.payment_platform,
      payment_mint: intent.payment_mint ?? null,
      payment_decimals: intent.payment_decimals ?? 9,
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
      status: purchaseStatusConfig.confirmedStatus,
      purchased_package_id: projectSnap.latest_package_id,
      project_snapshot: {
        title: (projectSnap?.title as string) || "Unknown Project",
        project_type: (projectSnap?.project_type as string) || "Unknown",
        tech_stack: Array.isArray(projectSnap?.tech_stack)
          ? (projectSnap.tech_stack as string[])
          : [],
      },
      seller_snapshot: {
        name:
          (sellerSnap?.name as string) ||
          (sellerSnap?.username as string) ||
          "Unknown",
        username: (sellerSnap?.username as string) || "",
        profile_image_url: (sellerSnap?.profile_image_url as string) || "",
      },
      package_snapshot: {
        commit_sha: latestPackage.commit_sha,
        s3_key: latestPackage.s3_key,
        packaged_at: latestPackage.createdAt,
      },
    })
  );

  if (saveError || !newPurchase) {
    // Duplicate key means another request already confirmed this purchase.
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
    // Keep the Redis intent so the user can retry /confirm.
    logger.error("Failed to save purchase", saveError);
    response(
      res,
      500,
      "Failed to record purchase. Contact support with your transaction ID."
    );
    return;
  }

  // Delete the intent after a successful save to prevent replay.
  await tryCatch(redisClient.del(intentKey));

  // Remove the project from the buyer's wishlist if present.
  const [, wishlistCleanupErr] = await tryCatch(
    User.updateOne({ _id: buyerId }, { $pull: { wishlist: projectObjectId } })
  );
  if (wishlistCleanupErr) {
    logger.error(
      "Failed to remove purchased project from wishlist",
      wishlistCleanupErr
    );
  }

  // Update seller sales using atomic upsert, year init, and increment steps.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const sellerId = new mongoose.Types.ObjectId(intent.sellerId);

  const blankMonthlySales = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    sales: 0,
  }));

  const [, salesError] = await tryCatch(async () => {
    // Step 1a: upsert the Sales document.
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

    // Step 1b: add the current year only if it is missing.
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

    // Step 2: atomically increment total and monthly sales.
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
    // Non-fatal: log without failing the purchase.
    logger.error("Failed to update seller Sales document", salesError);
  }

  enrichContext({ outcome: "success", projectId: intent.projectId });
  response(res, 200, "Purchase confirmed successfully", {
    projectId: intent.projectId,
  });
});

const getPurchasedProjects = asyncHandler(
  async (req: Request, res: Response) => {
    enrichContext({ action: "get_purchased_projects" });

    if (!req.user) {
      enrichContext({ outcome: "unauthorized" });
      throw new ApiError("Unauthorized Access", 401);
    }

    const buyerId = new mongoose.Types.ObjectId(req.user._id);

    // Parse optional pagination params when limit is provided.
    const rawLimit = req.query.limit;
    const rawOffset = req.query.offset;
    const limit = rawLimit
      ? Math.min(
          Math.max(
            parseInt(rawLimit as string, 10) ||
              purchasePaginationConfig.defaultLimit,
            purchasePaginationConfig.minLimit
          ),
          purchasePaginationConfig.maxLimit
        )
      : null;
    const offset = rawOffset
      ? Math.max(parseInt(rawOffset as string, 10) || 0, 0)
      : 0;

    const baseQuery = {
      buyerId,
      status: purchaseStatusConfig.confirmedStatus,
    };

    const mapPurchase = (p: any) => {
      const latestCommitSha = p.projectId?.latest_package_commit_sha || null;
      const purchasedCommitSha = p.package_snapshot?.commit_sha || null;
      const hasDistinctLatestVersion = Boolean(
        p.projectId?._id &&
        p.projectId?.repo_zip_status ===
          purchaseStatusConfig.packageReadyStatus &&
        latestCommitSha &&
        purchasedCommitSha &&
        latestCommitSha !== purchasedCommitSha
      );
      const paymentSummary = derivePaymentSummary(p);

      return {
        _id: p._id,
        projectId: p.projectId
          ? {
              ...p.projectId,
              project_images: p.projectId.project_images?.[0] ?? "",
            }
          : null,
        payment_currency: paymentSummary.payment_currency,
        payment_total: paymentSummary.payment_total,
        payment_seller: paymentSummary.payment_seller,
        payment_platform: paymentSummary.payment_platform,
        payment_mint: paymentSummary.payment_mint,
        price_usd: p.price_usd,
        price_sol_total: p.price_sol_total,
        buyer_wallet: p.buyer_wallet,
        tx_signature: p.tx_signature,
        createdAt: p.createdAt,
        project_snapshot: p.project_snapshot,
        seller_snapshot: p.seller_snapshot,
        purchased_package: p.package_snapshot
          ? {
              commit_sha: p.package_snapshot.commit_sha,
              packaged_at: p.package_snapshot.packaged_at,
            }
          : null,
        latest_package: p.projectId
          ? {
              commit_sha: latestCommitSha,
              repackage_status:
                p.projectId.repackage_status ||
                purchaseStatusConfig.repackageIdleStatus,
            }
          : null,
        can_download_purchased: Boolean(p.package_snapshot?.s3_key),
        can_download_latest: hasDistinctLatestVersion,
      };
    };

    if (limit !== null) {
      // Paginated response.
      const [[purchases, purchasesError], [totalCount, countError]] =
        await Promise.all([
          tryCatch(
            Purchase.find(baseQuery)
              .populate({
                path: "projectId",
                select: purchasePurchasedProjectSelect,
                populate: purchasePurchasedSellerPopulate,
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
      // Backward-compatible non-paginated response.
      const [purchases, purchasesError] = await tryCatch(
        Purchase.find(baseQuery)
          .populate({
            path: "projectId",
            select: purchasePurchasedProjectSelect,
            populate: purchasePurchasedSellerPopulate,
          })
          .sort({ createdAt: -1 })
          .lean()
      );

      if (purchasesError) {
        logger.error("Failed to fetch purchased projects", purchasesError);
        response(res, 500, "Failed to fetch purchases. Try again later.");
        return;
      }

      // Keep deleted-project purchases by falling back to snapshots.
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

const downloadProject = asyncHandler(async (req: Request, res: Response) => {
  enrichContext({ action: "download_project" });

  if (!req.user) {
    enrichContext({ outcome: "unauthorized" });
    throw new ApiError("Unauthorized Access", 401);
  }

  const { project_id } = req.query;
  const purchase_id = req.query.purchase_id;
  const versionRaw = req.query.version;
  const version: DownloadVersion =
    typeof versionRaw === "string" && versionRaw === "purchased"
      ? "purchased"
      : "latest";

  if (
    (!project_id && !purchase_id) ||
    (project_id &&
      (typeof project_id !== "string" ||
        !mongoose.Types.ObjectId.isValid(project_id))) ||
    (purchase_id &&
      (typeof purchase_id !== "string" ||
        !mongoose.Types.ObjectId.isValid(purchase_id))) ||
    (versionRaw &&
      typeof versionRaw === "string" &&
      versionRaw !== "latest" &&
      versionRaw !== "purchased")
  ) {
    enrichContext({ outcome: "validation_failed" });
    response(
      res,
      400,
      "Valid project_id or purchase_id is required, and version must be latest or purchased"
    );
    return;
  }

  const buyerId = new mongoose.Types.ObjectId(req.user._id);
  const purchaseObjectId =
    typeof purchase_id === "string" &&
    mongoose.Types.ObjectId.isValid(purchase_id)
      ? new mongoose.Types.ObjectId(purchase_id)
      : null;
  const projectObjectId =
    typeof project_id === "string" &&
    mongoose.Types.ObjectId.isValid(project_id)
      ? new mongoose.Types.ObjectId(project_id)
      : null;

  let confirmedPurchase: any = null;

  if (purchaseObjectId || version === "purchased") {
    const purchaseQuery: Record<string, unknown> = {
      buyerId,
      status: purchaseStatusConfig.confirmedStatus,
    };

    if (purchaseObjectId) {
      purchaseQuery._id = purchaseObjectId;
    } else if (projectObjectId) {
      purchaseQuery.projectId = projectObjectId;
    }

    const [purchase, purchaseError] = await tryCatch(
      Purchase.findOne(purchaseQuery)
        .select(
          "_id projectId sellerId project_snapshot package_snapshot createdAt"
        )
        .lean()
    );

    if (purchaseError) {
      logger.error("Failed to verify purchase for download", purchaseError);
      response(res, 500, "Failed to process download. Try again later.");
      return;
    }

    confirmedPurchase = purchase;
  }

  if (version === "purchased") {
    if (!confirmedPurchase?.package_snapshot?.s3_key) {
      enrichContext({ outcome: "forbidden", reason: "not_purchased" });
      response(res, 403, "You have not purchased this project");
      return;
    }

    const s3Key = confirmedPurchase.package_snapshot.s3_key as string;
    const [zipExists, zipExistsError] = await tryCatch(
      s3Service.objectExists(s3Key)
    );

    if (zipExistsError) {
      logger.error("Failed to verify purchased repo ZIP existence", {
        purchaseId: confirmedPurchase._id?.toString?.(),
        s3Key,
        error:
          zipExistsError instanceof Error
            ? zipExistsError.message
            : "Unknown error",
      });
      response(res, 500, "Failed to generate download link. Try again later.");
      return;
    }

    if (!zipExists) {
      response(
        res,
        400,
        "Project files are not available for download at this time"
      );
      return;
    }

    const [downloadUrl, downloadError] = await tryCatch(
      s3Service.createSignedDownloadUrl(
        s3Key,
        purchaseDownloadConfig.signedUrlExpirySeconds,
        buildSafeDownloadFilename(confirmedPurchase.project_snapshot?.title)
      )
    );

    if (downloadError || !downloadUrl) {
      logger.error("Failed to generate purchased-version download URL", {
        purchaseId: confirmedPurchase._id?.toString?.(),
        error: downloadError,
      });
      response(res, 500, "Failed to generate download link. Try again later.");
      return;
    }

    await recordProjectDownload({
      projectId: projectObjectId,
      sellerId: confirmedPurchase.sellerId ?? null,
      buyerId,
    });

    enrichContext({
      outcome: "success",
      project_id: confirmedPurchase.projectId?.toString?.(),
      purchase_id: confirmedPurchase._id?.toString?.(),
      version,
    });
    response(res, 200, "Download URL generated", { download_url: downloadUrl });
    return;
  }

  if (!projectObjectId) {
    response(res, 400, "Valid project_id is required for latest downloads");
    return;
  }

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

  if (
    project.repo_zip_status !== purchaseStatusConfig.packageReadyStatus ||
    !project.repo_zip_s3_key
  ) {
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

  let hasConfirmedPurchase = Boolean(confirmedPurchase);

  if (project.price > 0 && !hasConfirmedPurchase) {
    const [purchase, purchaseError] = await tryCatch(
      Purchase.findOne({
        buyerId,
        projectId: projectObjectId,
        status: purchaseStatusConfig.confirmedStatus,
      })
        .select("_id")
        .lean()
    );

    if (purchaseError) {
      logger.error(
        "Failed to verify purchase for latest download",
        purchaseError
      );
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

  const [downloadUrl, downloadError] = await tryCatch(
    s3Service.createSignedDownloadUrl(
      project.repo_zip_s3_key as string,
      purchaseDownloadConfig.signedUrlExpirySeconds,
      buildSafeDownloadFilename(project.title as string)
    )
  );

  if (downloadError || !downloadUrl) {
    logger.error(
      "Failed to generate latest-version download URL",
      downloadError
    );
    response(res, 500, "Failed to generate download link. Try again later.");
    return;
  }

  await recordProjectDownload({
    projectId: projectObjectId,
    sellerId: (project.userid as mongoose.Types.ObjectId | undefined) ?? null,
    buyerId,
  });

  enrichContext({ outcome: "success", project_id, version });
  response(res, 200, "Download URL generated", { download_url: downloadUrl });
});

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

  // Fetch the confirmed purchase for this buyer.
  const [purchase, purchaseError] = await tryCatch(
    Purchase.findOne({
      _id: purchaseObjectId,
      buyerId,
      status: purchaseStatusConfig.confirmedStatus,
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

  // Fetch buyer, seller, and project details in parallel.
  // The project may be null if it was hard-deleted.
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

  // Prefer purchase-time snapshots so the receipt stays immutable.
  const snap = (purchase as any).project_snapshot ?? {};
  const projectTitle =
    snap.title ||
    (project?.title as string) ||
    purchaseReceiptConfig.unavailableLabel;
  const projectType =
    snap.project_type ||
    (project?.project_type as string) ||
    purchaseReceiptConfig.unavailableLabel;
  const projectTechStack: string[] = Array.isArray(snap.tech_stack)
    ? (snap.tech_stack as string[])
    : (project?.tech_stack as string[]) || [];
  const projectPrice = `$${(purchase.price_usd as number).toFixed(2)} USD (at time of purchase)`;
  const purchasedPackageId =
    (purchase as any).purchased_package_id?.toString?.() ||
    purchaseReceiptConfig.unavailableLabel;
  const purchasedCommitSha =
    (purchase as any).package_snapshot?.commit_sha ||
    purchaseReceiptConfig.unavailableLabel;
  const packagedAtRaw = (purchase as any).package_snapshot?.packaged_at;
  const paymentSummary = derivePaymentSummary(purchase as any);
  const pricingReferenceValue =
    paymentSummary.payment_currency === "SOL"
      ? `$${purchase.sol_usd_rate} per SOL`
      : "1 USDC = $1.00 USD";
  const packagedAt = packagedAtRaw
    ? new Date(packagedAtRaw).toISOString()
    : purchaseReceiptConfig.unavailableLabel;

  const purchaseDate = new Date(purchase.createdAt as Date).toLocaleString(
    purchaseReceiptConfig.dateLocale,
    purchaseReceiptConfig.dateTimeOptions
  );
  renderPurchaseReceiptPdf(res, {
    purchaseReference: purchase.purchase_reference as string,
    transactionSignature: purchase.tx_signature as string,
    purchaseDate,
    projectTitle,
    projectType,
    projectTechStack,
    projectPrice,
    purchasedPackageId,
    purchasedCommitSha,
    packagedAt,
    amountPaidUsd: `$${(purchase.price_usd as number).toFixed(2)}`,
    settlementAmountLabel: `Amount Paid (${paymentSummary.payment_currency}):`,
    settlementAmountValue: `${paymentSummary.payment_total} ${paymentSummary.payment_currency}`,
    sellerReceivedLabel: `Seller Received (${100 - (purchase.platform_fee_percent as number)}%):`,
    sellerReceivedValue: `${paymentSummary.payment_seller} ${paymentSummary.payment_currency}`,
    platformFeeLabel: `Platform Fee (${purchase.platform_fee_percent}%):`,
    platformFeeValue: `${paymentSummary.payment_platform} ${paymentSummary.payment_currency}`,
    pricingReferenceLabel:
      paymentSummary.payment_currency === "SOL"
        ? "SOL/USD Rate at Purchase:"
        : "Pricing Reference:",
    pricingReferenceValue,
    rateSource:
      (purchase.exchange_rate_source as string) ||
      purchaseReceiptConfig.fallbackRateSource,
    rateTimestamp: new Date(
      purchase.exchange_rate_fetched_at as Date
    ).toISOString(),
    buyerDisplayName: (buyer.name as string) || (buyer.username as string),
    buyerUsername: buyer.username as string,
    buyerWallet: purchase.buyer_wallet as string,
    sellerDisplayName: (seller.name as string) || (seller.username as string),
    sellerUsername: seller.username as string,
    sellerWallet: purchase.seller_wallet as string,
    generatedAt: new Date().toLocaleString(
      purchaseReceiptConfig.dateLocale,
      purchaseReceiptConfig.dateTimeOptions
    ),
  });

  enrichContext({ outcome: "success", purchase_id });
});

export {
  initiatePurchase,
  confirmPurchase,
  getPurchasedProjects,
  downloadProject,
  downloadReceipt,
};
