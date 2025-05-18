import { model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    github_access_token: {
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
  },
  { timestamps: true }
);

export const User = model("User", userSchema);
