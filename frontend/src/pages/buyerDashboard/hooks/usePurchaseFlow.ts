import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { PurchaseIntent } from "@/utils/types";
import {
  useInitiatePurchaseMutation,
  useConfirmPurchaseMutation,
} from "@/hooks/apiMutations";

export type PurchaseFlowState =
  | "IDLE"
  | "INITIATING"
  | "AWAITING_WALLET"
  | "BUILDING_TX"
  | "AWAITING_SIGNATURE"
  | "CONFIRMING_ONCHAIN"
  | "CONFIRMING_BACKEND"
  | "SUCCESS"
  | "FAILED";

const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const textEncoder = new TextEncoder();

const PENDING_CONFIRM_KEY_PREFIX = "devsdistro_pending_confirm:";

// Stored after on-chain confirmation so a backend failure can be retried
// without re-sending an on-chain payment.
interface PendingConfirm {
  txSignature: string;
  purchaseReference: string;
  buyerWallet: string;
}

// Persisted to localStorage so the retry survives page refresh and browser close.
interface StoredPendingConfirm extends PendingConfirm {
  projectId: string;
  expiresAt: number;
}

function getPendingConfirmStorageKey(purchaseReference: string): string {
  return `${PENDING_CONFIRM_KEY_PREFIX}${purchaseReference}`;
}

function listPendingConfirmStorageKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(PENDING_CONFIRM_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

function readStoredPendingConfirm(key: string): StoredPendingConfirm | null {
  const storedStr = localStorage.getItem(key);
  if (!storedStr) return null;

  try {
    return JSON.parse(storedStr) as StoredPendingConfirm;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function cleanupExpiredPendingConfirms(now = Date.now()): void {
  for (const key of listPendingConfirmStorageKeys()) {
    const stored = readStoredPendingConfirm(key);
    if (!stored) continue;
    if (stored.expiresAt <= now) {
      localStorage.removeItem(key);
    }
  }
}

interface UsePurchaseFlowParams {
  logout?: () => Promise<void>;
  onSuccess?: (projectId: string) => void;
}

export function usePurchaseFlow({ logout, onSuccess }: UsePurchaseFlowParams) {
  const [flowState, setFlowState] = useState<PurchaseFlowState>("IDLE");
  const [intent, setIntent] = useState<PurchaseIntent | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  // True when FAILED was set after the on-chain TX was already finalized.
  // Used to show "Retry Confirmation" instead of "Try Again" in the modal.
  const [failedAfterOnChain, setFailedAfterOnChain] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Persists the on-chain data so the backend confirm can be retried independently.
  const pendingConfirmRef = useRef<PendingConfirm | null>(null);
  const pendingConfirmStorageKeyRef = useRef<string | null>(null);
  // Captures the projectId from initiate() so executePurchase() can persist the recovery record.
  const projectIdRef = useRef<string | null>(null);

  const { connection } = useConnection();
  const wallet = useWallet();

  const initiateMutation = useInitiatePurchaseMutation({ logout });
  const confirmMutation = useConfirmPurchaseMutation({ logout });

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    setCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const initiate = useCallback(
    async (projectId: string) => {
      projectIdRef.current = projectId;
      cleanupExpiredPendingConfirms();

      // Check localStorage for unresolved pending confirms for this project.
      // If one exists and the backend confirm window is still open, restore the retry
      // state instead of prompting a second payment.
      for (const key of listPendingConfirmStorageKeys()) {
        const stored = readStoredPendingConfirm(key);
        if (!stored) continue;
        if (stored.projectId === projectId) {
          pendingConfirmRef.current = {
            txSignature: stored.txSignature,
            purchaseReference: stored.purchaseReference,
            buyerWallet: stored.buyerWallet,
          };
          pendingConfirmStorageKeyRef.current = key;
          setIntent(null);
          setCountdown(0);
          setFailedAfterOnChain(true);
          setError(
            "A previous payment was sent but not confirmed. Retry confirmation below."
          );
          setFlowState("FAILED");
          return;
        }
      }

      setFlowState("INITIATING");
      setError(null);
      setFailedAfterOnChain(false);
      pendingConfirmRef.current = null;
      pendingConfirmStorageKeyRef.current = null;
      try {
        const result = await initiateMutation.mutateAsync(projectId);
        setIntent(result);
        startCountdown(result.expires_in);
        setFlowState("AWAITING_WALLET");
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to initiate purchase";
        setError(msg);
        setFlowState("FAILED");
      }
    },
    [initiateMutation, startCountdown]
  );

  const refreshQuote = useCallback(
    async (projectId: string) => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      await initiate(projectId);
    },
    [initiate]
  );

  // Retries only the backend confirmation step using the already-finalized TX.
  // Called when the flow fails after on-chain success to avoid a double payment.
  const retryConfirm = useCallback(async () => {
    const pending = pendingConfirmRef.current;
    if (!pending) return;

    setError(null);
    setFailedAfterOnChain(false);
    setFlowState("CONFIRMING_BACKEND");
    try {
      const result = await confirmMutation.mutateAsync({
        purchase_reference: pending.purchaseReference,
        tx_signature: pending.txSignature,
        buyer_wallet: pending.buyerWallet,
      });
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pendingConfirmStorageKeyRef.current) {
        localStorage.removeItem(pendingConfirmStorageKeyRef.current);
      }
      pendingConfirmRef.current = null;
      pendingConfirmStorageKeyRef.current = null;
      setFlowState("SUCCESS");
      onSuccess?.(result.projectId);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Confirmation failed. Please try again.";
      setError(msg);
      // 410 means the backend intent has permanently expired — there is no recovery
      // path through /confirm. Clear localStorage so the retry button does not
      // reappear and mislead the user on future visits.
      if (err?.response?.status === 410) {
        if (pendingConfirmStorageKeyRef.current) {
          localStorage.removeItem(pendingConfirmStorageKeyRef.current);
        }
        pendingConfirmRef.current = null;
        pendingConfirmStorageKeyRef.current = null;
        setFailedAfterOnChain(false);
      } else {
        setFailedAfterOnChain(true);
      }
      setFlowState("FAILED");
    }
  }, [confirmMutation, onSuccess]);

  const executePurchase = useCallback(async () => {
    if (!intent) {
      setError("No purchase intent found. Please try again.");
      setFlowState("FAILED");
      return;
    }

    if (countdown === 0) {
      setError("Purchase quote has expired. Please refresh the quote.");
      setFlowState("FAILED");
      return;
    }

    if (!wallet.connected || !wallet.publicKey || !wallet.sendTransaction) {
      setFlowState("AWAITING_WALLET");
      return;
    }

    setError(null);
    setFailedAfterOnChain(false);
    pendingConfirmRef.current = null;

    try {
      setFlowState("BUILDING_TX");

      // Use the lamport values pre-computed by the backend so the TX amounts exactly
      // match what the backend will verify on /confirm. Avoids any client-side
      // float re-computation that could diverge by >5 lamports and cause rejection.
      const sellerLamports = intent.seller_lamports;
      const platformLamports = intent.treasury_lamports;

      const sellerPubkey = new PublicKey(intent.seller_wallet);
      const treasuryPubkey = new PublicKey(intent.treasury_wallet);
      const buyerPubkey = wallet.publicKey;

      // Fetch blockhash BEFORE building the transaction so the same values
      // can be used for both the transaction validity window and confirmTransaction.
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = buyerPubkey;

      // Transfer 99% to seller
      tx.add(
        SystemProgram.transfer({
          fromPubkey: buyerPubkey,
          toPubkey: sellerPubkey,
          lamports: sellerLamports,
        })
      );

      // Transfer 1% to DevsDistro treasury
      tx.add(
        SystemProgram.transfer({
          fromPubkey: buyerPubkey,
          toPubkey: treasuryPubkey,
          lamports: platformLamports,
        })
      );

      // Add memo instruction with purchase reference (anti-replay nonce)
      tx.add(
        new TransactionInstruction({
          keys: [{ pubkey: buyerPubkey, isSigner: true, isWritable: false }],
          programId: new PublicKey(MEMO_PROGRAM_ID),
          // web3.js accepts byte arrays at runtime, but this version's TS types
          // still narrow instruction data to Buffer.
          data: textEncoder.encode(intent.purchase_reference) as Buffer,
        })
      );

      setFlowState("AWAITING_SIGNATURE");

      // Send transaction — wallet modal will prompt user to sign.
      // sendTransaction() already broadcasts before returning the signature,
      // so there is no distinct "broadcasting" phase to wait on.
      const txSignature = await wallet.sendTransaction(tx, connection);

      // Wait for on-chain finalization using the SAME blockhash fetched before building
      setFlowState("CONFIRMING_ONCHAIN");
      const confirmation = await connection.confirmTransaction(
        { signature: txSignature, blockhash, lastValidBlockHeight },
        "finalized"
      );
      // confirmTransaction can resolve without throwing even if the TX failed on-chain.
      // Always check value.err — a non-null error means the TX was rejected at the VM level
      // (e.g. insufficient funds, slippage, instruction error). We must not proceed to
      // backend confirmation with a failed TX: the backend would reject it anyway after an
      // expensive RPC call, but the user would also see a misleading "Retry Confirmation"
      // button instead of the correct "Try Again" flow.
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      // TX is finalized on-chain. Persist these details so that if the backend call
      // fails, the user can retry confirmation without re-sending the payment —
      // even after a page refresh or browser close.
      const buyerWallet = buyerPubkey.toBase58();
      const pendingConfirm: PendingConfirm = {
        txSignature,
        purchaseReference: intent.purchase_reference,
        buyerWallet,
      };
      pendingConfirmRef.current = pendingConfirm;
      const pendingConfirmStorageKey = getPendingConfirmStorageKey(
        pendingConfirm.purchaseReference
      );
      pendingConfirmStorageKeyRef.current = pendingConfirmStorageKey;
      localStorage.setItem(
        pendingConfirmStorageKey,
        JSON.stringify({
          ...pendingConfirm,
          projectId: projectIdRef.current ?? "",
          // The backend confirm window is tied to the original purchase intent TTL,
          // so persist the remaining time from the client countdown rather than a new
          // arbitrary client-side TTL.
          expiresAt: Date.now() + Math.max(countdown, 0) * 1000,
        } satisfies StoredPendingConfirm)
      );

      // Confirm with our backend
      setFlowState("CONFIRMING_BACKEND");
      const result = await confirmMutation.mutateAsync({
        purchase_reference: intent.purchase_reference,
        tx_signature: txSignature,
        buyer_wallet: buyerWallet,
      });

      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pendingConfirmStorageKeyRef.current) {
        localStorage.removeItem(pendingConfirmStorageKeyRef.current);
      }
      pendingConfirmRef.current = null;
      pendingConfirmStorageKeyRef.current = null;
      setFlowState("SUCCESS");
      onSuccess?.(result.projectId);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Purchase failed. Please try again.";
      setError(msg);
      // If pendingConfirmRef is set, the TX is already on-chain — the failure
      // happened in the backend step, not the on-chain step.
      if (pendingConfirmRef.current) {
        setFailedAfterOnChain(true);
      }
      setFlowState("FAILED");
    }
  }, [intent, countdown, wallet, connection, confirmMutation, onSuccess]);

  const reset = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setFlowState("IDLE");
    setIntent(null);
    setCountdown(0);
    setError(null);
    setFailedAfterOnChain(false);
    pendingConfirmRef.current = null;
    pendingConfirmStorageKeyRef.current = null;
  }, []);

  return {
    flowState,
    intent,
    countdown,
    error,
    failedAfterOnChain,
    initiate,
    executePurchase,
    retryConfirm,
    refreshQuote,
    reset,
    isWalletConnected: wallet.connected,
    walletPublicKey: wallet.publicKey?.toBase58() ?? null,
  };
}
