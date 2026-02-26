import { TooltipProvider } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";

export const ErrorScreenListedProjects: React.FC = () => {
  return (
    <TooltipProvider>
      <div className="h-full p-4 lg:p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl border-2 border-red-500 bg-red-500/5 p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>

          <div className="mb-8">
            <div className="w-16 h-16 bg-red-500/10 flex items-center justify-center border-2 border-red-500 animate-[pulse_1s_steps(2,start)_infinite]">
              <AlertTriangle className="h-8 w-8 text-red-500" strokeWidth={2} />
            </div>
          </div>

          <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-red-500 mb-6 transition-colors duration-300">
            System Failure
          </h2>

          <div className="font-space max-w-md mx-auto space-y-4">
            <p className="text-red-500/80 uppercase tracking-wider text-sm font-bold">
              [Error: Failed to Load Projects]
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300">
              We encountered a critical issue retrieving your project data. Please verify your connection status or re-initialize the dashboard later.
            </p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export const ErrorScreenConnectToWallet: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl border-2 border-red-500 bg-red-500/5 p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>

        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-red-500/10 flex items-center justify-center border-2 border-red-500 animate-[pulse_1s_steps(2,start)_infinite]">
            <AlertTriangle className="h-8 w-8 text-red-500" strokeWidth={2} />
          </div>
        </div>

        <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-red-500 mb-6 transition-colors duration-300">
          Wallet Connection Error
        </h2>

        <div className="font-space max-w-md mx-auto space-y-4">
          <p className="text-red-500/80 uppercase tracking-wider text-sm font-bold">
            [Error: Node Initialization Failed]
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300">
            We encountered a critical issue securing your wallet bridge layer. Please verify your provider extension connection or refresh the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};
