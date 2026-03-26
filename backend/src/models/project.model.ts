import { model, Schema } from "mongoose";
import { PROJECT_TYPE_ENUM } from "../types/constants";
import { User } from "./user.model";

const projectSchema = new Schema(
  {
    userid: {
      type: Schema.Types.ObjectId,
      ref: User,
      required: [true, "UserId is required"],
      index: true,
    },
    price: {
      type: Number,
      required: [true, "Project price is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    github_access_revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Project title is required"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
    },
    project_type: {
      type: String,
      enum: PROJECT_TYPE_ENUM,
      required: [true, "Project type is required"],
    },
    tech_stack: {
      type: [String],
      required: [true, "An array with atleast one string is required"],
    },
    live_link: {
      type: String,
    },
    project_images: {
      type: [String],
      required: [true, "An array of atleast one url is required"],
    },
    project_images_detail: {
      type: [String],
      default: [],
    },
    project_video: {
      type: String,
    },
    github_repo_id: {
      type: String,
      unique: true,
      required: [true, "GitHub repository ID is required"],
      index: true,
    },
    github_installation_id: {
      type: Number,
      required: [true, "Installation ID is required"],
      index: true,
    },
    repo_zip_status: {
      type: String,
      enum: ["PROCESSING", "SUCCESS", "FAILED"],
      default: "PROCESSING",
    },
    repo_zip_s3_key: {
      type: String,
      default: null,
    },
    repo_zip_error: {
      type: String,
      default: null,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    repo_tree_status: {
      type: String,
      enum: ["PROCESSING", "SUCCESS", "FAILED"],
      default: null,
    },
    repo_tree: {
      type: Schema.Types.Mixed,
      default: null,
    },
    repo_tree_error: {
      type: String,
      default: null,
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    scheduled_deletion_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

const MKT = {
  isActive: 1,
  github_access_revoked: 1,
  repo_zip_status: 1,
} as const;

projectSchema.index({ ...MKT, createdAt: -1 }); // Newest
projectSchema.index({ ...MKT, price: 1, createdAt: -1 }); // Price low
projectSchema.index({ ...MKT, price: -1, createdAt: -1 }); // Price high
projectSchema.index({ ...MKT, avgRating: -1, totalReviews: -1, createdAt: -1 }); // Rating high
projectSchema.index({ ...MKT, avgRating: 1, totalReviews: 1, createdAt: -1 }); // Rating low

projectSchema.index({ ...MKT, project_type: 1, createdAt: -1 }); // Type + newest
projectSchema.index({ ...MKT, project_type: 1, price: 1, createdAt: -1 }); // Type + price low
projectSchema.index({ ...MKT, project_type: 1, price: -1, createdAt: -1 }); // Type + price high
projectSchema.index({
  ...MKT,
  project_type: 1,
  avgRating: -1,
  totalReviews: -1,
  createdAt: -1,
}); // Type + rating high
projectSchema.index({
  ...MKT,
  project_type: 1,
  avgRating: 1,
  totalReviews: 1,
  createdAt: -1,
}); // Type + rating low

export const Project = model("Project", projectSchema);
