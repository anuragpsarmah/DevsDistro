import { Button } from "@/components/ui/button";
import { Wallet, CreditCard, ChevronRight, ExternalLink } from "lucide-react";
import { WalletConnectProps } from "../utils/types";

export const WalletConnect = ({
  detectedWallets,
  otherWallets,
  isProcessing,
  onSelectWallet,
  onWalletRedirect,
}: WalletConnectProps) => {
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

  const handleWalletRedirect = (walletName: string): void => {
    onWalletRedirect(getWalletLink(walletName));
  };

  return (
    <div className="flex flex-col md:flex-row">
      <div className="flex flex-col flex-1 space-y-6 md:pr-6">
        <div className="flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">Wallet Connection</h2>
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
              Link your Solana wallet to manage payments, track transactions,
              and receive funds from buyers.
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
            <h4 className="text-sm text-gray-400 mb-2">Detected Wallets</h4>
            <div className="space-y-2">
              {detectedWallets.map((walletAdapter) => (
                <Button
                  key={walletAdapter.adapter.name}
                  variant="outline"
                  className="w-full justify-between inline-flex h-10 rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] animate-shimmer px-4 text-sm text-slate-400 transition-colors focus:outline-none focus:ring-0 focus:border-transparent overflow-hidden hover:text-white hover:cursor-pointer relative z-10 brightness-[1.4] hover:brightness-[1.75]"
                  onClick={() => onSelectWallet(walletAdapter)}
                  disabled={isProcessing}
                >
                  <div className="flex items-center">
                    {walletAdapter.adapter.icon && (
                      <img
                        src={walletAdapter.adapter.icon}
                        alt={`${walletAdapter.adapter.name} icon`}
                        className="w-5 h-5 mr-2 brightness-[0.6] contrast-150"
                      />
                    )}
                    <span>{walletAdapter.adapter.name}</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-blue-300/20" />
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
                onClick={() => handleWalletRedirect(walletAdapter.adapter.name)}
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
  );
};
