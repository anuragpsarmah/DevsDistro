import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";
import { AxiosError } from "axios";
import { tryCatch } from "@/utils/tryCatch.util";
import { errorToast } from "@/components/ui/customToast";
import bs58 from "bs58";
import { WALLET_OP_DEBOUNCE_MS } from "../utils/constants";

interface UseWalletManagerProps {
  walletAddress: string | null;
  isLoading: boolean;
  onWalletConnect: (
    address: string,
    signature: string,
    message: string
  ) => Promise<void>;
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
  const { publicKey, disconnect, wallets, select, connected, signMessage } =
    useWallet();

  const [detectedWallets, setDetectedWallets] = useState<
    (typeof wallets)[number][]
  >([]);
  const [otherWallets, setOtherWallets] = useState<(typeof wallets)[number][]>(
    []
  );
  const [localProcessing, setLocalProcessing] = useState(false);
  const [isSigningMessage, setIsSigningMessage] = useState(false);

  const publicKeyString = publicKey?.toString() || null;

  const displayAddress = walletAddress || publicKeyString;
  const isMounted = useRef(true);
  const intentionalOperation = useRef(false);

  const hasWalletMismatch = useMemo(() => {
    return Boolean(
      walletAddress &&
        publicKeyString &&
        connected &&
        publicKeyString !== walletAddress
    );
  }, [walletAddress, publicKeyString, connected]);

  const hasStoredButNotConnected = useMemo(() => {
    return Boolean(walletAddress && !connected);
  }, [walletAddress, connected]);

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
      }, WALLET_OP_DEBOUNCE_MS);
    }
  }, [disconnect, isLoading, onWalletDisconnect, localProcessing]);

  useEffect(() => {
    const syncWalletToBackend = async () => {
      if (
        isLoading ||
        localProcessing ||
        intentionalOperation.current ||
        !isMounted.current ||
        isSigningMessage
      )
        return;

      if (publicKey && !walletAddress && connected && signMessage) {
        setLocalProcessing(true);
        setIsSigningMessage(true);
        intentionalOperation.current = true;

        const [, error] = await tryCatch(async () => {
          const message = `DevsDistro Wallet Verification\nAddress: ${publicKey.toString()}\nTimestamp: ${Date.now()}`;
          const messageBytes = new TextEncoder().encode(message);

          const signatureBytes = await signMessage(messageBytes);
          const signature = bs58.encode(signatureBytes);

          await onWalletConnect(publicKey.toString(), signature, message);
        });

        if (error) {
          console.error("Failed to sync wallet to backend:", error);
          if (!(error instanceof AxiosError)) {
            errorToast(
              "Failed to verify wallet ownership. Please try connecting again."
            );
          }
          await disconnect();
        }

        if (isMounted.current) {
          setLocalProcessing(false);
          setIsSigningMessage(false);
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
    signMessage,
    isSigningMessage,
  ]);

  const handleCopyAddress = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress).catch(() => {
        errorToast("Failed to copy address. Please try again.");
      });
    }
  };

  const handleSelectWallet = async (
    selectedWallet: WalletAdapter
  ): Promise<void> => {
    if (isLoading || localProcessing) return;
    select(selectedWallet.adapter.name as WalletName);
  };

  const handleWalletRedirect = (url: string): void => {
    window.open(url, "_blank");
  };

  const viewOnExplorer = () => {
    if (displayAddress) {
      const network = import.meta.env.VITE_SOLANA_NETWORK?.toLowerCase();
      const clusterParam =
        network === "mainnet" || network === "mainnet-beta"
          ? ""
          : `?cluster=${network || "devnet"}`;
      window.open(
        `https://explorer.solana.com/address/${displayAddress}${clusterParam}`,
        "_blank"
      );
    }
  };

  const isProcessing = isLoading || localProcessing || isSigningMessage;

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
