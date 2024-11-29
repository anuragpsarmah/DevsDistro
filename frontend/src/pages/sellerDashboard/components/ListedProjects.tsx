import { useState } from "react";
import { MagicCard } from "@/components/ui/magic-card";
import { ListedProjectsProps } from "../utils/types";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, EyeOff, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

const ListedProjects = ({
  initialProjectData,
  handleToggleProjectListing,
}: ListedProjectsProps) => {
  const [projectStatuses, setProjectStatuses] = useState(
    initialProjectData.map((data) => data.isActive)
  );

  const handleProjectToggle = async (index: number) => {
    const updatedStatuses = [...projectStatuses];
    updatedStatuses[index] = !updatedStatuses[index];
    const response = await handleToggleProjectListing(
      initialProjectData[index].title
    );
    if (response) setProjectStatuses(updatedStatuses);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  };

  const renderTechStack = (techStack: string[], maxVisible: number = 3) => {
    if (!techStack || techStack.length === 0) return null;

    const visibleTechs = techStack.slice(0, maxVisible);
    const extraTechs = techStack.length - maxVisible;

    return (
      <div className="flex flex-wrap gap-2 items-center">
        {visibleTechs.map((tech) => (
          <span
            key={tech}
            className={`
              px-2 py-1 
              bg-gray-700 text-gray-300
              text-xs rounded-full
              truncate max-w-[100px]
            `}
          >
            {tech}
          </span>
        ))}
        {extraTechs > 0 && (
          <span className="px-2 py-1 bg-gray-600 text-gray-400 text-xs rounded-full">
            +{extraTechs}
          </span>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-6 p-6">
        {initialProjectData.map((project, idx) => (
          <MagicCard
            key={idx}
            className="bg-gray-800 border border-gray-700 rounded-2xl p-6 transition-all duration-300 ease-in-out flex flex-col"
            gradientSize={300}
            gradientColor="#3B82F6"
            gradientOpacity={0.2}
          >
            <div className="relative mb-4">
              <div className="absolute top-2 right-2 z-10 flex items-center space-x-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      aria-label="Toggle project active status"
                      pressed={projectStatuses[idx]}
                      onPressedChange={() => handleProjectToggle(idx)}
                      className="bg-gray-700 hover:bg-gray-600 rounded-full p-1"
                    >
                      {projectStatuses[idx] ? (
                        <Eye className="h-5 w-5 text-gray-300" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-gray-500" />
                      )}
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-gray-700 text-gray-200 border-gray-600"
                  >
                    {projectStatuses[idx] ? "Unlist Project" : "List Project"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {}}
                      className="bg-gray-700 hover:bg-gray-600 rounded-full p-1"
                    >
                      <Edit className="h-5 w-5 text-gray-300" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-gray-700 text-gray-200 border-gray-600"
                  >
                    Modify Project
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="w-full h-48 overflow-hidden rounded-xl">
                <img
                  src={project.project_images}
                  alt={project.title}
                  className="w-full h-full object-cover"
                  style={{
                    opacity: projectStatuses[idx] ? 1 : 0.5,
                    filter: projectStatuses[idx] ? "none" : "grayscale(80%)",
                  }}
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 rounded-b-xl">
                <h2 className="text-xl font-bold truncate">
                  {truncateText(project.title, 25)}
                </h2>
              </div>
            </div>

            <div className="flex flex-col flex-grow space-y-4">
              <p
                className={`
                  text-gray-300 
                  line-clamp-3
                  ${!projectStatuses[idx] ? "opacity-50" : ""}
                `}
              >
                {truncateText(project.description, 120)}
              </p>
              <div className="mt-auto">
                {renderTechStack(project.tech_stack)}
              </div>
            </div>
          </MagicCard>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default ListedProjects;
