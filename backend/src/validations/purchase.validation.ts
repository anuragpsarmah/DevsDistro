import { z } from "zod";

export const initiatePurchaseSchema = z.object({
  project_id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid project_id format"),
});

const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;

export const confirmPurchaseSchema = z.object({
  purchase_reference: z
    .string()
    .regex(/^[0-9a-f]{64}$/, "Invalid purchase_reference format"),

  // Solana transaction signatures are base58-encoded and typically 87-88 characters
  tx_signature: z
    .string()
    .min(80, "Invalid transaction signature")
    .max(100, "Invalid transaction signature")
    .refine(
      (val) => base58Regex.test(val),
      "Invalid transaction signature format"
    ),

  // Solana wallet addresses are base58-encoded and 32-44 characters
  buyer_wallet: z
    .string()
    .min(32, "Invalid wallet address")
    .max(44, "Invalid wallet address")
    .refine((val) => base58Regex.test(val), "Invalid wallet address format"),
});
