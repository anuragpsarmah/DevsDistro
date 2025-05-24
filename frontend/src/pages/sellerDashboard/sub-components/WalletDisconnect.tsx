import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { WalletDisconnectProps } from "../utils/types";

export const WalletDisconnect = ({
  displayAddress,
  hasWalletMismatch,
  isProcessing,
  onDisconnect,
  onCopyAddress,
  onViewOnExplorer,
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

  return (
    <div className="space-y-4">
      <div className="w-full flex flex-col space-y-6 lg:space-y-0 lg:flex-row lg:justify-between lg:items-baseline lg:gap-4">
        <div className="flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white m-0">
            Wallet Connection
          </h2>
        </div>
        <div className="inline-flex items-center bg-gray-700/30 rounded-lg px-3 py-1.5 justify-center">
          <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
          <span className="text-green-400 font-medium">Connected</span>
        </div>
      </div>

      <div className="border-t border-gray-700 my-2"></div>

      <div className="flex flex-col space-y-4">
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
      </div>
    </div>
  );
};
