
import { useWallet } from "@solana/wallet-adapter-react";
import { ErrorScreenConnectToWallet } from "../sub-components/ErrorScreens";
import { WalletConnect } from "../sub-components/WalletConnect";
import { WalletDisconnect } from "../sub-components/WalletDisconnect";
import { useWalletManager } from "../hooks/useWalletManager";
import { ConnectToWalletProps } from "../utils/types";

const ConnectToWallet = ({
  walletAddress,
  isLoading,
  isError,
  onWalletConnect,
  onWalletDisconnect,
}: ConnectToWalletProps) => {
  const { publicKey } = useWallet();
  const {
    detectedWallets,
    otherWallets,
    displayAddress,
    hasWalletMismatch,
    hasStoredButNotConnected,
    isProcessing,
    intentionalOperation,
    handleDisconnect,
    handleSelectWallet,
    handleCopyAddress,
    handleWalletRedirect,
    viewOnExplorer,
  } = useWalletManager({
    walletAddress,
    isLoading,
    onWalletConnect,
    onWalletDisconnect,
  });

  if (isError) {
    return (
      <div className="w-full h-full p-6 flex flex-col justify-center">
        <ErrorScreenConnectToWallet />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 flex flex-col justify-center">
      <div className="relative w-full max-w-6xl mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-xl rounded-2xl pointer-events-none" />
        <div className="relative bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 p-6 lg:p-8 transition-all duration-300 ease-in-out flex flex-col justify-center min-h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none rounded-2xl" />
          <div className="relative z-10 w-full">
            {!walletAddress ? (
              <WalletConnect
                detectedWallets={detectedWallets}
                otherWallets={otherWallets}
                isProcessing={isProcessing}
                onSelectWallet={handleSelectWallet}
                onWalletRedirect={handleWalletRedirect}
              />
            ) : (
              <div className="space-y-4">
                <WalletDisconnect
                  displayAddress={displayAddress || ""}
                  hasWalletMismatch={hasWalletMismatch}
                  isProcessing={isProcessing}
                  onDisconnect={handleDisconnect}
                  onCopyAddress={handleCopyAddress}
                  onViewOnExplorer={viewOnExplorer}
                  hasStoredButNotConnected={hasStoredButNotConnected}
                  walletAddress={walletAddress}
                  publicKey={publicKey}
                  intentionalOperation={intentionalOperation}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectToWallet;
