import { MagicCard } from "@/components/ui/magic-card";
import { Edit } from "lucide-react";

export const NoProjectsScreen: React.FC = () => {
  return (
    <div>
      <MagicCard
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-all duration-300 ease-in-out flex flex-col items-center justify-center"
        gradientSize={300}
        gradientColor="#3B82F6"
        gradientOpacity={0.2}
      >
        <div className="text-center flex flex-col items-center justify-center">
          <div className="mb-6 flex justify-center">
            <Edit className="h-16 w-16 text-blue-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-200 mb-4">
            No Projects Listed
          </h2>
          <p className="text-gray-400 mb-4 max-w-xs">
            Your project listing portfolio is empty. Start by listing your first
            project.
          </p>
        </div>
      </MagicCard>
    </div>
  );
};
