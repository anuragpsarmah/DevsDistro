import { z } from "zod";

export const githubCodeSchema = z.object({
  code: z
    .string()
    .min(1, "Authorization code is required")
    .max(100, "Invalid authorization code length"),
});
