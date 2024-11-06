import { model, Schema } from "mongoose";
import { PROJECT_TYPE_ENUM } from "../types/constants";

const projectSchema = new Schema(
  {
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
  },
  { timestamps: true }
);

export const Project = model("Project", projectSchema);
