import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle, Copy, ExternalLink, LogOut, Loader2 } from "lucide-react";
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
    <div className="flex flex-col md:flex-row gap-12 lg:gap-16">
      <div className="flex flex-col flex-1 space-y-8">
        <div className="flex items-center space-x-4 pb-4 border-b-2 border-black dark:border-white transition-colors duration-300">
          <div className={`p-2 border-2 ${hasMismatchCondition ? "border-red-500 bg-red-500/10" : "border-black dark:border-white bg-black dark:bg-white"}`}>
            <Wallet className={`h-6 w-6 ${hasMismatchCondition ? "text-red-500 animate-[pulse_1s_steps(2,start)_infinite]" : "text-white dark:text-black"}`} />
          </div>
          <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-black dark:text-white transition-colors duration-300">
            Solana Wallet
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center flex-grow py-8 space-y-8">
          <div className="relative group">
            <div className={`p-8 border-2 bg-white dark:bg-[#050505] transition-all duration-300 ${hasMismatchCondition
                ? "border-red-500 group-hover:shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]"
                : "border-black dark:border-white group-hover:bg-black dark:group-hover:bg-white group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              } group-hover:-translate-y-1`}>
              <SolanaLogo
                className={`h-16 w-16 transition-colors duration-300 ${hasMismatchCondition ? "text-red-500" : "text-black dark:text-white group-hover:text-white dark:group-hover:text-black"
                  }`}
              />
            </div>
          </div>

          <div className="text-center space-y-4 max-w-sm">
            <h3 className={`text-xl font-space font-bold uppercase tracking-widest transition-colors duration-300 ${hasMismatchCondition ? "text-red-600 dark:text-red-500" : "text-black dark:text-white"
              }`}>
              {hasMismatchCondition
                ? "Wallet Mismatch"
                : "Wallet Connected"}
            </h3>
            <p className="font-space text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors duration-300">
              {hasMismatchCondition
                ? "There's a mismatch between your stored and connected wallet addresses. Please reconnect with the correct wallet."
                : "Your Solana wallet is connected and ready to manage payments, track transactions, and receive funds from buyers."}
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:block w-[2px] bg-black dark:bg-white transition-colors duration-300" />

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-[2px] bg-red-500"></div>
          <h3 className="text-lg font-space font-bold uppercase tracking-widest text-black dark:text-white transition-colors duration-300">
            Wallet Details
          </h3>
        </div>

        <div className="space-y-8">
          <div className="bg-transparent border-2 border-black dark:border-white p-6 transition-colors duration-300">
            <div className="space-y-2">
              <span className="text-xs font-space font-bold text-red-500 uppercase tracking-[0.2em]">
                {hasWalletMismatch ? "Stored Wallet Address" : "Current Wallet Address"}
              </span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg text-black dark:text-white font-space font-bold tracking-wider">
                  {truncateAddress(displayAddress || "")}
                </span>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyAddress}
                    className="h-10 w-10 rounded-none border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all duration-300"
                    disabled={isProcessing}
                    title="Copy Address"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onViewOnExplorer}
                    className="h-10 w-10 rounded-none border-2 border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all duration-300"
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
            className="w-full h-14 bg-red-500 text-white border-2 border-transparent hover:border-black dark:hover:border-white rounded-none transition-all duration-300 flex items-center justify-center gap-3 group font-space uppercase tracking-widest font-bold text-sm hover:bg-red-600"
            onClick={onDisconnect}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-white" />
                <span>Disconnecting...</span>
              </>
            ) : (
              <>
                <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                <span>Disconnect Wallet</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
