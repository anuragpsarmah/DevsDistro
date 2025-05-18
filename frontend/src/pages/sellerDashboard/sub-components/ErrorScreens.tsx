import { MagicCard } from "@/components/ui/magic-card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

export const ErrorScreenListedProjects: React.FC = () => {
  return (
    <TooltipProvider>
      <div>
        <MagicCard
          className="bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-all duration-300 ease-in-out flex flex-col items-center justify-center"
          gradientSize={300}
          gradientColor="#EF4444"
          gradientOpacity={0.2}
        >
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <AlertTriangle
                className="h-16 w-16 text-red-500"
                strokeWidth={1.5}
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-200 mb-4">
              Failed to Load Projects
            </h2>
            <p className="text-gray-400 mb-4 max-w-xs">
              We encountered an issue retrieving your project information.
              Please check your connection or try again later.
            </p>
          </div>
        </MagicCard>
      </div>
    </TooltipProvider>
  );
};

export const ErrorScreenConnectToWallet: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <MagicCard
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-all duration-300 ease-in-out flex flex-col items-center justify-center"
        gradientSize={300}
        gradientColor="#EF4444"
        gradientOpacity={0.2}
      >
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <AlertTriangle
              className="h-16 w-16 text-red-500"
              strokeWidth={1.5}
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            Wallet Connection Error
          </h2>
          <p className="text-gray-400 mb-4 max-w-xs mx-auto">
            We encountered an issue retrieving your wallet information. Please
            check your connection or try again later.
          </p>
        </div>
      </MagicCard>
    </div>
  );
};
