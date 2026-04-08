const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PROJECT_LISTING_LIMIT_FALLBACK = "2";

const getParsedDefaultProjectListingLimit = () =>
  Number.parseInt(
    process.env.DEFAULT_PROJECT_LISTING_LIMIT ||
      DEFAULT_PROJECT_LISTING_LIMIT_FALLBACK,
    10
  );

export const projectsUserDefaults = {
  get projectListingLimit() {
    return getParsedDefaultProjectListingLimit();
  },
};

export const projectsPurchaseConfig = {
  confirmedStatus: "CONFIRMED",
} as const;

export const projectsRetentionConfig = {
  projectSoftDeleteGracePeriodMs: 7 * DAY_IN_MS,
} as const;

export const projectsRedisConfig = {
  privateRepoCacheDurationSeconds: 60 * 60,
  mediaCleanupScheduleKey: "media-cleanup-schedule",
} as const;

export const projectsMediaConfig = {
  get cloudFrontDistribution() {
    return process.env.S3_CLOUDFRONT_DISTRIBUTION;
  },
};

export const projectsGitHubConfig = {
  repositoryApiBaseUrl: "https://api.github.com/repositories",
  repositoryApiHeaders: {
    Accept: "application/vnd.github+json",
  } as const,
  getRepositoryApiUrl(githubRepoId: string) {
    return `${this.repositoryApiBaseUrl}/${githubRepoId}`;
  },
};

export const projectsPackagingConfig = {
  successStatus: "SUCCESS",
  processingStatus: "PROCESSING",
  failedStatus: "FAILED",
} as const;

export const projectsMarketplaceSelect = {
  title: 1,
  description: 1,
  project_type: 1,
  tech_stack: 1,
  price: 1,
  allow_payments_in_sol: 1,
  avgRating: 1,
  totalReviews: 1,
  live_link: 1,
  createdAt: 1,
  project_images: { $slice: 1 },
} as const;

export const projectsSellerPopulate = {
  path: "userid",
  select: "username name profile_image_url -_id",
} as const;

export const projectsPublicDetailSelect = {
  title: 1,
  description: 1,
  project_type: 1,
  tech_stack: 1,
  price: 1,
  allow_payments_in_sol: 1,
  avgRating: 1,
  totalReviews: 1,
  live_link: 1,
  createdAt: 1,
  project_images: 1,
  project_images_detail: 1,
  project_video: 1,
  slug: 1,
} as const;

export const projectsDetailSelect = {
  title: 1,
  description: 1,
  project_type: 1,
  tech_stack: 1,
  price: 1,
  allow_payments_in_sol: 1,
  avgRating: 1,
  totalReviews: 1,
  live_link: 1,
  createdAt: 1,
  project_images: 1,
  project_images_detail: 1,
  project_video: 1,
  repo_tree: 1,
  repo_tree_status: 1,
  scheduled_deletion_at: 1,
  slug: 1,
} as const;

export const projectsDetailSellerPopulate = {
  path: "userid",
  select:
    "username name profile_image_url short_bio job_role location website_url x_username profile_visibility -_id",
} as const;
