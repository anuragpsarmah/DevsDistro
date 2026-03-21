import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { PurchaseFlowState } from "../hooks/usePurchaseFlow";
import { PurchaseIntent } from "@/utils/types";

interface PurchaseModalProps {
  projectTitle: string;
  flowState: PurchaseFlowState;
  intent: PurchaseIntent | null;
  countdown: number;
  error: string | null;
  isWalletConnected: boolean;
  walletPublicKey: string | null;
  failedAfterOnChain: boolean;
  onConfirm: () => void;
  onRefreshQuote: () => void;
  onRetryConfirm: () => void;
  onClose: () => void;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

const ACTIVE_STATES: PurchaseFlowState[] = [
  "BUILDING_TX",
  "AWAITING_SIGNATURE",
  "CONFIRMING_ONCHAIN",
  "CONFIRMING_BACKEND",
];

const STEP_LABELS: Record<string, string> = {
  BUILDING_TX: "Building Transaction",
  AWAITING_SIGNATURE: "Awaiting Wallet Signature",
  CONFIRMING_ONCHAIN: "Confirming On-Chain",
  CONFIRMING_BACKEND: "Finalizing Purchase",
};

export default function PurchaseModal({
  projectTitle,
  flowState,
  intent,
  countdown,
  error,
  isWalletConnected,
  walletPublicKey,
  failedAfterOnChain,
  onConfirm,
  onRefreshQuote,
  onRetryConfirm,
  onClose,
}: PurchaseModalProps) {
  const isActive = ACTIVE_STATES.includes(flowState);
  const isQuoteExpired =
    countdown <= 0 &&
    intent !== null &&
    flowState !== "SUCCESS" &&
    flowState !== "FAILED";

  const rateAgeMs = intent?.exchange_rate_fetched_at
    ? Date.now() - new Date(intent.exchange_rate_fetched_at).getTime()
    : 0;
  const isRateStale = rateAgeMs > 5 * 60 * 1000;
  const rateAgeMinutes = Math.floor(rateAgeMs / 60_000);

  const canConfirm =
    isWalletConnected &&
    !isQuoteExpired &&
    intent !== null &&
    !isActive &&
    flowState !== "SUCCESS";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isActive ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg border-2 border-black dark:border-white bg-white dark:bg-[#050505] shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-black dark:border-white">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-[2px] bg-red-500"></div>
              <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                Execute Purchase
              </span>
            </div>
            <h2 className="font-syne font-black uppercase tracking-widest text-black dark:text-white text-lg leading-none truncate max-w-xs">
              {projectTitle}
            </h2>
          </div>
          {!isActive && (
            <button
              onClick={onClose}
              className="w-10 h-10 border-2 border-black dark:border-white flex items-center justify-center hover:bg-red-500 hover:border-red-500 hover:text-white text-black dark:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* SUCCESS state */}
        {flowState === "SUCCESS" && (
          <div className="p-8 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-syne font-black uppercase tracking-widest text-black dark:text-white text-2xl mb-2">
                Purchase Confirmed
              </p>
              <p className="font-space text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Your project is now available in the Orders tab
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-space font-bold uppercase tracking-widest text-sm border-2 border-black dark:border-white hover:bg-red-500 hover:border-red-500 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Normal flow */}
        {flowState !== "SUCCESS" && (
          <div className="p-6 space-y-6">
            {/* Price Summary */}
            {intent && (
              <div className="border-2 border-black dark:border-white p-5 bg-gray-50 dark:bg-[#0a0a0a]">
                <div className="flex items-end justify-between mb-3">
                  <span className="font-space font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">
                    Total Cost
                  </span>
                  <div className="text-right">
                    <p className="font-syne font-black text-black dark:text-white text-3xl leading-none">
                      {intent.price_sol_total.toFixed(6)} SOL
                    </p>
                    <p className="font-space text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ≈ ${intent.price_usd.toFixed(2)} USD
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-space text-gray-400 dark:text-gray-600 border-t border-black/10 dark:border-white/10 pt-3 mt-3">
                  <div className="flex flex-col gap-1">
                    <span className="uppercase tracking-widest">
                      Rate: 1 SOL = ${intent.sol_usd_rate.toFixed(2)}{" "}
                      (CoinGecko)
                    </span>
                    {isRateStale && (
                      <span
                        data-testid="stale-rate-warning"
                        className="text-amber-500 uppercase tracking-widest font-bold"
                      >
                        Rate fetched ~{rateAgeMinutes}m ago — price may vary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold uppercase tracking-widest ${
                        countdown > 60
                          ? "text-gray-500 dark:text-gray-400"
                          : "text-red-500"
                      }`}
                    >
                      {isQuoteExpired ? "EXPIRED" : formatCountdown(countdown)}
                    </span>
                    {(isQuoteExpired || countdown < 120) && !isActive && (
                      <button
                        onClick={onRefreshQuote}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors uppercase tracking-widest font-bold"
                        title="Refresh quote"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Refresh
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs font-space text-gray-400 dark:text-gray-600 mt-2 space-y-1 border-t border-black/10 dark:border-white/10 pt-3">
                  <div className="flex justify-between">
                    <span className="uppercase tracking-widest">
                      Seller receives
                    </span>
                    <span>{intent.price_sol_seller.toFixed(6)} SOL (99%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="uppercase tracking-widest">
                      Platform fee
                    </span>
                    <span>{intent.price_sol_platform.toFixed(6)} SOL (1%)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading state — no intent yet */}
            {!intent && flowState === "INITIATING" && (
              <div className="border-2 border-black dark:border-white p-8 flex items-center justify-center gap-3 bg-gray-50 dark:bg-[#0a0a0a]">
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
                <span className="font-space font-bold uppercase tracking-widest text-xs text-black dark:text-white">
                  Fetching live price...
                </span>
              </div>
            )}

            {/* Wallet Section */}
            <div className="border-2 border-black dark:border-white p-5">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-4 h-4 text-red-500" />
                <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-black dark:text-white">
                  Buyer Wallet
                </span>
              </div>

              {isWalletConnected && walletPublicKey ? (
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span className="font-space font-bold text-black dark:text-white text-sm uppercase tracking-widest">
                    {truncateAddress(walletPublicKey)}
                  </span>
                  <span className="font-space text-xs text-green-500 uppercase tracking-widest font-bold ml-auto">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-space text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Connect your Solana wallet to proceed
                  </p>
                  <WalletMultiButton
                    style={{
                      background: "black",
                      color: "white",
                      border: "2px solid black",
                      borderRadius: 0,
                      fontFamily: "inherit",
                      fontWeight: "bold",
                      fontSize: "0.75rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "0.75rem 1.5rem",
                      width: "100%",
                      justifyContent: "center",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Progress Steps (shown during active transaction) */}
            {isActive && (
              <div className="border-2 border-black dark:border-white p-5 space-y-3">
                {Object.entries(STEP_LABELS).map(([state, label]) => {
                  const stateKeys = Object.keys(STEP_LABELS);
                  const currentIdx = stateKeys.indexOf(flowState);
                  const thisIdx = stateKeys.indexOf(state);
                  const isDone = thisIdx < currentIdx;
                  const isCurrentStep = state === flowState;

                  return (
                    <div key={state} className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isDone
                            ? "bg-green-500 border-green-500"
                            : isCurrentStep
                              ? "border-red-500"
                              : "border-black/20 dark:border-white/20"
                        }`}
                      >
                        {isDone && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                        {isCurrentStep && (
                          <Loader2 className="w-3 h-3 text-red-500 animate-spin" />
                        )}
                      </div>
                      <span
                        className={`font-space text-xs uppercase tracking-widest font-bold ${
                          isDone
                            ? "text-green-500"
                            : isCurrentStep
                              ? "text-black dark:text-white"
                              : "text-black/30 dark:text-white/30"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Error Display */}
            {flowState === "FAILED" && error && (
              <div className="border-2 border-red-500 p-4 flex items-start gap-3 bg-red-50 dark:bg-red-950/20">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="font-space text-xs text-red-600 dark:text-red-400 uppercase tracking-widest font-bold leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {flowState !== "FAILED" && (
                <button
                  onClick={onConfirm}
                  disabled={!canConfirm || isActive}
                  className="w-full relative group px-8 py-5 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-space font-bold uppercase tracking-widest text-sm disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden transition-colors"
                >
                  {isActive ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Confirm Purchase"
                  )}
                </button>
              )}

              {flowState === "FAILED" && failedAfterOnChain && (
                // TX is already on-chain — only retry the backend confirmation step.
                // Do NOT re-initiate, as that would prompt a second payment.
                <button
                  onClick={onRetryConfirm}
                  className="w-full px-8 py-5 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-space font-bold uppercase tracking-widest text-sm hover:bg-red-500 hover:border-red-500 transition-colors"
                >
                  Retry Confirmation
                </button>
              )}
              {flowState === "FAILED" && !failedAfterOnChain && (
                <button
                  onClick={onRefreshQuote}
                  className="w-full px-8 py-5 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-space font-bold uppercase tracking-widest text-sm hover:bg-red-500 hover:border-red-500 transition-colors"
                >
                  Try Again
                </button>
              )}

              {!isActive && (
                <button
                  onClick={onClose}
                  className="w-full px-8 py-4 border-2 border-black/30 dark:border-white/30 text-black/50 dark:text-white/50 font-space font-bold uppercase tracking-widest text-sm hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
