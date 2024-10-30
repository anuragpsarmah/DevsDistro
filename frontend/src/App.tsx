import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import AuthPage from "@/components/pages/auth/AuthPage";
import LoginValidationPage from "@/components/pages/auth/LoginValidationPage";
import ProfileSelectionPage from "@/components/pages/profileSelection/ProfileSelectionPage";
import ErrorPage from "@/components/pages/error/ErrorPage";
import LandingPage from "@/components/pages/landing/LandingPage";
import ProtectedRouteWrapper from "@/components/wrappers/protectedRouteWrapper";
import SellerDashboardPage from "./components/pages/sellerDashboard/SellerDashboardPage";

function App() {
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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
