import { createBrowserRouter } from "react-router-dom";
import AuthPage from "@/pages/auth/AuthPage";
import LoginValidationPage from "@/pages/auth/LoginValidationPage";
import AppInstallCallbackPage from "@/pages/auth/AppInstallCallbackPage";
import ProfileSelectionPage from "@/pages/profileSelection/ProfileSelectionPage";
import ErrorPage from "@/pages/error/ErrorPage";
import LandingPage from "@/pages/landing/LandingPage";
import ProtectedRouteWrapper from "@/components/wrappers/ProtectedRouteWrapper";
import SellerDashboardPage from "@/pages/sellerDashboard/SellerDashboardPage";
import BuyerDashboardPage from "./pages/buyerDashboard/BuyerDashboardPage";
import TermsOfService from "@/pages/legal/TermsOfService";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import SmoothTransitionWrapper from "@/components/wrappers/SmoothTransitionWrapper";
import SharedProjectPage from "@/pages/share/SharedProjectPage";
import ApiPage from "@/pages/api/ApiPage";

export const router = createBrowserRouter([
  {
    element: <SmoothTransitionWrapper />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "*",
        element: <ErrorPage />,
      },
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/p/:slug",
        element: <SharedProjectPage />,
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
        path: "/terms",
        element: <TermsOfService />,
      },
      {
        path: "/privacy",
        element: <PrivacyPolicy />,
      },
      {
        path: "/api",
        element: <ApiPage />,
      },
      {
        path: "/app-install-callback",
        element: (
          <ProtectedRouteWrapper>
            <AppInstallCallbackPage />
          </ProtectedRouteWrapper>
        ),
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
    ],
  },
]);
