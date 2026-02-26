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
    <div className="bg-red-500/10 border-2 border-red-500 rounded-none p-6 mb-4 transition-colors duration-300">
      <div className="flex items-start space-x-4">
        <div className="space-y-4 w-full">
          <div className="flex flex-row items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <h4 className="text-red-500 font-syne uppercase tracking-widest font-bold text-lg">
              Address Mismatch
            </h4>
          </div>
          {hasStoredButNotConnected ? (
            <p className="text-red-500/80 font-space text-sm leading-relaxed">
              You have a wallet address stored, but no wallet is currently
              connected. Disconnect and reconnect to enable transaction
              functionality.
            </p>
          ) : (
            <p className="text-red-500/80 font-space text-sm leading-relaxed">
              The connected wallet address differs from your stored address.
              Disconnect and reconnect to enable transaction functionality.
            </p>
          )}
          <div className="flex flex-col space-y-2 pt-2">
            {walletAddress && (
              <div className="flex items-center justify-between text-xs bg-red-500/5 p-3 rounded-none border-2 border-red-500/20">
                <span className="text-red-500 font-space font-bold uppercase tracking-[0.2em]">Stored</span>
                <span className="text-red-500 font-mono tracking-wider">{truncateAddress(walletAddress)}</span>
              </div>
            )}
            {hasWalletMismatch && publicKey && (
              <div className="flex items-center justify-between text-xs bg-red-500/5 p-3 rounded-none border-2 border-red-500/20">
                <span className="text-red-500 font-space font-bold uppercase tracking-[0.2em]">Connected</span>
                <span className="text-red-500 font-mono tracking-wider">{truncateAddress(publicKey.toString())}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
