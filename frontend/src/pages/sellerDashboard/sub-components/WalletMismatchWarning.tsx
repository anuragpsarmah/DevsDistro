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
    <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="space-y-2">
          <div className="flex flex-row justify-center items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />

            <h4 className="text-amber-300 font-medium">
              Wallet Address Mismatch
            </h4>
          </div>
          {hasStoredButNotConnected ? (
            <p className="text-amber-200/80 text-sm">
              You have a wallet address stored, but no wallet is currently
              connected. Disconnect and reconnect to enable transaction
              functionality.
            </p>
          ) : (
            <p className="text-amber-200/80 text-sm">
              The connected wallet address differs from your stored address.
              Disconnect and reconnect to enable transaction functionality.
            </p>
          )}
          <div className="flex flex-col space-y-1 text-xs">
            {walletAddress && (
              <span className="text-amber-200/60">
                Stored: {truncateAddress(walletAddress)}
              </span>
            )}
            {hasWalletMismatch && publicKey && (
              <span className="text-amber-200/60">
                Connected: {truncateAddress(publicKey.toString())}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
