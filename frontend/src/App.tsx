import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useStripVisibleVersionParam } from "@/hooks/useStripVisibleVersionParam";
import { SolanaWalletProvider } from "./components/providers/SolanaWalletProvider";
import { ThemeProvider } from "./components/providers/ThemeProvider";
import { router } from "./AppRoutes";

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

function App() {
  useStripVisibleVersionParam();

  return (
    <ThemeProvider>
      <SolanaWalletProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster />
        </QueryClientProvider>
      </SolanaWalletProvider>
    </ThemeProvider>
  );
}

export default App;
