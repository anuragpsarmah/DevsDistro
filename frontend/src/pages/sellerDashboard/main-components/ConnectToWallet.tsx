import { MagicCard } from "@/components/ui/magic-card";
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

  if (isError) return <ErrorScreenConnectToWallet />;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <MagicCard
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-all duration-300 ease-in-out flex items-center justify-center text-center h-full"
        gradientSize={300}
        gradientColor="#3B82F6"
        gradientOpacity={0.2}
      >
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
      </MagicCard>
    </div>
  );
};

export default ConnectToWallet;
