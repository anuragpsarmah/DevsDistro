const DEFAULT_PLATFORM_FEE_PERCENT = "1";

export const purchaseIntentConfig = {
  ttlSeconds: 600,
  redisKeyPrefix: "purchase_intent_",
  referenceBytes: 32,
} as const;

export const purchaseStatusConfig = {
  confirmedStatus: "CONFIRMED",
  packageReadyStatus: "SUCCESS",
  repackageIdleStatus: "IDLE",
} as const;

export const purchasePurchasedProjectSelect =
  "title description project_type tech_stack price avgRating totalReviews live_link createdAt project_images repo_zip_status scheduled_deletion_at latest_package_commit_sha repackage_status";

export const purchasePurchasedSellerPopulate = {
  path: "userid",
  select: "username name profile_image_url -_id",
} as const;

export const purchaseDownloadConfig = {
  signedUrlExpirySeconds: 900,
  filenameFallback: "project",
  filenameMaxLength: 80,
} as const;

export const purchasePaginationConfig = {
  defaultLimit: 12,
  minLimit: 1,
  maxLimit: 50,
} as const;

export const purchaseNetworkConfig = {
  mainnetNetwork: "mainnet-beta",
  mainnetFallbackRpcUrl: "https://api.mainnet-beta.solana.com",
} as const;

export const purchaseReceiptConfig = {
  dateLocale: "en-US",
  dateTimeOptions: {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  } as const,
  unavailableLabel: "N/A",
  fallbackRateSource: "CoinGecko",
} as const;

export const purchasePlatformConfig = {
  get platformFeePercent() {
    return Number.parseInt(
      process.env.PLATFORM_FEE_PERCENT || DEFAULT_PLATFORM_FEE_PERCENT,
      10
    );
  },
};
