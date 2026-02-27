import { z } from "zod";

export const refreshTokenCookieSchema = z.object({
  refresh_token: z
    .string()
    .length(80, "Invalid refresh token format")
    .regex(/^[a-f0-9]+$/, "Invalid refresh token format"),
});
