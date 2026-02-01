import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { SolanaWalletProvider } from "./components/providers/SolanaWalletProvider";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { router } from "./AppRoutes";

function App() {
  const network =
    import.meta.env.VITE_SOLANA_NETWORK === "mainnet"
      ? WalletAdapterNetwork.Mainnet
      : WalletAdapterNetwork.Devnet;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <SolanaWalletProvider network={network}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </SolanaWalletProvider>
  );
}

export default App;
