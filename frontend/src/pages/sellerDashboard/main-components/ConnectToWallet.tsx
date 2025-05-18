import { useState, useEffect, useCallback, useRef } from "react";
import { MagicCard } from "@/components/ui/magic-card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  CreditCard,
  CheckCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ErrorScreenConnectToWallet } from "../sub-components/ErrorScreens";

interface ConnectToWalletProps {
  walletAddress: string | null;
  isLoading: boolean;
  isError: boolean;
  onWalletConnect: (address: string) => Promise<void>;
  onWalletDisconnect: () => Promise<void>;
}

const ConnectToWallet = ({
  walletAddress,
  isLoading,
  isError,
  onWalletConnect,
  onWalletDisconnect,
}: ConnectToWalletProps) => {
  const { publicKey, disconnect, wallets, select, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);
  const [detectedWallets, setDetectedWallets] = useState<
    (typeof wallets)[number][]
  >([]);
  const [otherWallets, setOtherWallets] = useState<(typeof wallets)[number][]>(
    []
  );
  const [localProcessing, setLocalProcessing] = useState(false);

  // Single source of truth for wallet address - prefer publicKey when available
  const displayAddress = walletAddress || publicKey?.toString();

  // Track component mount state
  const isMounted = useRef(true);

  // Track intentional wallet operations to prevent loops
  const intentionalOperation = useRef(false);

  // NEW: Detect wallet mismatch
  const hasWalletMismatch = Boolean(
    walletAddress &&
      publicKey &&
      connected &&
      publicKey.toString() !== walletAddress
  );

  // NEW: Check if stored address exists but no wallet connected (cases 1)
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

    try {
      setLocalProcessing(true);
      intentionalOperation.current = true;

      // First perform wallet disconnect
      await disconnect();

      // Then notify parent component
      if (isMounted.current) {
        await onWalletDisconnect();
      }
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    } finally {
      if (isMounted.current) {
        setLocalProcessing(false);
        // Reset flag with a slight delay to prevent immediate reaction to state changes
        setTimeout(() => {
          intentionalOperation.current = false;
        }, 500);
      }
    }
  }, [disconnect, isLoading, onWalletDisconnect, localProcessing]);

  // This effect handles only the case where a wallet is connected but not stored in backend
  useEffect(() => {
    const syncWalletToBackend = async () => {
      if (
        isLoading ||
        localProcessing ||
        intentionalOperation.current ||
        !isMounted.current
      )
        return;

      // Case: Wallet connected but not yet saved in backend
      if (publicKey && !walletAddress && connected) {
        try {
          setLocalProcessing(true);
          intentionalOperation.current = true;
          await onWalletConnect(publicKey.toString());
        } catch (error) {
          console.error("Failed to sync wallet to backend:", error);
        } finally {
          if (isMounted.current) {
            setLocalProcessing(false);
            setTimeout(() => {
              intentionalOperation.current = false;
            }, 500);
          }
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
      navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  interface WalletAdapter {
    adapter: {
      name: string;
    };
    icon?: string;
  }

  const handleSelectWallet = (selectedWallet: WalletAdapter): void => {
    if (isLoading || localProcessing) return;

    select(selectedWallet.adapter.name as WalletName);
    setVisible(true);
  };

  const handleWalletRedirect = (url: string): void => {
    window.open(url, "_blank");
  };

  const truncateAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const viewOnExplorer = () => {
    if (displayAddress) {
      window.open(
        `https://explorer.solana.com/address/${displayAddress}`,
        "_blank"
      );
    }
  };

  interface WalletLinks {
    [key: string]: string;
  }

  const getWalletLink = (walletName: string): string => {
    const walletLinks: WalletLinks = {
      Phantom: "https://phantom.app/",
      Solflare: "https://solflare.com/",
      "Coinbase Wallet": "https://www.coinbase.com/wallet",
      Ledger: "https://www.ledger.com/",
      Clover: "https://clover.finance/",
      Torus: "https://tor.us/",
    };

    return walletLinks[walletName] || "#";
  };

  // Determine the loading state
  const isProcessing = isLoading || localProcessing;

  // Helper function to render wallet mismatch warning
  const renderWalletMismatchWarning = () => {
    if (!hasWalletMismatch && !hasStoredButNotConnected) return null;

    return (
      <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="text-amber-300 font-medium">
              Wallet Address Mismatch
            </h4>
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
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : !walletAddress ? (
          // Show connection interface when no address is stored
          <div className="flex flex-col md:flex-row">
            <div className="flex flex-col flex-1 space-y-6 md:pr-6">
              <div className="flex items-center space-x-3">
                <Wallet className="h-6 w-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-white">
                  Wallet Connection
                </h2>
              </div>

              <div className="border-t border-gray-700 my-2"></div>

              <div className="flex flex-col items-center space-y-6 py-8">
                <div className="bg-gray-700/50 p-6 rounded-full">
                  <CreditCard className="h-12 w-12 text-blue-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold text-white">
                    Connect Your Solana Wallet
                  </h3>
                  <p className="text-gray-400 max-w-md">
                    Link your Solana wallet to manage payments, track
                    transactions, and receive funds from buyers.
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden md:block border-l border-gray-700 mx-4"></div>

            <div className="md:hidden border-t border-gray-700 my-4"></div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-4">
                Select a wallet
              </h3>

              {detectedWallets.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm text-gray-400 mb-2">
                    Detected Wallets
                  </h4>
                  <div className="space-y-2">
                    {detectedWallets.map((walletAdapter) => (
                      <Button
                        key={walletAdapter.adapter.name}
                        variant="outline"
                        className="w-full justify-between border-gray-600 bg-gray-700 text-white hover:bg-gray-600 hover:text-white transition duration-300"
                        onClick={() => handleSelectWallet(walletAdapter)}
                        disabled={isProcessing}
                      >
                        <div className="flex items-center">
                          {walletAdapter.adapter.icon && (
                            <img
                              src={walletAdapter.adapter.icon}
                              alt={`${walletAdapter.adapter.name} icon`}
                              className="w-5 h-5 mr-2"
                            />
                          )}
                          <span>{walletAdapter.adapter.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm text-gray-400 mb-2">Other Wallets</h4>
                <div className="space-y-2">
                  {otherWallets.map((walletAdapter) => (
                    <Button
                      key={walletAdapter.adapter.name}
                      variant="outline"
                      className="w-full justify-between border-gray-600 bg-gray-700 text-white hover:bg-gray-600 hover:text-white transition duration-300"
                      onClick={() =>
                        handleWalletRedirect(
                          getWalletLink(walletAdapter.adapter.name)
                        )
                      }
                      disabled={isProcessing}
                    >
                      <div className="flex items-center">
                        {walletAdapter.adapter.icon && (
                          <img
                            src={walletAdapter.adapter.icon}
                            alt={`${walletAdapter.adapter.name} icon`}
                            className="w-5 h-5 mr-2"
                          />
                        )}
                        <span>{walletAdapter.adapter.name}</span>
                      </div>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
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

            {renderWalletMismatchWarning()}

            <div className="flex flex-col space-y-4">
              <div className="bg-gray-700/20 rounded-lg p-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-gray-400">
                    {hasWalletMismatch
                      ? "Currently Connected Address"
                      : "Wallet Address"}
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
                        onClick={viewOnExplorer}
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
                className="border-gray-600 bg-gray-700 text-gray-200 hover:bg-gray-600 hover:text-white transition duration-300 w-full"
                onClick={handleDisconnect}
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
              </Button>
            </div>
          </div>
        )}
      </MagicCard>
    </div>
  );
};

export default ConnectToWallet;
