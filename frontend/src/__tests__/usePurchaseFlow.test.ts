// @vitest-environment jsdom
/**
 * Unit tests for the usePurchaseFlow state machine.
 *
 * Tests every meaningful state transition, error path, and recovery mechanism
 * in the client-side purchase flow hook. No real Solana network or backend is
 * used — wallet adapter and API mutations are fully mocked.
 *
 * Key areas covered:
 *   - initiate(): IDLE → INITIATING → AWAITING_WALLET / FAILED
 *   - executePurchase(): happy path through to SUCCESS
 *   - executePurchase(): wallet rejection, on-chain failure, backend failure
 *   - failedAfterOnChain flag: set when TX is on-chain but backend fails
 *   - retryConfirm(): retries only the backend step
 *   - refreshQuote(): re-runs initiate and resets countdown
 *   - reset(): clears all state and stops the countdown interval
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── Mocks (hoisted) ──────────────────────────────────────────────────────────

const mockSendTransaction = vi.fn();
const mockGetLatestBlockhash = vi.fn();
const mockConfirmTransaction = vi.fn();

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: vi.fn(),
  useConnection: vi.fn(),
}));

// Provide lightweight stubs for the Solana classes actually used inside the hook.
// We don't test Solana transaction construction here — only state transitions.
// NOTE: Use regular `function` (not arrow functions) in mockImplementation so
// Vitest treats them as constructors when called with `new`.
vi.mock("@solana/web3.js", () => {
  const addFn = vi.fn();

  function MockTransaction(this: any) {
    this.recentBlockhash = "";
    this.feePayer = null;
    this.add = addFn;
  }

  function MockPublicKey(this: any, addr: string) {
    this._addr = addr;
    this.toBase58 = function () {
      return addr;
    };
    this.toString = function () {
      return addr;
    };
  }

  function MockTransactionInstruction(this: any) {}

  return {
    Transaction: vi.fn().mockImplementation(MockTransaction),
    SystemProgram: {
      transfer: vi
        .fn()
        .mockReturnValue({ programId: "11111111111111111111111111111111" }),
    },
    PublicKey: vi.fn().mockImplementation(MockPublicKey),
    TransactionInstruction: vi
      .fn()
      .mockImplementation(MockTransactionInstruction),
  };
});

vi.mock("@/hooks/apiMutations", () => ({
  useInitiatePurchaseMutation: vi.fn(),
  useConfirmPurchaseMutation: vi.fn(),
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  useInitiatePurchaseMutation,
  useConfirmPurchaseMutation,
} from "@/hooks/apiMutations";
import { usePurchaseFlow } from "@/pages/buyerDashboard/hooks/usePurchaseFlow";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_WALLET = "BZMkpMcJYbsu2UZdHaGquTWsvXAuX3G9mcJHA5TsDqXK";
const TX_SIG =
  "4CttUS628uKGA3tDSp45KrvoFDqckYaZkVmAEhWfMp6XxNwYF8ueq4xZyaFGVznoKDetwoLR8DnvQgUik4MhVgkr";
const PROJECT_ID = "507f1f77bcf86cd799439033";
const PROJECT_ID_2 = "507f1f77bcf86cd799439044";
const PURCHASE_REF =
  "c77d331a28821988c457876559e43f9430371c1262ca59d6222837ab48b98078";
const PURCHASE_REF_2 =
  "d77d331a28821988c457876559e43f9430371c1262ca59d6222837ab48b98079";

const MOCK_INTENT = {
  purchase_reference: PURCHASE_REF,
  price_usd: 10,
  price_sol_total: 0.1,
  price_sol_seller: 0.099,
  price_sol_platform: 0.001,
  // Pre-computed by the backend — frontend must use these directly in the TX.
  seller_lamports: 99_000_000, // floor(round(0.1 * 1e9) * 99 / 100)
  treasury_lamports: 1_000_000, // round(0.1 * 1e9) - 99_000_000
  seller_wallet: "ppjF9VR27TTxWCgWiGnjzEjuMBZDtyY9WQD5eCvyzNk",
  treasury_wallet: "AP3T1RCrTYSyC2Zq9Tq8ZJiKvWmatzbpzJgNZyET4Z4B",
  sol_usd_rate: 100,
  exchange_rate_fetched_at: new Date().toISOString(),
  expires_in: 600,
};

const makePendingConfirmKey = (purchaseReference: string) =>
  `devsdistro_pending_confirm:${purchaseReference}`;

// ─── Setup helpers ─────────────────────────────────────────────────────────────

function setupWallet({
  connected = true,
  sendTransaction = mockSendTransaction,
}: {
  connected?: boolean;
  sendTransaction?: typeof mockSendTransaction | null;
} = {}) {
  const publicKey = connected
    ? { toBase58: () => BUYER_WALLET, toString: () => BUYER_WALLET }
    : null;

  vi.mocked(useWallet).mockReturnValue({
    connected,
    publicKey: publicKey as any,
    sendTransaction: (sendTransaction ?? undefined) as any,
  } as any);

  vi.mocked(useConnection).mockReturnValue({
    connection: {
      getLatestBlockhash: mockGetLatestBlockhash,
      confirmTransaction: mockConfirmTransaction,
    } as any,
  });
}

function setupMutations({
  initiateMutateAsync = vi.fn().mockResolvedValue(MOCK_INTENT),
  confirmMutateAsync = vi.fn().mockResolvedValue({ projectId: PROJECT_ID }),
}: {
  initiateMutateAsync?: ReturnType<typeof vi.fn>;
  confirmMutateAsync?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.mocked(useInitiatePurchaseMutation).mockReturnValue({
    mutateAsync: initiateMutateAsync,
  } as any);
  vi.mocked(useConfirmPurchaseMutation).mockReturnValue({
    mutateAsync: confirmMutateAsync,
  } as any);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("usePurchaseFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();

    mockSendTransaction.mockResolvedValue(TX_SIG);
    mockGetLatestBlockhash.mockResolvedValue({
      blockhash: "EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N",
      lastValidBlockHeight: 9999,
    });
    mockConfirmTransaction.mockResolvedValue({ value: { err: null } });

    setupWallet();
    setupMutations();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ───────────────────────────────────────────────────────────

  it("starts in IDLE state with no intent, error, or countdown", () => {
    const { result } = renderHook(() =>
      usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
    );

    expect(result.current.flowState).toBe("IDLE");
    expect(result.current.intent).toBeNull();
    expect(result.current.countdown).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.failedAfterOnChain).toBe(false);
  });

  // ── initiate() ──────────────────────────────────────────────────────────────

  describe("initiate()", () => {
    it("transitions IDLE → AWAITING_WALLET on a successful API response", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      expect(result.current.flowState).toBe("AWAITING_WALLET");
      expect(result.current.intent).toEqual(MOCK_INTENT);
    });

    it("starts the countdown timer at expires_in seconds", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      expect(result.current.countdown).toBe(600);
    });

    it("decrements the countdown every second", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(result.current.countdown).toBe(590);
    });

    it("stops the countdown at 0 (does not go negative)", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      act(() => {
        vi.advanceTimersByTime(700_000);
      }); // past 600 seconds

      expect(result.current.countdown).toBe(0);
    });

    it("transitions to FAILED and sets error when the initiate API call fails", async () => {
      setupMutations({
        initiateMutateAsync: vi.fn().mockRejectedValue({
          response: { data: { message: "Project is not currently active" } },
        }),
      });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.error).toBe("Project is not currently active");
    });

    it("uses the raw error message as fallback when response.data.message is absent", async () => {
      setupMutations({
        initiateMutateAsync: vi
          .fn()
          .mockRejectedValue(new Error("Network error")),
      });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      expect(result.current.error).toBe("Network error");
    });

    it("clears a previous error when re-initiating", async () => {
      const initiateMutateAsync = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValueOnce(MOCK_INTENT);
      setupMutations({ initiateMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      // First call → error
      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      expect(result.current.error).toBeTruthy();

      // Second call → success, error cleared
      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      expect(result.current.error).toBeNull();
    });

    it("restores a pending confirmation from localStorage for the same project", async () => {
      localStorage.setItem(
        makePendingConfirmKey(PURCHASE_REF),
        JSON.stringify({
          txSignature: TX_SIG,
          purchaseReference: PURCHASE_REF,
          buyerWallet: BUYER_WALLET,
          projectId: PROJECT_ID,
          expiresAt: Date.now() + 60_000,
        })
      );

      const initiateMutateAsync = vi.fn();
      setupMutations({ initiateMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      expect(initiateMutateAsync).not.toHaveBeenCalled();
      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.failedAfterOnChain).toBe(true);
      expect(result.current.error).toMatch(/previous payment was sent/i);
    });

    it("does not restore an expired pending confirmation", async () => {
      localStorage.setItem(
        makePendingConfirmKey(PURCHASE_REF),
        JSON.stringify({
          txSignature: TX_SIG,
          purchaseReference: PURCHASE_REF,
          buyerWallet: BUYER_WALLET,
          projectId: PROJECT_ID,
          expiresAt: Date.now() - 1,
        })
      );

      const initiateMutateAsync = vi.fn().mockResolvedValue(MOCK_INTENT);
      setupMutations({ initiateMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      expect(initiateMutateAsync).toHaveBeenCalledWith(PROJECT_ID);
      expect(result.current.flowState).toBe("AWAITING_WALLET");
      expect(
        localStorage.getItem(makePendingConfirmKey(PURCHASE_REF))
      ).toBeNull();
    });

    it("ignores pending confirmations for other projects", async () => {
      localStorage.setItem(
        makePendingConfirmKey(PURCHASE_REF),
        JSON.stringify({
          txSignature: TX_SIG,
          purchaseReference: PURCHASE_REF,
          buyerWallet: BUYER_WALLET,
          projectId: PROJECT_ID_2,
          expiresAt: Date.now() + 60_000,
        })
      );

      const initiateMutateAsync = vi.fn().mockResolvedValue(MOCK_INTENT);
      setupMutations({ initiateMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      expect(initiateMutateAsync).toHaveBeenCalledWith(PROJECT_ID);
      expect(result.current.flowState).toBe("AWAITING_WALLET");
    });
  });

  // ── executePurchase() ────────────────────────────────────────────────────────

  describe("executePurchase()", () => {
    it("reaches SUCCESS and calls onSuccess(projectId) when the full flow completes", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("SUCCESS");
      expect(onSuccess).toHaveBeenCalledWith(PROJECT_ID);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("does not set failedAfterOnChain when it succeeds", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.failedAfterOnChain).toBe(false);
    });

    it("goes to FAILED without failedAfterOnChain when the wallet rejects the signature", async () => {
      mockSendTransaction.mockRejectedValue(
        new Error("User rejected the request.")
      );

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.failedAfterOnChain).toBe(false);
      expect(result.current.error).toMatch(/User rejected/i);
    });

    it("goes to FAILED without failedAfterOnChain when on-chain confirmation fails", async () => {
      mockConfirmTransaction.mockRejectedValue(
        new Error("BlockheightExceeded")
      );

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("FAILED");
      // confirmTransaction failed, so pendingConfirmRef was not yet set
      expect(result.current.failedAfterOnChain).toBe(false);
    });

    it("sets failedAfterOnChain = true when on-chain TX succeeds but backend confirm fails", async () => {
      setupMutations({
        confirmMutateAsync: vi.fn().mockRejectedValue({
          response: {
            data: { message: "Purchase session expired or already used." },
          },
        }),
      });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.failedAfterOnChain).toBe(true);
      expect(result.current.error).toMatch(/Purchase session expired/i);
      const stored = JSON.parse(
        localStorage.getItem(makePendingConfirmKey(PURCHASE_REF)) || "null"
      );
      expect(stored).toMatchObject({
        txSignature: TX_SIG,
        purchaseReference: PURCHASE_REF,
        buyerWallet: BUYER_WALLET,
        projectId: PROJECT_ID,
      });
      expect(stored.expiresAt).toBeGreaterThan(Date.now());
      expect(stored.expiresAt).toBeLessThanOrEqual(Date.now() + 600_000);
    });

    it("goes to FAILED (without failedAfterOnChain) when confirmTransaction resolves with value.err set", async () => {
      // Regression test for the confirmTransaction return-value bug.
      // wallet.sendTransaction() succeeds (TX sent), but the chain rejects it
      // (e.g. insufficient funds, instruction error). confirmTransaction resolves
      // without throwing but returns { value: { err: "InsufficientFunds" } }.
      // The hook must NOT proceed to backend confirmation with a failed TX.
      mockConfirmTransaction.mockResolvedValue({
        value: { err: "InsufficientFunds" },
      });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("FAILED");
      // pendingConfirmRef is null because the on-chain TX failed before we set it,
      // so failedAfterOnChain must be false (correct: show "Try Again", not "Retry Confirmation")
      expect(result.current.failedAfterOnChain).toBe(false);
      expect(result.current.error).toMatch(/Transaction failed on-chain/i);
    });

    it("goes to FAILED when the quote has expired (countdown = 0)", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      // Expire the quote
      act(() => {
        vi.advanceTimersByTime(700_000);
      });
      expect(result.current.countdown).toBe(0);

      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.error).toMatch(/expired/i);
      expect(mockSendTransaction).not.toHaveBeenCalled();
    });

    it("returns to AWAITING_WALLET when executePurchase is called without a connected wallet", async () => {
      setupWallet({ connected: false, sendTransaction: null });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("AWAITING_WALLET");
      expect(mockSendTransaction).not.toHaveBeenCalled();
    });

    it("goes to FAILED when executePurchase is called without a prior initiate (no intent)", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.executePurchase(); // no initiate first
      });

      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.error).toMatch(/No purchase intent/i);
    });

    it("stops the countdown timer on SUCCESS", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      const countdownAtSuccess = result.current.countdown;
      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      // Timer should be cleared — countdown should not decrease further
      expect(result.current.countdown).toBe(countdownAtSuccess);
    });

    it("uses seller_lamports and treasury_lamports from the intent (not client re-computation)", async () => {
      // This test verifies that the hook passes the EXACT lamport values from the
      // backend intent to SystemProgram.transfer, not locally re-derived values.
      // A regression (e.g., using computeLamports locally) would fail this test.
      const { SystemProgram } = await import("@solana/web3.js");
      const transferSpy = vi.mocked(SystemProgram.transfer);
      transferSpy.mockClear();

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("SUCCESS");
      expect(transferSpy).toHaveBeenCalledTimes(2);

      // First transfer: buyer → seller (99%)
      const sellerTransfer = transferSpy.mock.calls[0][0] as any;
      expect(sellerTransfer.lamports).toBe(MOCK_INTENT.seller_lamports);

      // Second transfer: buyer → treasury (1%)
      const treasuryTransfer = transferSpy.mock.calls[1][0] as any;
      expect(treasuryTransfer.lamports).toBe(MOCK_INTENT.treasury_lamports);
    });

    it("encodes the purchase reference memo as UTF-8 bytes without relying on Buffer", async () => {
      const { TransactionInstruction } = await import("@solana/web3.js");
      const instructionSpy = vi.mocked(TransactionInstruction);
      instructionSpy.mockClear();

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("SUCCESS");
      expect(instructionSpy).toHaveBeenCalled();

      const memoInstruction = instructionSpy.mock.calls[0][0] as any;
      expect(Array.from(memoInstruction.data)).toEqual(
        Array.from(new TextEncoder().encode(PURCHASE_REF))
      );
    });
  });

  // ── retryConfirm() ──────────────────────────────────────────────────────────

  describe("retryConfirm()", () => {
    it("transitions to SUCCESS when the backend confirm succeeds on the second attempt", async () => {
      const onSuccess = vi.fn();
      const confirmMutateAsync = vi
        .fn()
        .mockRejectedValueOnce({
          response: { data: { message: "Temporary server error" } },
        })
        .mockResolvedValueOnce({ projectId: PROJECT_ID });
      setupMutations({ confirmMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess })
      );

      // First attempt → backend fails after on-chain success
      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });
      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.failedAfterOnChain).toBe(true);

      // Retry → succeeds
      await act(async () => {
        await result.current.retryConfirm();
      });
      expect(result.current.flowState).toBe("SUCCESS");
      expect(onSuccess).toHaveBeenCalledWith(PROJECT_ID);
      expect(
        localStorage.getItem(makePendingConfirmKey(PURCHASE_REF))
      ).toBeNull();
    });

    it("keeps failedAfterOnChain = true when retryConfirm also fails", async () => {
      // The backend always rejects (e.g. always 410 due to the documented bug)
      const confirmMutateAsync = vi.fn().mockRejectedValue({
        response: {
          data: { message: "Purchase session expired or already used." },
        },
      });
      setupMutations({ confirmMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });
      expect(result.current.failedAfterOnChain).toBe(true);

      await act(async () => {
        await result.current.retryConfirm();
      });

      // Still failed, still shows "Retry Confirmation" (not "Try Again")
      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.failedAfterOnChain).toBe(true);
    });

    it("clears persisted retry state and falls back to Try Again on 410", async () => {
      const confirmMutateAsync = vi.fn().mockRejectedValue({
        response: {
          status: 410,
          data: {
            message: "Purchase session expired. Please start a new purchase.",
          },
        },
      });
      setupMutations({ confirmMutateAsync });

      localStorage.setItem(
        makePendingConfirmKey(PURCHASE_REF),
        JSON.stringify({
          txSignature: TX_SIG,
          purchaseReference: PURCHASE_REF,
          buyerWallet: BUYER_WALLET,
          projectId: PROJECT_ID,
          expiresAt: Date.now() + 60_000,
        })
      );

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      expect(result.current.failedAfterOnChain).toBe(true);

      await act(async () => {
        await result.current.retryConfirm();
      });

      expect(result.current.flowState).toBe("FAILED");
      expect(result.current.failedAfterOnChain).toBe(false);
      expect(
        localStorage.getItem(makePendingConfirmKey(PURCHASE_REF))
      ).toBeNull();
    });

    it("does nothing when called without a pending on-chain TX (pendingConfirmRef is null)", async () => {
      const confirmMutateAsync = vi.fn();
      setupMutations({ confirmMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      // retryConfirm without any prior executePurchase
      await act(async () => {
        await result.current.retryConfirm();
      });

      expect(confirmMutateAsync).not.toHaveBeenCalled();
      expect(result.current.flowState).toBe("IDLE");
    });

    it("sends the exact same tx_signature and purchase_reference on retry (no new payment)", async () => {
      const confirmMutateAsync = vi
        .fn()
        .mockRejectedValueOnce(new Error("First attempt network error"))
        .mockResolvedValueOnce({ projectId: PROJECT_ID });
      setupMutations({ confirmMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });
      await act(async () => {
        await result.current.retryConfirm();
      });

      const firstPayload = confirmMutateAsync.mock.calls[0][0];
      const retryPayload = confirmMutateAsync.mock.calls[1][0];

      expect(retryPayload.tx_signature).toBe(firstPayload.tx_signature);
      expect(retryPayload.purchase_reference).toBe(
        firstPayload.purchase_reference
      );
      expect(retryPayload.buyer_wallet).toBe(firstPayload.buyer_wallet);
    });

    it("preserves unrelated pending confirmations when one purchase succeeds", async () => {
      localStorage.setItem(
        makePendingConfirmKey(PURCHASE_REF_2),
        JSON.stringify({
          txSignature: `${TX_SIG}2`,
          purchaseReference: PURCHASE_REF_2,
          buyerWallet: BUYER_WALLET,
          projectId: PROJECT_ID_2,
          expiresAt: Date.now() + 60_000,
        })
      );

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });

      expect(result.current.flowState).toBe("SUCCESS");
      expect(
        localStorage.getItem(makePendingConfirmKey(PURCHASE_REF))
      ).toBeNull();
      expect(
        localStorage.getItem(makePendingConfirmKey(PURCHASE_REF_2))
      ).not.toBeNull();
    });
  });

  // ── refreshQuote() ──────────────────────────────────────────────────────────

  describe("refreshQuote()", () => {
    it("re-initiates the purchase and resets the countdown to the new expires_in", async () => {
      const freshIntent = { ...MOCK_INTENT, sol_usd_rate: 110 };
      const initiateMutateAsync = vi
        .fn()
        .mockResolvedValueOnce(MOCK_INTENT) // first initiate
        .mockResolvedValueOnce(freshIntent); // refreshed quote
      setupMutations({ initiateMutateAsync });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      // Initial initiate
      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      // Let 60 seconds elapse
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(result.current.countdown).toBe(540);

      // Refresh quote
      await act(async () => {
        await result.current.refreshQuote(PROJECT_ID);
      });

      // Countdown resets to new expires_in (600)
      expect(result.current.countdown).toBe(600);
      expect(result.current.intent?.sol_usd_rate).toBe(110);
    });
  });

  // ── reset() ─────────────────────────────────────────────────────────────────

  describe("reset()", () => {
    it("clears all state back to initial values", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      expect(result.current.intent).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.flowState).toBe("IDLE");
      expect(result.current.intent).toBeNull();
      expect(result.current.countdown).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.failedAfterOnChain).toBe(false);
    });

    it("stops the countdown interval so it does not continue decrementing", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });

      act(() => {
        result.current.reset();
      });

      // After reset, advancing time should not change countdown
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.countdown).toBe(0);
    });

    it("clears failedAfterOnChain so modal shows correct buttons after re-open", async () => {
      setupMutations({
        confirmMutateAsync: vi
          .fn()
          .mockRejectedValue(new Error("backend fail")),
      });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      await act(async () => {
        await result.current.initiate(PROJECT_ID);
      });
      await act(async () => {
        await result.current.executePurchase();
      });
      expect(result.current.failedAfterOnChain).toBe(true);

      act(() => {
        result.current.reset();
      });
      expect(result.current.failedAfterOnChain).toBe(false);
    });
  });

  // ── walletPublicKey / isWalletConnected ─────────────────────────────────────

  describe("wallet state exposure", () => {
    it("exposes the wallet public key as a base58 string when connected", async () => {
      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      expect(result.current.isWalletConnected).toBe(true);
      expect(result.current.walletPublicKey).toBe(BUYER_WALLET);
    });

    it("exposes walletPublicKey as null when disconnected", () => {
      setupWallet({ connected: false, sendTransaction: null });

      const { result } = renderHook(() =>
        usePurchaseFlow({ logout: vi.fn(), onSuccess: vi.fn() })
      );

      expect(result.current.isWalletConnected).toBe(false);
      expect(result.current.walletPublicKey).toBeNull();
    });
  });
});
