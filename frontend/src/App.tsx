import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "@/components/pages/auth/auth";
import LoginValidation from "@/components/pages/auth/loginValidation";
import { Toaster } from "@/components/ui/toaster";
import ProfileSelection from "@/components/pages/profileSelection/profileSelection";
import ProtectedRoute from "@/components/pages/protectedRouteWrapper/protectedRouteWrapper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorPage from "@/components/pages/error/error";
import LandingPage from "@/components/pages/landing/landing";

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
      element: <Auth />,
    },
    {
      path: "/loginValidation",
      element: <LoginValidation />,
    },
    {
      path: "/profile-selection",
      element: (
        <ProtectedRoute>
          <ProfileSelection />
        </ProtectedRoute>
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
