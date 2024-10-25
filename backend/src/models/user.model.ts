import { model, Schema } from "mongoose";

const user = new Schema(
  {
    github_access_token: {
      type: String,
      required: true,
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
    jwt_refresh_token: String,
  },
  { timestamps: true }
);

export const User = model("User", user);
