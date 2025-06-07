import { createBrowserRouter } from "react-router-dom";
import AuthPage from "@/pages/auth/AuthPage";
import LoginValidationPage from "@/pages/auth/LoginValidationPage";
import ProfileSelectionPage from "@/pages/profileSelection/ProfileSelectionPage";
import ErrorPage from "@/pages/error/ErrorPage";
import LandingPage from "@/pages/landing/LandingPage";
import ProtectedRouteWrapper from "@/components/wrappers/protectedRouteWrapper";
import SellerDashboardPage from "@/pages/sellerDashboard/SellerDashboardPage";
import BuyerDashboardPage from "./pages/buyerDashboard/BuyerDashboardPage";

export const router = createBrowserRouter([
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
  {
    path: "/buyer-marketplace",
    element: (
      <ProtectedRouteWrapper>
        <BuyerDashboardPage />
      </ProtectedRouteWrapper>
    ),
  },
]);
