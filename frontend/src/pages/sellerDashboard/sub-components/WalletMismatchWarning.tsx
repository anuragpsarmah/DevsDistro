import { AlertTriangle } from "lucide-react";
import { WalletMismatchWarningProps } from "../utils/types";

export const WalletMismatchWarning = ({
  hasWalletMismatch,
  hasStoredButNotConnected,
  walletAddress,
  publicKey,
  intentionalOperation,
}: WalletMismatchWarningProps) => {
  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (intentionalOperation) return null;
  if (!hasWalletMismatch && !hasStoredButNotConnected) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 backdrop-blur-sm">
      <div className="flex items-start space-x-3">
        <div className="space-y-2 w-full">
          <div className="flex flex-row items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <h4 className="text-amber-200 font-medium tracking-wide">
              Wallet Address Mismatch
            </h4>
          </div>
          {hasStoredButNotConnected ? (
            <p className="text-amber-200/70 text-sm leading-relaxed">
              You have a wallet address stored, but no wallet is currently
              connected. Disconnect and reconnect to enable transaction
              functionality.
            </p>
          ) : (
            <p className="text-amber-200/70 text-sm leading-relaxed">
              The connected wallet address differs from your stored address.
              Disconnect and reconnect to enable transaction functionality.
            </p>
          )}
          <div className="flex flex-col space-y-1.5 pt-2">
            {walletAddress && (
              <div className="flex items-center justify-between text-xs bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                <span className="text-amber-200/60">Stored</span>
                <span className="text-amber-200/90 font-mono">{truncateAddress(walletAddress)}</span>
              </div>
            )}
            {hasWalletMismatch && publicKey && (
              <div className="flex items-center justify-between text-xs bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                <span className="text-amber-200/60">Connected</span>
                <span className="text-amber-200/90 font-mono">{truncateAddress(publicKey.toString())}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
