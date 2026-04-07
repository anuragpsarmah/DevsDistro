import axios from "axios";
import logger from "../logger/logger";
import { VerifyParams, VerifyResult } from "../types/types";
import { LAMPORT_FIXED_TOLERANCE, MEMO_PROGRAM_ID } from "../types/constants";

const parseAtomicAmount = (raw: unknown): bigint => {
  if (typeof raw === "string" && raw.length > 0) {
    return BigInt(raw);
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return BigInt(Math.trunc(raw));
  }
  return 0n;
};

const collectTokenOwnerDelta = (
  tx: any,
  ownerWallet: string,
  mint: string
): bigint => {
  const preTokenBalances: any[] = tx.meta?.preTokenBalances ?? [];
  const postTokenBalances: any[] = tx.meta?.postTokenBalances ?? [];

  const accountMetaByIndex = new Map<
    number,
    { owner: string | null; mint: string | null }
  >();
  const preAmountsByIndex = new Map<number, bigint>();
  const postAmountsByIndex = new Map<number, bigint>();

  for (const entry of preTokenBalances) {
    const index = Number(entry?.accountIndex);
    if (!Number.isInteger(index)) continue;
    preAmountsByIndex.set(
      index,
      parseAtomicAmount(entry?.uiTokenAmount?.amount)
    );
    accountMetaByIndex.set(index, {
      owner: entry?.owner ?? accountMetaByIndex.get(index)?.owner ?? null,
      mint: entry?.mint ?? accountMetaByIndex.get(index)?.mint ?? null,
    });
  }

  for (const entry of postTokenBalances) {
    const index = Number(entry?.accountIndex);
    if (!Number.isInteger(index)) continue;
    postAmountsByIndex.set(
      index,
      parseAtomicAmount(entry?.uiTokenAmount?.amount)
    );
    accountMetaByIndex.set(index, {
      owner: entry?.owner ?? accountMetaByIndex.get(index)?.owner ?? null,
      mint: entry?.mint ?? accountMetaByIndex.get(index)?.mint ?? null,
    });
  }

  let totalDelta = 0n;
  for (const [index, meta] of accountMetaByIndex.entries()) {
    if (meta.owner !== ownerWallet || meta.mint !== mint) continue;
    const preAmount = preAmountsByIndex.get(index) ?? 0n;
    const postAmount = postAmountsByIndex.get(index) ?? 0n;
    totalDelta += postAmount - preAmount;
  }

  return totalDelta;
};

export async function verifySolanaTransaction(
  params: VerifyParams
): Promise<VerifyResult> {
  const {
    txSignature,
    expectedBuyerWallet,
    expectedSellerWallet,
    expectedTreasuryWallet,
    paymentCurrency = "SOL",
    expectedMint,
    expectedTotalAmountAtomic = 0,
    expectedSellerAmountAtomic = 0,
    expectedTreasuryAmountAtomic = 0,
    expectedSellerLamports,
    expectedTreasuryLamports,
    purchaseReference,
    rpcUrl,
    fallbackRpcUrl,
  } = params;

  // Fetch transaction from Solana RPC using jsonParsed encoding
  const rpcBody = {
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
  };

  let rpcResponse: any;
  try {
    rpcResponse = await axios.post(rpcUrl, rpcBody, { timeout: 15000 });
  } catch (primaryErr) {
    if (fallbackRpcUrl) {
      logger.warn(
        "Primary Solana RPC failed, retrying with fallback RPC",
        primaryErr
      );
      try {
        rpcResponse = await axios.post(fallbackRpcUrl, rpcBody, {
          timeout: 15000,
        });
      } catch (fallbackErr) {
        logger.error("Solana RPC fallback also failed", fallbackErr);
        return { valid: false, error: "Failed to reach Solana network" };
      }
    } else {
      logger.error("Solana RPC getTransaction request failed", primaryErr);
      return { valid: false, error: "Failed to reach Solana network" };
    }
  }

  let tx = rpcResponse.data?.result;

  // If the RPC returns null, the transaction may not be indexed yet even though
  // confirmTransaction already returned "finalized". Retry up to 3 times with a
  // 2-second delay before giving up — this closes the propagation race window.
  if (!tx) {
    for (let attempt = 1; attempt <= 10; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const retryResponse = await axios.post(rpcUrl, rpcBody, {
          timeout: 15000,
        });
        tx = retryResponse.data?.result;
        if (tx) break;
        logger.warn(
          `getTransaction returned null on retry ${attempt}/10`,
          txSignature
        );
      } catch (retryErr) {
        logger.warn(`getTransaction retry ${attempt}/10 failed`, retryErr);
      }
    }
  }

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

  if (paymentCurrency === "USDC") {
    if (!expectedMint) {
      return { valid: false, error: "USDC mint configuration is missing" };
    }

    const sellerDelta = collectTokenOwnerDelta(
      tx,
      expectedSellerWallet,
      expectedMint
    );
    const treasuryDelta = collectTokenOwnerDelta(
      tx,
      expectedTreasuryWallet,
      expectedMint
    );
    const buyerDelta = collectTokenOwnerDelta(
      tx,
      expectedBuyerWallet,
      expectedMint
    );

    const expectedSellerAtomic = BigInt(expectedSellerAmountAtomic);
    const expectedTreasuryAtomic = BigInt(expectedTreasuryAmountAtomic);
    const expectedTotalAtomic = BigInt(expectedTotalAmountAtomic);

    if (sellerDelta < expectedSellerAtomic) {
      return {
        valid: false,
        error: `Seller received insufficient USDC. Expected ${expectedSellerAmountAtomic} base units, got ${sellerDelta.toString()}`,
      };
    }

    if (treasuryDelta < expectedTreasuryAtomic) {
      return {
        valid: false,
        error: `Platform fee not received in USDC. Expected ${expectedTreasuryAmountAtomic} base units, got ${treasuryDelta.toString()}`,
      };
    }

    if (buyerDelta > -expectedTotalAtomic) {
      return {
        valid: false,
        error: `Buyer sent insufficient USDC. Expected ${expectedTotalAmountAtomic} base units, got ${(-buyerDelta).toString()}`,
      };
    }
  } else {
    // Find indices of seller and treasury wallets for native SOL verification.
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
