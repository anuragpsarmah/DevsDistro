import z from "zod";
import { FILE_TYPE_ENUM, PROJECT_TYPE_ENUM } from "../types/constants";

export const projectFormDataSchema = z.object({
  price: z
    .number({
      required_error: "Price is required",
    })
    .min(0, "Price should be greater than or equal to 0."),
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
    .max(1000, "Description must be 1000 characters or less"),
  project_type: z.enum(PROJECT_TYPE_ENUM, {
    errorMap: () => ({
      message: `Invalid project type was provided. Expected one of: ${PROJECT_TYPE_ENUM.join(", ")}`,
    }),
  }),
  tech_stack: z
    .array(z.string())
    .min(1, "At least one tech stack value required")
    .max(15, "Maximum 15 tech stack items allowed"),
  live_link: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.string().url("Invalid live link URL format").optional()),
  imageOrder: z.array(z.string()),
  imageOrder_detail: z.array(z.string()).optional().default([]),
  project_video: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .pipe(z.string().optional()),
  existingVideo: z.string().optional(),
});

export const fileMetadataSchema = z.array(
  z
    .object({
      originalName: z
        .string({
          required_error: "Original file name is required",
        })
        .min(2, "Original file name is required")
        .max(100, "Name can be at most 100 characters long"),
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
    })
    .superRefine((data, ctx) => {
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

export const searchProjectSchema = z
  .object({
    searchTerm: z.string().max(50).optional().default(""),
    projectTypes: z
      .array(z.enum([...PROJECT_TYPE_ENUM] as [string, ...string[]]))
      .optional()
      .default([])
      .refine((types) => types.length <= 10, {
        message: "Maximum 10 project types allowed",
      }),
    techStack: z
      .array(z.string().max(30))
      .max(10, "Maximum 10 tech stack filters allowed")
      .optional()
      .default([]),
    minPrice: z.number().min(0, "Minimum price cannot be negative").optional(),
    maxPrice: z.number().min(0, "Maximum price cannot be negative").optional(),
    sortBy: z
      .enum(["newest", "price_low", "price_high", "rating_high", "rating_low"])
      .optional()
      .default("newest"),
    limit: z
      .number()
      .int()
      .min(1, "Limit must be at least 1")
      .max(50, "Limit cannot exceed 50")
      .optional()
      .default(12),
    offset: z
      .number()
      .int()
      .min(0, "Offset must be non-negative")
      .optional()
      .default(0),
  })
  .refine(
    (data) => {
      if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.minPrice <= data.maxPrice;
      }
      return true;
    },
    {
      message: "minPrice must be less than or equal to maxPrice",
      path: ["minPrice"],
    }
  );
