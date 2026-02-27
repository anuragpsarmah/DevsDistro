import { model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    github_user_token: {
      type: String,
      required: [true, "GitHub access token is required"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
    },
    name: {
      type: String,
      default: "",
    },
    profile_image_url: {
      type: String,
      required: [true, "Profile image is required"],
    },
    website_url: {
      type: String,
      default: "",
    },
    x_username: {
      type: String,
      default: "",
    },
    short_bio: {
      type: String,
      default: "",
    },
    job_role: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    review_description: {
      type: String,
      default: "",
    },
    review_stars: {
      type: Number,
      default: 0,
    },
    profile_visibility: {
      type: Boolean,
      default: true,
    },
    wallet_address: {
      type: String,
      default: "",
    },
    github_id: {
      type: String,
      required: [true, "GitHub ID is required"],
      unique: true,
      index: true,
    },
    project_listing_limit: {
      type: Number,
      default: null,
    },
    auto_repackage_on_push: {
      type: Boolean,
      default: false,
    },
    refresh_tokens: {
      type: [
        {
          token_hash: {
            type: String,
            required: true,
          },
          expires_at: {
            type: Date,
            required: true,
          },
          created_at: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
      _id: false,
    },
  },
  { timestamps: true }
);

userSchema.index({ "refresh_tokens.token_hash": 1 }, { sparse: true });

export const User = model("User", userSchema);
