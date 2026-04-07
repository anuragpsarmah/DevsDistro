// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PurchaseIntent } from "@/utils/types";
import type { PurchaseFlowState } from "@/pages/buyerDashboard/hooks/usePurchaseFlow";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@solana/wallet-adapter-react-ui", () => ({
  WalletMultiButton: () => null,
}));

vi.mock("@solana/wallet-adapter-react-ui/styles.css", () => ({}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import PurchaseModal from "@/pages/buyerDashboard/sub-components/PurchaseModal";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const mockIntent: PurchaseIntent = {
  purchase_reference: "ref_abc123",
  payment_currency: "SOL",
  payment_total: 1.5,
  payment_seller: 1.485,
  payment_platform: 0.015,
  payment_mint: null,
  payment_decimals: 9,
  seller_amount_atomic: 1_485_000_000,
  treasury_amount_atomic: 15_000_000,
  price_usd: 150,
  price_sol_total: 1.5,
  price_sol_seller: 1.485,
  price_sol_platform: 0.015,
  seller_lamports: 1_485_000_000,
  treasury_lamports: 15_000_000,
  seller_wallet: "SellerWalletAddress1234",
  treasury_wallet: "TreasuryWalletAddress1234",
  sol_usd_rate: 100,
  exchange_rate_fetched_at: new Date().toISOString(), // fresh by default
  expires_in: 600,
};

const defaultProps = {
  projectTitle: "Test Project",
  flowState: "IDLE" as PurchaseFlowState,
  intent: mockIntent,
  countdown: 300,
  error: null,
  isWalletConnected: true,
  walletPublicKey: "ABC123DEF456GHI789JKL",
  failedAfterOnChain: false,
  onConfirm: vi.fn(),
  onRefreshQuote: vi.fn(),
  onRetryConfirm: vi.fn(),
  onClose: vi.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

// ── FAILED state recovery buttons ─────────────────────────────────────────────

describe("PurchaseModal — FAILED state recovery buttons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Retry Confirmation' when FAILED + failedAfterOnChain = true", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"FAILED" as PurchaseFlowState}
        failedAfterOnChain={true}
        error="Purchase session expired or already used."
      />
    );

    expect(
      screen.getByRole("button", { name: /Retry Confirmation/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Try Again/i })
    ).not.toBeInTheDocument();
  });

  it("shows 'Try Again' when FAILED + failedAfterOnChain = false", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"FAILED" as PurchaseFlowState}
        failedAfterOnChain={false}
        error="Wallet rejected transaction."
      />
    );

    expect(
      screen.getByRole("button", { name: /Try Again/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Retry Confirmation/i })
    ).not.toBeInTheDocument();
  });

  it("calls onRetryConfirm when 'Retry Confirmation' is clicked", () => {
    const onRetryConfirm = vi.fn();
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"FAILED" as PurchaseFlowState}
        failedAfterOnChain={true}
        error="Backend error."
        onRetryConfirm={onRetryConfirm}
      />
    );

    screen.getByRole("button", { name: /Retry Confirmation/i }).click();
    expect(onRetryConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onRefreshQuote when 'Try Again' is clicked", () => {
    const onRefreshQuote = vi.fn();
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"FAILED" as PurchaseFlowState}
        failedAfterOnChain={false}
        error="On-chain confirmation timed out."
        onRefreshQuote={onRefreshQuote}
      />
    );

    screen.getByRole("button", { name: /Try Again/i }).click();
    expect(onRefreshQuote).toHaveBeenCalledTimes(1);
  });

  it("displays the error message text in the FAILED state", () => {
    const errorMsg =
      "Seller received insufficient SOL. Expected 99000000 lamports.";
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"FAILED" as PurchaseFlowState}
        error={errorMsg}
      />
    );

    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });
});

// ── Active transaction progress steps ─────────────────────────────────────────

describe("PurchaseModal — active transaction progress steps", () => {
  // BROADCASTING was removed — sendTransaction() already broadcasts synchronously
  // before returning the signature, so there is no distinct broadcast phase.
  const ACTIVE_STATES: PurchaseFlowState[] = [
    "BUILDING_TX",
    "AWAITING_SIGNATURE",
    "CONFIRMING_ONCHAIN",
    "CONFIRMING_BACKEND",
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(ACTIVE_STATES)(
    "shows the step checklist when flowState is %s",
    (state) => {
      render(
        <PurchaseModal {...defaultProps} flowState={state} countdown={300} />
      );

      expect(screen.getByText("Building Transaction")).toBeInTheDocument();
      expect(screen.getByText("Awaiting Wallet Signature")).toBeInTheDocument();
      expect(screen.getByText("Transaction Confirmed")).toBeInTheDocument();
      expect(screen.getByText("Awaiting Finality")).toBeInTheDocument();
    }
  );

  it("hides the Cancel button while a transaction is in progress", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"CONFIRMING_ONCHAIN" as PurchaseFlowState}
        countdown={300}
      />
    );

    expect(
      screen.queryByRole("button", { name: /Cancel/i })
    ).not.toBeInTheDocument();
  });
});

// ── Wallet section display ─────────────────────────────────────────────────────

