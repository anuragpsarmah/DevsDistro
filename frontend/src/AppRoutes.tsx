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
    path: "*",
    element: <ErrorPage />,
  },
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/p/:slug",
    element: <SharedProjectPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/authentication",
    element: <AuthPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/loginValidation",
    element: <LoginValidationPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/terms",
    element: <TermsOfService />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/privacy",
    element: <PrivacyPolicy />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/api",
    element: <ApiPage />,
    errorElement: <ErrorPage />,
  },
  {
    element: <SmoothTransitionWrapper />,
    errorElement: <ErrorPage />,
    children: [
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
