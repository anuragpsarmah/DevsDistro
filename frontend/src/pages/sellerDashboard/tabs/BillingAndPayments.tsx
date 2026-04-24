import { useCallback, useRef, useEffect, useState } from "react";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import ConnectToWallet from "../main-components/ConnectToWallet";
import { useUpdateWalletAddressMutation } from "@/hooks/apiMutations";
import { useGetWalletAddress } from "@/hooks/apiQueries";
import { useWallet } from "@solana/wallet-adapter-react";
import { errorToast } from "@/components/ui/customToast";
import { tryCatch } from "@/utils/tryCatch.util";
import { WALLET_OP_DEBOUNCE_MS } from "../utils/constants";
import { BillingAndPaymentsTabProps } from "../utils/types";

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
            console.error(
              "Error disconnecting silently connected wallet:",
              error
            );
            errorToast(
              "Error disconnecting silently connected wallet. Refresh the page."
            );
          }
          setTimeout(() => {
            setIsInitializing(false);
          }, WALLET_OP_DEBOUNCE_MS);
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
      }, WALLET_OP_DEBOUNCE_MS);

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
    }, WALLET_OP_DEBOUNCE_MS);

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
      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)] mt-10 lg:mt-0 md:mt-0 pb-4 lg:pb-6 pt-32 lg:pt-40">
        <div className="absolute top-0 left-0 w-full z-10 pointer-events-none mt-10 lg:mt-0">
          <div className="flex items-center gap-3 mb-6 w-full pointer-events-auto">
            <div className="w-12 h-[2px] bg-red-500"></div>
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Wallet
            </span>
          </div>
          <div className="text-left w-full max-w-4xl pointer-events-auto">
            <h1 className="font-syne uppercase tracking-widest text-4xl lg:text-5xl font-black text-neutral-800 dark:text-white leading-none break-words hyphens-auto transition-colors duration-300">
              Billing & Payments
            </h1>
            <p className="font-space text-lg text-gray-600 dark:text-gray-400 mt-4 leading-relaxed transition-colors duration-300 max-w-2xl">
              Connect and manage your Solana wallet for transactions.
            </p>
          </div>
        </div>
        <div className="flex-grow flex items-center justify-center w-full">
          <ConnectToWallet
            walletAddress={existingAddress}
            isLoading={isLoading}
            isError={existingAddressError}
            onWalletConnect={handleWalletConnect}
            onWalletDisconnect={handleWalletDisconnect}
          />
        </div>
      </div>
    </AnimatedLoadWrapper>
  );
}
