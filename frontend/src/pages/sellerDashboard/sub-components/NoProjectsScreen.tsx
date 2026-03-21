import { FolderOpen } from "lucide-react";

export const NoProjectsScreen: React.FC = () => {
  return (
    <div className="h-full p-4 lg:p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl border-2 border-black dark:border-white bg-white dark:bg-[#050505] p-8 lg:p-12 relative overflow-hidden flex flex-col items-center justify-center text-center transition-colors duration-300">
        <div className="mb-8">
          <div className="w-16 h-16 bg-black/5 dark:bg-white/5 flex items-center justify-center border-2 border-black dark:border-white">
            <FolderOpen
              className="h-8 w-8 text-black dark:text-white"
              strokeWidth={2}
            />
          </div>
        </div>

        <h2 className="text-2xl lg:text-3xl font-syne uppercase tracking-widest font-black text-black dark:text-white mb-6 transition-colors duration-300">
          No Projects Listed
        </h2>

        <div className="font-space max-w-md mx-auto space-y-4">
          <p className="text-black/40 dark:text-white/40 uppercase tracking-wider text-sm font-bold">
            [Status: Portfolio Empty]
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed transition-colors duration-300">
            Your project listing portfolio is empty. Head over to the List New
            Project tab to publish your first project to the marketplace.
          </p>
        </div>
      </div>
    </div>
  );
};
