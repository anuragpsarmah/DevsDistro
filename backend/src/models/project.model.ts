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
    project_video: {
      type: String,
    },
    github_repo_id: {
      type: String,
      required: [true, "GitHub repository ID is required"],
      index: true,
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
  },
  { timestamps: true }
);

projectSchema.index({ isActive: 1 });
projectSchema.index(
  { title: "text", tech_stack: "text" },
  { weights: { title: 10, tech_stack: 1 } }
); // Text search index
projectSchema.index({ isActive: 1, createdAt: -1 }); // Newest sort
projectSchema.index({ isActive: 1, price: 1, createdAt: -1 }); // Price low with tie-breaker
projectSchema.index({ isActive: 1, price: -1, createdAt: -1 }); // Price high with tie-breaker
projectSchema.index({
  isActive: 1,
  avgRating: -1,
  totalReviews: -1,
  createdAt: -1,
}); // Rating high
projectSchema.index({
  isActive: 1,
  avgRating: 1,
  totalReviews: 1,
  createdAt: -1,
}); // Rating low
projectSchema.index({ isActive: 1, project_type: 1, createdAt: -1 }); // Type + newest
projectSchema.index({ isActive: 1, project_type: 1, price: 1, createdAt: -1 }); // Type + price low
projectSchema.index({ isActive: 1, project_type: 1, price: -1, createdAt: -1 }); // Type + price high
projectSchema.index({
  isActive: 1,
  project_type: 1,
  avgRating: -1,
  totalReviews: -1,
  createdAt: -1,
}); // Type + rating high
projectSchema.index({
  isActive: 1,
  project_type: 1,
  avgRating: 1,
  totalReviews: 1,
  createdAt: -1,
}); // Type + rating low

export const Project = model("Project", projectSchema);
