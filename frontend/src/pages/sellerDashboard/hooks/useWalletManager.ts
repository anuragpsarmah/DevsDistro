import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { tryCatch } from "@/utils/tryCatch.util";
import { errorToast } from "@/components/ui/customToast";

interface UseWalletManagerProps {
  walletAddress: string | null;
  isLoading: boolean;
  onWalletConnect: (address: string) => Promise<void>;
  onWalletDisconnect: () => Promise<void>;
}

interface WalletAdapter {
  adapter: {
    name: string;
  };
  icon?: string;
}

export const useWalletManager = ({
  walletAddress,
  isLoading,
  onWalletConnect,
  onWalletDisconnect,
}: UseWalletManagerProps) => {
  const { publicKey, disconnect, wallets, select, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [detectedWallets, setDetectedWallets] = useState<
    (typeof wallets)[number][]
  >([]);
  const [otherWallets, setOtherWallets] = useState<(typeof wallets)[number][]>(
    []
  );
  const [localProcessing, setLocalProcessing] = useState(false);

  const displayAddress = walletAddress || publicKey?.toString();
  const isMounted = useRef(true);
  const intentionalOperation = useRef(false);

  const hasWalletMismatch = Boolean(
    walletAddress &&
    publicKey &&
    connected &&
    publicKey.toString() !== walletAddress
  );
  const hasStoredButNotConnected = Boolean(walletAddress && !connected);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const detected = wallets.filter(
      (adapter) => adapter.readyState === "Installed"
    );
    const others = wallets.filter(
      (adapter) => adapter.readyState !== "Installed"
    );
    setDetectedWallets(detected);
    setOtherWallets(others);
  }, [wallets]);

  const handleDisconnect = useCallback(async () => {
    if (isLoading || localProcessing) return;

    setLocalProcessing(true);
    intentionalOperation.current = true;

    if (isMounted.current) {
      const [, error] = await tryCatch(async () => {
        await disconnect();
        await onWalletDisconnect();
      });

      if (error) {
        console.error("Failed to disconnect wallet:", error);
      }
    }

    if (isMounted.current) {
      setLocalProcessing(false);
      setTimeout(() => {
        intentionalOperation.current = false;
      }, 500);
    }
  }, [disconnect, isLoading, onWalletDisconnect, localProcessing]);

  useEffect(() => {
    const syncWalletToBackend = async () => {
      if (
        isLoading ||
        localProcessing ||
        intentionalOperation.current ||
        !isMounted.current
      )
        return;

      if (publicKey && !walletAddress && connected) {
        setLocalProcessing(true);
        intentionalOperation.current = true;
        const [, error] = await tryCatch(() =>
          onWalletConnect(publicKey.toString())
        );

        if (error) {
          console.error("Failed to sync wallet to backend:", error);
        }

        if (isMounted.current) {
          setLocalProcessing(false);
          setTimeout(() => {
            intentionalOperation.current = false;
          }, 500);
        }
      }
    };

    syncWalletToBackend();
  }, [
    publicKey,
    walletAddress,
    connected,
    isLoading,
    onWalletConnect,
    localProcessing,
  ]);

  const handleCopyAddress = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress).catch(() => {
        errorToast("Failed to copy address. Please try again.");
      });
    }
  };

  const handleSelectWallet = (selectedWallet: WalletAdapter): void => {
    if (isLoading || localProcessing) return;
    select(selectedWallet.adapter.name as WalletName);
    setVisible(true);
  };

  const handleWalletRedirect = (url: string): void => {
    window.open(url, "_blank");
  };

  const viewOnExplorer = () => {
    if (displayAddress) {
      window.open(
        `https://explorer.solana.com/address/${displayAddress}`,
        "_blank"
      );
    }
  };

  const isProcessing = isLoading || localProcessing;

  return {
    detectedWallets,
    otherWallets,
    displayAddress,
    hasWalletMismatch,
    hasStoredButNotConnected,
    isProcessing,
    intentionalOperation: intentionalOperation.current,
    handleDisconnect,
    handleSelectWallet,
    handleCopyAddress,
    handleWalletRedirect,
    viewOnExplorer,
  };
};
