import { Button } from "@/components/ui/button";
import { Wallet, ChevronRight, ExternalLink } from "lucide-react";
import { WalletConnectProps } from "../utils/types";
import { SolanaLogo } from "@/components/ui/solanaLogo";

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
    };

    return walletLinks[walletName] || "#";
  };

  const handleWalletRedirect = (walletName: string): void => {
    onWalletRedirect(getWalletLink(walletName));
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
      <div className="flex flex-col flex-1 space-y-8">
        <div className="flex items-center space-x-3 pb-4 border-b border-white/10">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <Wallet className="h-6 w-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Solana Wallet
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center flex-grow py-8 space-y-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
             <div className="bg-gray-800/50 p-8 rounded-2xl border border-white/5 backdrop-blur-sm relative transition-transform duration-300 group-hover:scale-105 group-hover:border-blue-500/20">
              <SolanaLogo className="h-16 w-16 text-blue-400" />
            </div>
          </div>
          
          <div className="text-center space-y-3 max-w-sm">
            <h3 className="text-xl font-semibold text-white">
              Connect Your Solana Wallet
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Link your Solana wallet to securely manage payments, verify ownership, and track your project sales directly on the blockchain.
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      <div className="flex-1 flex flex-col justify-center">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          Select a Wallet
        </h3>

        <div className="space-y-6">
          {detectedWallets.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Detected</h4>
              <div className="space-y-3">
                {detectedWallets.map((walletAdapter) => (
                  <Button
                    key={walletAdapter.adapter.name}
                    variant="ghost"
                    className="w-full justify-between h-14 px-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all duration-300 group"
                    onClick={() => onSelectWallet(walletAdapter)}
                    disabled={isProcessing}
                  >
                    <div className="flex items-center gap-3">
                      {walletAdapter.adapter.icon && (
                        <div className="bg-white/5 p-1.5 rounded-lg group-hover:bg-white/10 transition-colors">
                          <img
                            src={walletAdapter.adapter.icon}
                            alt={`${walletAdapter.adapter.name} icon`}
                            className="w-6 h-6"
                          />
                        </div>
                      )}
                      <span className="text-base font-medium text-white group-hover:text-blue-200 transition-colors">
                        {walletAdapter.adapter.name}
                      </span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {otherWallets.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider ml-1">Other Options</h4>
              <div className="space-y-3">
                {otherWallets.map((walletAdapter) => (
                  <Button
                    key={walletAdapter.adapter.name}
                    variant="outline"
                    className="w-full justify-between h-12 px-4 bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white hover:border-white/20 rounded-xl transition-all duration-300 group"
                    onClick={() => handleWalletRedirect(walletAdapter.adapter.name)}
                    disabled={isProcessing}
                  >
                    <div className="flex items-center gap-3">
                      {walletAdapter.adapter.icon && (
                        <div className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                          <img
                            src={walletAdapter.adapter.icon}
                            alt={`${walletAdapter.adapter.name} icon`}
                            className="w-5 h-5"
                          />
                        </div>
                      )}
                      <span className="font-medium">{walletAdapter.adapter.name}</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
