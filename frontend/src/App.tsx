import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/pages/auth/AuthPage";
import LoginValidationPage from "@/pages/auth/LoginValidationPage";
import ProfileSelectionPage from "@/pages/profileSelection/ProfileSelectionPage";
import ErrorPage from "@/pages/error/ErrorPage";
import LandingPage from "@/pages/landing/LandingPage";
import ProtectedRouteWrapper from "@/components/wrappers/protectedRouteWrapper";
import SellerDashboardPage from "@/pages/sellerDashboard/SellerDashboardPage";
import { SolanaWalletProvider } from "./components/providers/SolanaWalletProvider";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

function App() {
  const network =
    import.meta.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet"
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

  const router = createBrowserRouter([
    {
      path: "/",
      element: <LandingPage />,
      errorElement: <ErrorPage />,
    },
    {
      path: "/authentication",
      element: <AuthPage />,
    },
    {
      path: "/loginValidation",
      element: <LoginValidationPage />,
    },
    {
      path: "/profile-selection",
      element: (
        <ProtectedRouteWrapper>
          <ProfileSelectionPage />
        </ProtectedRouteWrapper>
      ),
    },
    {
      path: "/seller-dashboard",
      element: (
        <ProtectedRouteWrapper>
          <SellerDashboardPage />
        </ProtectedRouteWrapper>
      ),
    },
  ]);

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
