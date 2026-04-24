import { useState } from "react";
import { Star, ExternalLink, User, Heart, Loader2 } from "lucide-react";
import type { MarketplaceProject } from "@/utils/types";
import { useGetWishlistQuery } from "@/hooks/apiQueries";
import { useToggleWishlistMutation } from "@/hooks/apiMutations";

interface MarketplaceProjectCardProps {
  project: MarketplaceProject;
  onProjectClick?: (id: string) => void;
  logout?: () => Promise<void>;
  isPurchased?: boolean;
  noHoverEffect?: boolean;
  footerContent?: React.ReactNode;
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

export default function MarketplaceProjectCard({
  project,
  onProjectClick,
  logout,
  isPurchased = false,
  noHoverEffect = false,
  footerContent,
}: MarketplaceProjectCardProps) {
  const [imageError, setImageError] = useState(false);
  const { data: wishlist } = useGetWishlistQuery({ logout });
  const toggleWishlist = useToggleWishlistMutation({ logout });
  const isWishlisted = wishlist?.some((p) => p._id === project._id) ?? false;

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist.mutate(project._id);
  };
  return (
    <div
      className="relative group h-full cursor-pointer"
      onClick={() => onProjectClick?.(project._id)}
    >
      <div
        className={`relative h-full bg-white dark:bg-[#050505] border-2 border-neutral-800 dark:border-white transition-shadow duration-300 ease-in-out flex flex-col ${!noHoverEffect ? "hover:shadow-[4px_4px_0_0_rgba(38,38,38,1)] dark:hover:shadow-[4px_4px_0_0_rgba(255,255,255,1)]" : ""}`}
      >
        <div className="relative z-10 border-b-2 border-neutral-800 dark:border-white">
          <div className="w-full aspect-video overflow-hidden bg-gray-100 dark:bg-gray-900">
            {project.project_images && !imageError ? (
              <img
                src={project.project_images}
                alt={project.title}
                className="w-full h-full object-cover object-top transition-all duration-300"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-space font-bold uppercase tracking-wider text-gray-500 text-sm">
                  No preview
                </span>
              </div>
            )}
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-2">
            {!isPurchased && (
              <button
                onClick={handleWishlistToggle}
                disabled={toggleWishlist.isPending}
                className={`w-9 h-9 flex items-center justify-center border-2 transition-all duration-200 disabled:opacity-50 ${
                  isWishlisted
                    ? "bg-red-500 border-neutral-800 dark:border-white text-white hover:bg-neutral-800 dark:hover:bg-white hover:text-red-500"
                    : "bg-white dark:bg-[#050505] border-neutral-800 dark:border-white text-neutral-800 dark:text-white hover:bg-neutral-800 hover:text-white dark:hover:bg-white dark:hover:text-neutral-800"
                }`}
              >
                {toggleWishlist.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart
                    className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`}
                  />
                )}
              </button>
            )}
            <span className="px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white font-space font-bold uppercase tracking-wider text-sm border-2 border-neutral-800 dark:border-white">
              {project.price === 0 ? "Free" : `$ ${project.price}`}
            </span>
          </div>

          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-red-500 text-white font-space font-bold uppercase tracking-wider text-xs border-2 border-neutral-800 dark:border-white">
              {project.project_type}
            </span>
          </div>
        </div>

        <div className="relative z-10 p-4 lg:p-5 flex flex-col flex-grow bg-white dark:bg-[#050505]">
          <h3 className="font-syne text-xl font-bold text-neutral-800 dark:text-white mb-2 line-clamp-1 uppercase tracking-widest">
            {project.title}
          </h3>

          <p className="font-space text-neutral-800 dark:text-white text-sm leading-relaxed mb-4 line-clamp-3 font-medium">
            {truncateText(project.description, 150)}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {project.tech_stack.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 bg-neutral-800 dark:bg-white text-white dark:text-neutral-800 font-space font-bold uppercase tracking-wider text-[10px] border-2 border-transparent truncate max-w-[100px]"
              >
                {tech}
              </span>
            ))}
            {project.tech_stack.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 text-neutral-800 dark:text-white font-space font-bold uppercase tracking-wider text-[10px] border-2 border-neutral-800 dark:border-white">
                +{project.tech_stack.length - 3}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between pt-4 border-t-2 border-neutral-800 dark:border-white">
            <div className="flex items-center gap-2 min-w-0">
              {project.userid?.profile_image_url ? (
                <img
                  src={project.userid.profile_image_url}
                  alt={project.userid.username}
                  className="w-8 h-8 rounded-none border-2 border-neutral-800 dark:border-white flex-shrink-0 object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                />
              ) : (
                <div className="w-8 h-8 rounded-none border-2 border-neutral-800 dark:border-white bg-white dark:bg-[#050505] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-neutral-800 dark:text-white" />
                </div>
              )}
              <span className="font-space font-bold uppercase tracking-wider text-neutral-800 dark:text-white text-xs truncate">
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
                  className="w-8 h-8 flex items-center justify-center border-2 border-neutral-800 dark:border-white hover:bg-neutral-800 hover:text-white dark:hover:bg-white dark:hover:text-neutral-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <div className="flex items-center justify-center gap-1.5 px-2 h-8 border-2 border-neutral-800 dark:border-white bg-white dark:bg-[#050505]">
                <Star className="w-3.5 h-3.5 text-neutral-800 dark:text-white" />
                <span className="font-space font-bold text-neutral-800 dark:text-white text-xs">
                  {project.avgRating > 0 ? project.avgRating.toFixed(1) : "New"}
                </span>
                {project.totalReviews > 0 && (
                  <span className="font-space font-bold text-red-500 text-[10px]">
                    ({project.totalReviews})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {footerContent && (
          <div
            className="border-t-2 border-neutral-800 dark:border-white"
            onClick={(e) => e.stopPropagation()}
          >
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
}
