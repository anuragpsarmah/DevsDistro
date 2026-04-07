import { Button } from "@/components/ui/button";
import { Wallet, ChevronRight, ExternalLink } from "lucide-react";
import { WalletConnectProps } from "../utils/types";
import { SolanaLogo } from "@/components/ui/solanaLogo";
import { WALLET_LINKS } from "../utils/constants";

export const WalletConnect = ({
  detectedWallets,
  otherWallets,
  isProcessing,
  onSelectWallet,
  onWalletRedirect,
}: WalletConnectProps) => {
  const getWalletLink = (walletName: string): string => {
    return WALLET_LINKS[walletName] || "#";
  };

  const handleWalletRedirect = (walletName: string): void => {
    onWalletRedirect(getWalletLink(walletName));
  };

  return (
    <div className="flex flex-col md:flex-row gap-12 lg:gap-16">
      <div className="flex flex-col flex-1 space-y-8">
        <div className="flex items-center space-x-4 pb-4 border-b-2 border-black dark:border-white transition-colors duration-300">
          <div className="p-2 border-2 border-black dark:border-white bg-black dark:bg-white transition-colors duration-300">
            <Wallet className="h-6 w-6 text-white dark:text-black" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-black dark:text-white transition-colors duration-300">
            Solana Wallet
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center flex-grow py-8 space-y-8">
          <div className="relative group">
            <div className="p-8 border-2 border-black dark:border-white bg-white dark:bg-[#050505] transition-all duration-300 group-hover:bg-black dark:group-hover:bg-white group-hover:-translate-y-1 group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <SolanaLogo className="h-16 w-16 text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors" />
            </div>
          </div>

          <div className="text-center space-y-4 max-w-sm">
            <h3 className="text-xl font-space font-bold uppercase tracking-widest text-black dark:text-white transition-colors duration-300">
              Connect Your Wallet
            </h3>
            <p className="font-space text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors duration-300">
              Link your Solana wallet to manage payments, verify ownership, and
              track your project sales.
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:block w-[2px] bg-black dark:bg-white transition-colors duration-300" />

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-[2px] bg-red-500"></div>
          <h3 className="text-lg font-space font-bold uppercase tracking-widest text-black dark:text-white transition-colors duration-300">
            Select a Wallet
          </h3>
        </div>

        <div className="space-y-8">
          {detectedWallets.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-space font-bold text-red-500 uppercase tracking-[0.2em] ml-1">
                Detected
              </h4>
              <div className="space-y-4">
                {detectedWallets.map((walletAdapter) => (
                  <Button
                    key={walletAdapter.adapter.name}
                    variant="outline"
                    className="w-full justify-between h-16 px-6 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none transition-all duration-300 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black group font-space uppercase tracking-wider font-bold text-sm"
                    onClick={() => onSelectWallet(walletAdapter)}
                    disabled={isProcessing}
                  >
                    <div className="flex items-center gap-4">
                      {walletAdapter.adapter.icon && (
                        <div className="p-1 transition-colors">
                          <img
                            src={walletAdapter.adapter.icon}
                            alt={`${walletAdapter.adapter.name} icon`}
                            className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all duration-300"
                          />
                        </div>
                      )}
                      <span>{walletAdapter.adapter.name}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {otherWallets.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-space font-bold text-red-500 uppercase tracking-[0.2em] ml-1">
                Other Options
              </h4>
              <div className="space-y-4">
                {otherWallets.map((walletAdapter) => (
                  <Button
                    key={walletAdapter.adapter.name}
                    variant="outline"
                    className="w-full justify-between h-14 px-6 bg-transparent border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-none transition-all duration-300 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white group font-space uppercase tracking-wider font-bold text-xs"
                    onClick={() =>
                      handleWalletRedirect(walletAdapter.adapter.name)
                    }
                    disabled={isProcessing}
                  >
                    <div className="flex items-center gap-4">
                      {walletAdapter.adapter.icon && (
                        <div className="grayscale opacity-50 group-hover:opacity-100 transition-all duration-300">
                          <img
                            src={walletAdapter.adapter.icon}
                            alt={`${walletAdapter.adapter.name} icon`}
                            className="w-5 h-5"
                          />
                        </div>
                      )}
                      <span>{walletAdapter.adapter.name}</span>
                    </div>
                    <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-colors" />
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
