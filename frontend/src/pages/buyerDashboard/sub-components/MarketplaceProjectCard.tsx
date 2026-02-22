import { Star, ExternalLink, User } from "lucide-react";
import type { MarketplaceProject } from "@/utils/types";

interface MarketplaceProjectCardProps {
  project: MarketplaceProject;
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

export default function MarketplaceProjectCard({
  project,
}: MarketplaceProjectCardProps) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-xl rounded-2xl pointer-events-none" />
      <div className="relative h-full bg-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 transition-all duration-300 ease-in-out flex flex-col hover:border-white/20 hover:shadow-lg hover:shadow-purple-500/10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-purple-600/[0.02] pointer-events-none" />

        <div className="relative z-10">
          <div className="w-full h-48 overflow-hidden">
            {project.project_images ? (
              <img
                src={project.project_images}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800/50 flex items-center justify-center">
                <span className="text-gray-500 text-sm">No preview</span>
              </div>
            )}
          </div>

          <div className="absolute top-3 right-3">
            <span className="px-3 py-1.5 bg-gray-900/80 backdrop-blur-sm text-white text-sm font-bold rounded-lg border border-white/10 shadow-lg">
              {project.price === 0 ? "Free" : `${project.price} SOL`}
            </span>
          </div>

          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-purple-500/20 backdrop-blur-sm text-purple-300 text-xs font-medium rounded-lg border border-purple-500/20">
              {project.project_type}
            </span>
          </div>
        </div>

        <div className="relative z-10 p-4 lg:p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
            {project.title}
          </h3>

          <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">
            {truncateText(project.description, 150)}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {project.tech_stack.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 bg-gray-700/60 text-gray-300 text-xs rounded-full truncate max-w-[100px]"
              >
                {tech}
              </span>
            ))}
            {project.tech_stack.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-600/60 text-gray-400 text-xs rounded-full">
                +{project.tech_stack.length - 3}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              {project.userid?.profile_image_url ? (
                <img
                  src={project.userid.profile_image_url}
                  alt={project.userid.username}
                  className="w-6 h-6 rounded-full border border-white/10 flex-shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                </div>
              )}
              <span className="text-gray-400 text-xs truncate">
                {project.userid?.name || project.userid?.username || "Unknown"}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {project.live_link && (
                <a
                  href={project.live_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-500 hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-gray-300 text-xs font-medium">
                  {project.avgRating > 0 ? project.avgRating.toFixed(1) : "New"}
                </span>
                {project.totalReviews > 0 && (
                  <span className="text-gray-500 text-xs">
                    ({project.totalReviews})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
