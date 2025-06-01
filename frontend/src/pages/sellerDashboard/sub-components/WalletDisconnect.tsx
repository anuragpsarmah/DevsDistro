import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { WalletDisconnectProps } from "../utils/types";
import { SolanaLogo } from "@/components/ui/solanaLogo";
import { WalletMismatchWarning } from "./WalletMismatchWarning";

export const WalletDisconnect = ({
  displayAddress,
  hasWalletMismatch,
  isProcessing,
  onDisconnect,
  onCopyAddress,
  onViewOnExplorer,
  hasStoredButNotConnected,
  walletAddress,
  publicKey,
  intentionalOperation,
}: WalletDisconnectProps) => {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCopyAddress = () => {
    onCopyAddress();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply the same robust checking logic as WalletMismatchWarning component
  const shouldShowMismatchUI = () => {
    // Don't show mismatch UI during intentional operations (like disconnect)
    if (intentionalOperation) return false;

    // Only show if there's actually a mismatch condition
    if (!hasWalletMismatch && !hasStoredButNotConnected) return false;

    return true;
  };

  const hasMismatchCondition = shouldShowMismatchUI();

  return (
    <div className="flex flex-col md:flex-row">
      <div className="flex flex-col flex-1 space-y-6 md:pr-6">
        <div className="flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Solana Wallet</h2>
        </div>
        <div className="border-t border-gray-700 my-2"></div>
        <div className="flex flex-col items-center space-y-6 py-8">
          <div className="bg-gray-700/50 p-6 rounded-full">
            <SolanaLogo
              className={`h-12 w-12 ${
                hasMismatchCondition ? "text-amber-400" : "text-green-400"
              }`}
            />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-white">
              {hasMismatchCondition
                ? "Wallet Address Mismatch Detected"
                : "Wallet Connected Successfully"}
            </h3>
            <p className="text-gray-400 max-w-md">
              {hasMismatchCondition
                ? "There's a mismatch between your stored and connected wallet addresses. Please reconnect with the correct wallet."
                : "Your Solana wallet is connected and ready to manage payments, track transactions, and receive funds from buyers."}
            </p>
          </div>
        </div>
      </div>
      <div className="hidden md:block border-l border-gray-700 mx-4"></div>
      <div className="md:hidden border-t border-gray-700 my-4"></div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-white mb-4">
          Wallet Details
        </h3>
        <div className="space-y-4">
          <div className="bg-gray-700/20 rounded-lg p-4">
            <div className="flex flex-col space-y-1">
              <span className="text-sm text-gray-400">
                {hasWalletMismatch ? "Stored Wallet Address" : "Wallet Address"}
              </span>
              <div className="flex items-center justify-between bg-gray-800 p-3 rounded-md">
                <span className="text-gray-200 font-mono">
                  {truncateAddress(displayAddress || "")}
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyAddress}
                    className="h-8 w-8 rounded-full bg-gray-700 hover:bg-gray-600"
                    disabled={isProcessing}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-300" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onViewOnExplorer}
                    className="h-8 w-8 rounded-full bg-gray-700 hover:bg-gray-600"
                    disabled={isProcessing}
                  >
                    <ExternalLink className="h-4 w-4 text-gray-300" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center item-center inline-flex h-10 rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] animate-shimmer px-4 text-sm text-slate-400 transition-colors focus:outline-none focus:ring-0 focus:border-transparent overflow-hidden hover:text-white hover:cursor-pointer relative z-10 brightness-[1.4] hover:brightness-[1.75]"
            onClick={onDisconnect}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-white rounded-full mr-2"></div>
                <span>Disconnecting...</span>
              </div>
            ) : (
              "Disconnect Wallet"
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-300/20" />
          </Button>
          <WalletMismatchWarning
            hasWalletMismatch={hasWalletMismatch}
            hasStoredButNotConnected={hasStoredButNotConnected}
            walletAddress={walletAddress}
            publicKey={publicKey}
            intentionalOperation={intentionalOperation}
          />
        </div>
      </div>
    </div>
  );
};
