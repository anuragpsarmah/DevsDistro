import z from "zod";
import { JOB_ROLE_ENUM } from "../types/constants";

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
  profile_visibility: z.boolean().optional(),
});

export const walletAddressSchema = z.object({
  wallet_address: z.string().refine(
    (address) => {
      if (address === "") return true;

      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      return base58Regex.test(address);
    },
    {
      message:
        "Invalid Solana wallet address format. Must be a base58-encoded string of 32-44 characters.",
    }
  ),
});
