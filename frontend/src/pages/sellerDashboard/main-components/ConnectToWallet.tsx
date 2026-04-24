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
    return <ErrorScreenConnectToWallet />;
  }

  return (
    <div className="relative max-w-6xl mx-auto w-full">
      <div className="relative bg-white dark:bg-[#050505] border-2 border-neutral-800 dark:border-white transition-colors duration-300 flex flex-col overflow-hidden shadow-[8px_8px_0px_0px_rgba(38,38,38,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
        <div className="relative z-10 p-8 md:p-12">
          <div className="w-full flex flex-col justify-center max-w-5xl mx-auto">
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
