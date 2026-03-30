import { model, Schema } from "mongoose";
import { PROJECT_PACKAGE_SOURCE_ENUM } from "../types/constants";

const projectPackageSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID is required"],
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller ID is required"],
      index: true,
    },
    github_repo_id: {
      type: String,
      required: [true, "GitHub repository ID is required"],
      index: true,
    },
    commit_sha: {
      type: String,
      required: [true, "Commit SHA is required"],
      index: true,
    },
    s3_key: {
      type: String,
      required: [true, "S3 key is required"],
      unique: true,
      index: true,
    },
    source: {
      type: String,
      enum: PROJECT_PACKAGE_SOURCE_ENUM,
      required: [true, "Package source is required"],
    },
  },
  { timestamps: true }
);

projectPackageSchema.index({ projectId: 1, createdAt: -1 });
projectPackageSchema.index({ projectId: 1, commit_sha: 1, createdAt: -1 });

export const ProjectPackage = model("ProjectPackage", projectPackageSchema);
