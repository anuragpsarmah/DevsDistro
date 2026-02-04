import { useCallback, useRef, useEffect, useState } from "react";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import ConnectToWallet from "../main-components/ConnectToWallet";
import { useUpdateWalletAddressMutation } from "@/hooks/apiMutations";
import { useGetWalletAddress } from "@/hooks/apiQueries";
import { useWallet } from "@solana/wallet-adapter-react";
import { SolanaLogo } from "@/components/ui/solanaLogo";
import { errorToast } from "@/components/ui/customToast";
import { tryCatch } from "@/utils/tryCatch.util";

interface BillingAndPaymentsTabProps {
  logout?: () => Promise<void>;
}

export default function BillingAndPaymentsTab({
  logout,
}: BillingAndPaymentsTabProps) {
  const pendingOperation = useRef(false);
  const hasInitialized = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const { publicKey, connected, disconnect } = useWallet();

  const {
    data: walletData,
    isLoading: existingAddressLoading,
    isError: existingAddressError,
  } = useGetWalletAddress({ logout });

  const { mutateAsync: updateWalletAddressMutate, isPending: isUpdating } =
    useUpdateWalletAddressMutation({
      logout,
    });

  const existingAddress = walletData?.data?.wallet_address || null;

  useEffect(() => {
    if (!existingAddressLoading && walletData && !hasInitialized.current) {
      hasInitialized.current = true;

      const needsCleanup = !existingAddress && connected && publicKey;
      
      if (needsCleanup) {
        setIsInitializing(true);
        
        const cleanupSilentConnection = async () => {
          const [, error] = await tryCatch(() => disconnect());
          if (error) {
            console.error("Error disconnecting silently connected wallet:", error);
            errorToast("Error disconnecting silently connected wallet. Refresh the page.");
          }
          setTimeout(() => {
            setIsInitializing(false);
          }, 500);
        };

        cleanupSilentConnection();
      } else {
        setIsInitializing(false);
      }

      return () => {
        setIsInitializing(false);
      };
    }
  }, [
    existingAddressLoading,
    walletData,
    disconnect,
    connected,
    publicKey,
    existingAddress,
  ]);

  const handleWalletConnect = useCallback(
    async (address: string, signature: string, message: string) => {
      if (isInitializing || pendingOperation.current) return;
      if (existingAddressLoading || isUpdating) return;
      if (address === existingAddress) return;

      pendingOperation.current = true;
      const [, error] = await tryCatch(() =>
        updateWalletAddressMutate({ address, signature, message })
      );

      setTimeout(() => {
        pendingOperation.current = false;
      }, 500);

      if (error) throw error;
    },
    [
      existingAddressLoading,
      isUpdating,
      existingAddress,
      updateWalletAddressMutate,
      isInitializing,
    ]
  );

  const handleWalletDisconnect = useCallback(async () => {
    if (isInitializing || pendingOperation.current) return;
    if (existingAddressLoading || isUpdating) return;
    if (!existingAddress) return;

    pendingOperation.current = true;
    const [, error] = await tryCatch(() => updateWalletAddressMutate(""));

    setTimeout(() => {
      pendingOperation.current = false;
    }, 500);

    if (error) throw error;
  }, [
    existingAddressLoading,
    isUpdating,
    existingAddress,
    updateWalletAddressMutate,
    isInitializing,
  ]);

  const isLoading = existingAddressLoading || isUpdating || isInitializing;

  return (
    <AnimatedLoadWrapper>
      <div className="flex flex-col h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6">
        <div className="flex-shrink-0 mb-4 lg:mb-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <SolanaLogo className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl text-left font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Wallet Connection
              </h1>
              <p className="text-xs lg:text-sm text-gray-500">Manage your wallet and payment settings</p>
            </div>
          </div>
        </div>
        <ConnectToWallet
          walletAddress={existingAddress}
          isLoading={isLoading}
          isError={existingAddressError}
          onWalletConnect={handleWalletConnect}
          onWalletDisconnect={handleWalletDisconnect}
        />
      </div>
    </AnimatedLoadWrapper>
  );
}
