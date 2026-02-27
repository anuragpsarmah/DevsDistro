import z from "zod";
import { JOB_ROLE_ENUM } from "../types/constants";

export const profileInformationSchema = z.object({
  website_url: z.union([z.string().url(), z.literal("")]).optional(),
  x_username: z.string().optional(),
  short_bio: z
    .string()
    .max(250, "Short bio must be 250 characters or less")
    .optional(),
  job_role: z
    .union([
      z.enum(JOB_ROLE_ENUM, {
        errorMap: () => ({
          message: `Invalid job role was provided. Expected one of: ${JOB_ROLE_ENUM.join(", ")}`,
        }),
      }),
      z.literal(""),
    ])
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
  auto_repackage_on_push: z.boolean().optional(),
});

export const walletAddressSchema = z
  .object({
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
    signature: z.string().optional(),
    message: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.wallet_address !== "") {
        return !!data.signature && !!data.message;
      }
      return true;
    },
    {
      message:
        "Signature and message are required when setting a wallet address",
    }
  );
