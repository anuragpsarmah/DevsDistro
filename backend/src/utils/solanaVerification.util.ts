import axios from "axios";
import logger from "../logger/logger";
import { VerifyParams, VerifyResult } from "../types/types";
import { LAMPORT_FIXED_TOLERANCE, MEMO_PROGRAM_ID } from "../types/constants";

export async function verifySolanaTransaction(
  params: VerifyParams
): Promise<VerifyResult> {
  const {
    txSignature,
    expectedBuyerWallet,
    expectedSellerWallet,
    expectedTreasuryWallet,
    expectedSellerLamports,
    expectedTreasuryLamports,
    purchaseReference,
    rpcUrl,
  } = params;

  // Fetch transaction from Solana RPC using jsonParsed encoding
  let rpcResponse: any;
  try {
    rpcResponse = await axios.post(
      rpcUrl,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          txSignature,
          {
            encoding: "jsonParsed",
            commitment: "finalized",
            maxSupportedTransactionVersion: 0,
          },
        ],
      },
      { timeout: 15000 }
    );
  } catch (err) {
    logger.error("Solana RPC getTransaction request failed", err);
    return { valid: false, error: "Failed to reach Solana network" };
  }

  const tx = rpcResponse.data?.result;

  if (!tx) {
    return {
      valid: false,
      error: "Transaction not found or not yet confirmed",
    };
  }

  // Check transaction did not error on-chain
  if (tx.meta?.err !== null && tx.meta?.err !== undefined) {
    return { valid: false, error: "Transaction failed on-chain" };
  }

  // Extract account keys (flat array of public key strings)
  const accountKeys: string[] =
    tx.transaction?.message?.accountKeys?.map((k: any) =>
      typeof k === "string" ? k : k.pubkey
    ) ?? [];

  // Verify buyer is the fee payer (index 0)
  if (accountKeys[0] !== expectedBuyerWallet) {
    return {
      valid: false,
      error: "Transaction fee payer does not match expected buyer wallet",
    };
  }

  // Find indices of seller and treasury wallets
  const sellerIndex = accountKeys.indexOf(expectedSellerWallet);
  const treasuryIndex = accountKeys.indexOf(expectedTreasuryWallet);

  if (sellerIndex === -1) {
    return {
      valid: false,
      error: "Seller wallet not found in transaction accounts",
    };
  }

  if (treasuryIndex === -1) {
    return {
      valid: false,
      error: "Treasury wallet not found in transaction accounts",
    };
  }

  // Verify balance changes using pre/post balances
  const preBalances: number[] = tx.meta?.preBalances ?? [];
  const postBalances: number[] = tx.meta?.postBalances ?? [];

  if (
    preBalances.length !== postBalances.length ||
    sellerIndex >= preBalances.length ||
    treasuryIndex >= preBalances.length
  ) {
    return { valid: false, error: "Malformed transaction balance data" };
  }

  const sellerDelta = postBalances[sellerIndex] - preBalances[sellerIndex];
  const treasuryDelta =
    postBalances[treasuryIndex] - preBalances[treasuryIndex];

  // Verify seller received at least the expected amount (within fixed tolerance)
  if (sellerDelta < expectedSellerLamports - LAMPORT_FIXED_TOLERANCE) {
    return {
      valid: false,
      error: `Seller received insufficient SOL. Expected ${expectedSellerLamports} lamports, got ${sellerDelta}`,
    };
  }

  // Verify treasury received at least the expected amount (within fixed tolerance)
  if (treasuryDelta < expectedTreasuryLamports - LAMPORT_FIXED_TOLERANCE) {
    return {
      valid: false,
      error: `Platform fee not received. Expected ${expectedTreasuryLamports} lamports, got ${treasuryDelta}`,
    };
  }

  // Verify memo instruction contains the purchase reference
  const instructions: any[] = tx.transaction?.message?.instructions ?? [];

  const memoInstruction = instructions.find(
    (ix: any) => ix.program === "spl-memo" || ix.programId === MEMO_PROGRAM_ID
  );

  if (!memoInstruction) {
    return { valid: false, error: "Memo instruction not found in transaction" };
  }

  // Memo data can be in `parsed` (string) or `data` (base64) field
  const memoData: string =
    memoInstruction.parsed ??
    (memoInstruction.data
      ? Buffer.from(memoInstruction.data, "base64").toString("utf-8")
      : "");

  // Strict equality (after trimming whitespace that SPL Memo may append).
  // Using includes() would allow an attacker to embed our reference as a substring
  // of a longer string they control.
  if (memoData.trim() !== purchaseReference) {
    return {
      valid: false,
      error: "Purchase reference in memo does not match",
    };
  }

  return { valid: true };
}
