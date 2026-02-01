import z from "zod";
import { PROJECT_TYPES } from "./constants";
import { projectListingFormData } from "./types";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_FILE_SIZE,
  MAX_VIDEO_FILE_SIZE,
} from "./constants";

export const projectListingFormDataValidation = (
  data: projectListingFormData
): string | undefined => {
  const schema = z.object({
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
    projectType: z.enum(PROJECT_TYPES, {
      errorMap: () => ({
        message: `Invalid project type was provided.`,
      }),
    }),
    techStack: z
      .array(z.string())
      .min(1, "At least one tech stack value required"),
    liveLink: z
      .string()
      .transform((val) => (val === "" ? undefined : val))
      .pipe(z.string().url("Invalid live link URL format").optional()),
    price: z
      .number({
        required_error: "Price is required",
      })
      .min(0, "Price should be greater than or equal to 0."),
    existingImages: z.array(z.string()).optional(),
    existingVideo: z.string().nullable().optional(),
  });

  const result = schema.safeParse(data);
  if (!result.success) {
    return result.error.errors[0].message;
  }

  const totalImageCount =
    (data.existingImages?.length || 0) + data.images.length;

  if (totalImageCount < 1) {
    return "At least one image is required";
  }

  if (totalImageCount > 5) {
    return "At most five images are allowed";
  }

  if (data.images.length > 0) {
    for (const file of data.images) {
      const nameArray = file.name.split(".");
      const extension = nameArray[nameArray.length - 1].toLowerCase();

      if (!ALLOWED_IMAGE_TYPES[file.type]) {
        return "Image file type is not supported";
      }

      if (file.size > MAX_IMAGE_FILE_SIZE) {
        return "Image file size should not exceed 2MB";
      }

      if (!ALLOWED_IMAGE_TYPES[file.type].includes(extension)) {
        return "Invalid file extension";
      }
    }
  }

  if (data.video) {
    if (data.existingVideo) {
      return "Cannot upload new video while existing video is present";
    }

    const nameArray = data.video.name.split(".");
    const extension = nameArray[nameArray.length - 1].toLowerCase();

    if (!ALLOWED_VIDEO_TYPES[data.video.type]) {
      return "Video file type is not supported";
    }

    if (data.video.size > MAX_VIDEO_FILE_SIZE) {
      return "Video file size should not exceed 50MB";
    }

    if (!ALLOWED_VIDEO_TYPES[data.video.type].includes(extension)) {
      return "Invalid file extension";
    }
  }
};
