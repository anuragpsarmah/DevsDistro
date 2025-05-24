import { MagicCard } from "@/components/ui/magic-card";
import { Loader2 } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ErrorScreenConnectToWallet } from "../sub-components/ErrorScreens";
import { WalletConnect } from "../sub-components/WalletConnect";
import { WalletMismatchWarning } from "../sub-components/WalletMismatchWarning";
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
        {isProcessing ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : !walletAddress ? (
          <WalletConnect
            detectedWallets={detectedWallets}
            otherWallets={otherWallets}
            isProcessing={isProcessing}
            onSelectWallet={handleSelectWallet}
            onWalletRedirect={handleWalletRedirect}
          />
        ) : (
          <div className="space-y-4">
            <WalletMismatchWarning
              hasWalletMismatch={hasWalletMismatch}
              hasStoredButNotConnected={hasStoredButNotConnected}
              walletAddress={walletAddress}
              publicKey={publicKey}
              intentionalOperation={intentionalOperation}
            />
            <WalletDisconnect
              displayAddress={displayAddress || ""}
              hasWalletMismatch={hasWalletMismatch}
              isProcessing={isProcessing}
              onDisconnect={handleDisconnect}
              onCopyAddress={handleCopyAddress}
              onViewOnExplorer={viewOnExplorer}
            />
          </div>
        )}
      </MagicCard>
    </div>
  );
};

export default ConnectToWallet;
