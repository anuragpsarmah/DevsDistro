import { z } from "zod";

export const userSchema = z.object({
  auth0ID: z.string({ required_error: "Auth0ID is required" }),
  username: z.string({ required_error: "Auth0ID is required" }),
  email: z
    .string({ required_error: "Auth0ID is required" })
    .email({ message: "Email is required" }),
});
