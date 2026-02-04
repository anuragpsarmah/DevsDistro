import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle, Copy, ExternalLink, LogOut } from "lucide-react";
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

  const shouldShowMismatchUI = () => {
    if (intentionalOperation) return false;

    if (!hasWalletMismatch && !hasStoredButNotConnected) return false;

    return true;
  };

  const hasMismatchCondition = shouldShowMismatchUI();

  return (
    <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
      <div className="flex flex-col flex-1 space-y-8">
        <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
           <div className={`p-2 rounded-lg ${hasMismatchCondition ? "bg-amber-500/10" : "bg-green-500/10"}`}>
             <Wallet className={`h-6 w-6 ${hasMismatchCondition ? "text-amber-400" : "text-green-400"}`} />
           </div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Solana Wallet
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center flex-grow py-8 space-y-6">
          <div className="relative group">
            <div className={`absolute inset-0 blur-xl rounded-full opacity-50 transition-colors duration-500 ${
              hasMismatchCondition ? "bg-amber-500/20" : "bg-green-500/20"
            }`} />
            <div className={`bg-gray-800/50 p-8 rounded-2xl border backdrop-blur-sm relative transition-colors duration-300 ${
              hasMismatchCondition ? "border-amber-500/20" : "border-green-500/20"
            }`}>
              <SolanaLogo
                className={`h-16 w-16 ${
                  hasMismatchCondition ? "text-amber-400" : "text-green-400"
                }`}
              />
            </div>
          </div>

          <div className="text-center space-y-3 max-w-sm">
            <h3 className={`text-xl font-semibold ${
              hasMismatchCondition ? "text-amber-100" : "text-white"
            }`}>
              {hasMismatchCondition
                ? "Wallet Address Mismatch Detected"
                : "Wallet Connected Successfully"}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {hasMismatchCondition
                ? "There's a mismatch between your stored and connected wallet addresses. Please reconnect with the correct wallet."
                : "Your Solana wallet is connected and ready to manage payments, track transactions, and receive funds from buyers."}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      <div className="flex-1 flex flex-col justify-center">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          Wallet Details
        </h3>
        
        <div className="space-y-6">
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="p-4 space-y-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {hasWalletMismatch ? "Stored Wallet Address" : "Current Wallet Address"}
              </span>
              <div className="flex items-center justify-between">
                <span className="text-lg text-white font-mono tracking-wider">
                  {truncateAddress(displayAddress || "")}
                </span>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyAddress}
                    className="h-8 w-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                    disabled={isProcessing}
                    title="Copy Address"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onViewOnExplorer}
                    className="h-8 w-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                    disabled={isProcessing}
                    title="View on Explorer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <WalletMismatchWarning
            hasWalletMismatch={hasWalletMismatch}
            hasStoredButNotConnected={hasStoredButNotConnected}
            walletAddress={walletAddress}
            publicKey={publicKey}
            intentionalOperation={intentionalOperation}
          />

          <Button
            type="button"
            variant="destructive"
            className="w-full h-12 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group"
            onClick={onDisconnect}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full" />
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>Disconnect Wallet</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