describe("PurchaseModal — wallet section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a truncated wallet address and 'Connected' label when wallet is connected", () => {
    const wallet = "BZMkpMcJYbsu2UZdHaGquTWsvXAuX3G9mcJHA5TsDqXK"; // 44 chars
    render(
      <PurchaseModal
        {...defaultProps}
        isWalletConnected={true}
        walletPublicKey={wallet}
      />
    );

    // truncateAddress: first 6 + "..." + last 6
    expect(screen.getByText("BZMkpM...TsDqXK")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("shows a connect-wallet prompt when wallet is not connected", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        isWalletConnected={false}
        walletPublicKey={null}
      />
    );

    expect(
      screen.getByText(/Connect your Solana wallet to proceed/i)
    ).toBeInTheDocument();
  });
});

// ── Quote expiry and confirm button ───────────────────────────────────────────

describe("PurchaseModal — quote expiry and confirm button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // F8 — countdown = 0 ────────────────────────────────────────────────────────

  it("F8: Confirm button is disabled when countdown is exactly 0 (quote expired)", () => {
    render(
      <PurchaseModal {...defaultProps} countdown={0} isWalletConnected={true} />
    );

    const btn = screen.getByRole("button", { name: "Confirm Purchase" });
    expect(btn).toBeDisabled();
  });

  // F9 — countdown < 0 (stale interval fires after expiry) ───────────────────

  it("F9: Confirm button is disabled when countdown goes negative (stale interval cycle)", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        countdown={-1}
        isWalletConnected={true}
      />
    );

    const btn = screen.getByRole("button", { name: "Confirm Purchase" });
    expect(btn).toBeDisabled();
  });

  // F10 — valid quote + connected wallet ─────────────────────────────────────

  it("F10: Confirm button is enabled when countdown > 0 and wallet is connected", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"AWAITING_WALLET" as PurchaseFlowState}
        countdown={300}
        isWalletConnected={true}
      />
    );

    const btn = screen.getByRole("button", { name: "Confirm Purchase" });
    expect(btn).not.toBeDisabled();
  });

  // F11 — expired quote shows Refresh button ──────────────────────────────────

  it("F11: Refresh Quote button is visible when quote is expired", () => {
    render(<PurchaseModal {...defaultProps} countdown={0} />);

    // The refresh button has title="Refresh quote"
    expect(screen.getByTitle("Refresh quote")).toBeInTheDocument();
  });

  // F12 — wallet not connected ────────────────────────────────────────────────

  it("F12: Confirm button is disabled when wallet is not connected", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        isWalletConnected={false}
        walletPublicKey={null}
        countdown={300}
      />
    );

    const btn = screen.getByRole("button", { name: "Confirm Purchase" });
    expect(btn).toBeDisabled();
  });

  // F13 — SUCCESS state ───────────────────────────────────────────────────────

  it("F13: SUCCESS state renders purchase confirmation message and hides Confirm button", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"SUCCESS" as PurchaseFlowState}
        countdown={0}
      />
    );

    expect(screen.getByText("Purchase Confirmed")).toBeInTheDocument();
    expect(screen.getByText(/Orders tab/i)).toBeInTheDocument();
    // Confirm Purchase button is not rendered in SUCCESS state
    expect(
      screen.queryByRole("button", { name: "Confirm Purchase" })
    ).not.toBeInTheDocument();
  });
});

// ── Stale rate warning ────────────────────────────────────────────────────────

describe("PurchaseModal — stale rate warning", () => {
  it("shows a stale-rate warning when exchange_rate_fetched_at is more than 5 minutes ago", () => {
    const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString();

    render(
      <PurchaseModal
        {...defaultProps}
        intent={{ ...mockIntent, exchange_rate_fetched_at: staleTimestamp }}
      />
    );

    expect(screen.getByTestId("stale-rate-warning")).toBeInTheDocument();
    expect(screen.getByTestId("stale-rate-warning")).toHaveTextContent(
      /price may vary/i
    );
  });

  it("does not show stale-rate warning when exchange_rate_fetched_at is within the last 5 minutes", () => {
    const freshTimestamp = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    render(
      <PurchaseModal
        {...defaultProps}
        intent={{ ...mockIntent, exchange_rate_fetched_at: freshTimestamp }}
      />
    );

    expect(screen.queryByTestId("stale-rate-warning")).not.toBeInTheDocument();
  });
});

describe("PurchaseModal — settlement guidance", () => {
  it("hides stale quote details and disables confirmation while a refreshed route is loading", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        flowState={"INITIATING" as PurchaseFlowState}
        intent={mockIntent}
      />
    );

    expect(screen.getByText(/preparing payment route/i)).toBeInTheDocument();
    expect(screen.queryByText("Total Cost")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm purchase/i })
    ).toBeDisabled();
  });

  it("shows the SOL network fee notice for USDC settlement", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        selectedPaymentCurrency="USDC"
        intent={{
          ...mockIntent,
          payment_currency: "USDC",
          payment_total: 150,
          payment_seller: 148.5,
          payment_platform: 1.5,
          payment_mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          payment_decimals: 6,
        }}
      />
    );

    expect(screen.getByText(/network fee requires sol/i)).toBeInTheDocument();
  });

  it("hides the USDC network fee notice for SOL settlement", () => {
    render(
      <PurchaseModal
        {...defaultProps}
        selectedPaymentCurrency="SOL"
        intent={{ ...mockIntent, payment_currency: "SOL" }}
      />
    );

    expect(
      screen.queryByText(/network fee still requires a small amount of sol/i)
    ).not.toBeInTheDocument();
  });
});
