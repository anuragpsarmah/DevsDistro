import { useCallback, useRef } from "react";
import AnimatedLoadWrapper from "@/components/wrappers/AnimatedLoadWrapper";
import ConnectToWallet from "../main-components/ConnectToWallet";
import { useUpdateWalletAddressMutation } from "@/hooks/apiMutations";
import { useGetWalletAddress } from "@/hooks/apiQueries";

interface BillingAndPaymentsTabProps {
  logout?: () => Promise<void>;
}

export default function BillingAndPaymentsTab({
  logout,
}: BillingAndPaymentsTabProps) {
  const pendingOperation = useRef(false);

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

  const handleWalletConnect = useCallback(
    async (address: string) => {
      if (pendingOperation.current) return;
      if (existingAddressLoading || isUpdating) return;
      if (address === existingAddress) return;

      try {
        pendingOperation.current = true;
        await updateWalletAddressMutate(address);
      } finally {
        setTimeout(() => {
          pendingOperation.current = false;
        }, 500);
      }
    },
    [
      existingAddressLoading,
      isUpdating,
      existingAddress,
      updateWalletAddressMutate,
    ]
  );

  const handleWalletDisconnect = useCallback(async () => {
    if (pendingOperation.current) return;
    if (existingAddressLoading || isUpdating) return;
    if (!existingAddress) return;

    try {
      pendingOperation.current = true;
      await updateWalletAddressMutate("");
    } finally {
      setTimeout(() => {
        pendingOperation.current = false;
      }, 500);
    }
  }, [
    existingAddressLoading,
    isUpdating,
    existingAddress,
    updateWalletAddressMutate,
  ]);

  const isLoading = existingAddressLoading || isUpdating;

  return (
    <AnimatedLoadWrapper>
      <>
        <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
          <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
            Billing & Payments
          </h1>
          <ConnectToWallet
            walletAddress={existingAddress}
            isLoading={isLoading}
            isError={existingAddressError}
            onWalletConnect={handleWalletConnect}
            onWalletDisconnect={handleWalletDisconnect}
          />
        </div>
      </>
    </AnimatedLoadWrapper>
  );
}
