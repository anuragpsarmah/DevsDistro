import { z } from "zod";

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const submitReviewSchema = z.object({
  project_id: mongoId,
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),
  review: z
    .string()
    .trim()
    .max(2000, "Review cannot exceed 2000 characters")
    .optional(),
});

export const updateReviewSchema = submitReviewSchema;

export const deleteReviewSchema = z.object({
  project_id: mongoId,
});

export const getProjectReviewsSchema = z.object({
  project_id: mongoId,
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const getMyReviewSchema = z.object({
  project_id: mongoId,
});
