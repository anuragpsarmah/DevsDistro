import z from "zod";
import { FILE_TYPE_ENUM, PROJECT_TYPE_ENUM } from "../types/constants";

export const projectFormDataSchema = z.object({
  price: z
    .number({
      required_error: "Price is required",
    })
    .min(0, "Price should be greater than or equal to 0."),
  isActive: z
    .boolean({
      required_error: "IsActive flag is required",
    })
    .optional(),
  title: z
    .string({
      required_error: "Title is required",
    })
    .min(1, "Title is required")
    .max(50, "Title must not exceed 50 characters"),
  description: z
    .string({
      required_error: "Description is required",
    })
    .min(1, "Description is required")
    .max(1000, "Review description must be 1000 characters or less"),
  project_type: z.enum(PROJECT_TYPE_ENUM, {
    errorMap: () => ({
      message: `Invalid project type was provided. Expected one of: ${PROJECT_TYPE_ENUM.join(", ")}`,
    }),
  }),
  tech_stack: z
    .array(z.string())
    .min(1, "At least one tech stack value required"),
  live_link: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.string().url("Invalid live link URL format").optional()),
  project_images: z.array(z.string()),
  project_video: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.string().optional()),
  existingImages: z.array(z.string()).optional(),
  existingVideo: z.string().optional(),
});

export const fileMetadataSchema = z.array(
  z.object({
    originalName: z
      .string({
        required_error: "Original file name is required",
      })
      .min(2, "Original file name is required")
      .max(100, "Name can be at most 50 characters long"),
    fileType: z.enum(FILE_TYPE_ENUM, {
      errorMap: () => ({
        message: `Invalid file type was provided. Expected one of: ${FILE_TYPE_ENUM.join(
          ", "
        )}`,
      }),
    }),
    fileSize: z.number({
      required_error: "File size is required",
    }),
  }).superRefine((data, ctx) => {
    if (data.fileType === "video/mp4") {
      if (data.fileSize > 52428800) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Video size cannot exceed 50MB",
          path: ["fileSize"],
        });
      }
    } else {
      if (data.fileSize > 2097152) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Image size cannot exceed 2MB",
          path: ["fileSize"],
        });
      }
    }
  })
);

export const githubRepoIdSchema = z.object({
  github_repo_id: z.string().min(1, "GitHub repository ID is required"),
});

export const searchProjectSchema = z.object({
  searchTerm: z.string().max(50).optional().default(""),
  projectTypes: z
    .array(z.enum([...PROJECT_TYPE_ENUM] as [string, ...string[]]))
    .optional()
    .default([])
    .refine((types) => types.length <= 10, {
      message: "Maximum 10 project types allowed",
    }),
  sortBy: z
    .enum(["newest", "price_low", "price_high", "rating_high", "rating_low"])
    .optional()
    .default("newest"),
  limit: z
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .optional()
    .default(10),
  offset: z
    .number()
    .int()
    .min(0, "Offset must be non-negative")
    .optional()
    .default(0),
});
