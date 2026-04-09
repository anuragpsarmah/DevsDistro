export const reviewsFeaturedConfig = {
  get reviewIds() {
    return [
      process.env.FEATURED_REVIEW_ID1,
      process.env.FEATURED_REVIEW_ID2,
      process.env.FEATURED_REVIEW_ID3,
    ] as const;
  },
};

export const reviewsPurchaseConfig = {
  confirmedStatus: "CONFIRMED",
} as const;

export const reviewsProjectSelect = {
  submitProjectLookup: "_id userid isActive price",
  updateProjectLookup: "_id price",
} as const;

export const reviewsUserPopulate = {
  path: "userId",
  select: "username name profile_image_url",
} as const;

export const reviewsSortConfig = {
  newestFirst: { createdAt: -1 },
} as const;
