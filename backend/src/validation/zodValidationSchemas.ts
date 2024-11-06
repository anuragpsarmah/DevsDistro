import z from "zod";
import { PROJECT_TYPE_ENUM, JOB_ROLE_ENUM } from "../types/constants";

export const profileInformationSchema = z.object({
  job_role: z
    .enum(JOB_ROLE_ENUM, {
      errorMap: () => ({
        message: `Invalid job role was provided. Expected one of: ${JOB_ROLE_ENUM.join(", ")}`,
      }),
    })
    .optional(),
  location: z.string().optional(),
  review_description: z
    .string()
    .max(200, "Review description must be 200 characters or less")
    .optional(),
  review_stars: z
    .number()
    .min(0, "Review stars must be between 0 and 5")
    .max(5, "Review stars must be between 0 and 5")
    .optional(),
  profile_visibility: z
    .boolean()
    .refine((value) => typeof value === "boolean", {
      message: "Profile visibility must be a boolean value",
    })
    .optional(),
});

export const projectTypeSchema = z.object({
  title: z
    .string({
      required_error: "Title is required",
    })
    .max(50, "Title must not exceed 50 characters"),
  description: z
    .string({
      required_error: "Description is required",
    })
    .max(1000, "Review description must be 1000 characters or less"),
  project_type: z.enum(PROJECT_TYPE_ENUM, {
    errorMap: () => ({
      message: `Invalid project type was provided. Expected one of: ${PROJECT_TYPE_ENUM.join(", ")}`,
    }),
  }),
  tech_stack: z
    .array(z.string())
    .min(1, "At least one tech stack value required"),
  live_link: z.string().url("Invalid URL format").optional(),
  project_images: z
    .array(z.string().url("Invalid URL format"))
    .min(1, "At least one image URL required"),
  project_video: z.string().url("Invalid URL format").optional(),
});
