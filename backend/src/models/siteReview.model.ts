import { model, Schema } from "mongoose";

const siteReviewSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Reviewer username is required"],
    },
    profile_image_url: {
      type: String,
      required: [true, "Profile image is required"],
    },
    job_role: {
      type: String,
      required: [true, "Reviewer job role is required"],
    },
    review_description: {
      type: String,
      required: [true, "Review description is required"],
    },
    review_stars: {
      type: Number,
      required: [true, "Review star rating is required"],
    },
  },
  { timestamps: true }
);

export const SiteReview = model("SiteReview", siteReviewSchema);
