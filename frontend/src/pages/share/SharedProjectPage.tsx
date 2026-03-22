import { useParams, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Star,
  MapPin,
  Globe,
  User,
  Copy,
  ArrowRight,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import XIcon from "@/assets/icons/XIcon";
import { usePublicProjectDetailQuery, useAuthValidationQuery } from "@/hooks/apiQueries";
import { isMongoObjectId } from "@/utils/navigation";
import { successToast, errorToast } from "@/components/ui/customToast";

export default function SharedProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const isValidId = isMongoObjectId(projectId);

  const { data: project, isLoading, isError } = usePublicProjectDetailQuery(
    projectId ?? "",
    { enabled: isValidId }
  );

  const { data: authData, isLoading: authLoading } = useAuthValidationQuery();
  const isAuthenticated = !authLoading && !!authData;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      successToast("Link copied to clipboard");
    } catch {
      errorToast("Failed to copy link");
    }
  };

  const handleCTA = () => {
    const marketplaceUrl = `/buyer-marketplace?openProject=${projectId}`;
    if (isAuthenticated) {
      navigate(marketplaceUrl);
    } else {
      navigate(
        `/authentication?next=${encodeURIComponent(marketplaceUrl)}`
      );
    }
  };

  if (!isValidId) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white font-space flex items-center justify-center p-4">
        <div className="border-2 border-black dark:border-white p-12 max-w-lg w-full text-center shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)]">
          <div className="w-16 h-16 bg-red-500 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-syne font-black uppercase tracking-widest text-2xl mb-4">
            Invalid Link
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
            This share link is not valid.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white font-space flex items-center justify-center p-4">
        <div className="border-2 border-black dark:border-white p-12 max-w-lg w-full text-center shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)]">
          <div className="w-16 h-16 bg-black dark:bg-white flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white dark:text-black" />
          </div>
          <h1 className="font-syne font-black uppercase tracking-widest text-2xl mb-4">
            Project Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
            This project is unavailable or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const seller = project.userid;
  const images = project.project_images ?? [];
  const coverImage = images[0];

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white font-space selection:bg-red-500 selection:text-white transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-[2px] bg-red-500" />
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
              Project Preview
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 border-2 border-black dark:border-white text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy Link
          </button>
        </div>

        <div className="border-2 border-black dark:border-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] overflow-hidden">
          {/* Cover image */}
          {coverImage && (
            <div className="w-full aspect-video bg-gray-100 dark:bg-[#0a0a0a] overflow-hidden border-b-2 border-black dark:border-white">
              <img
                src={coverImage}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8 lg:p-12">
            {/* Type badge + title */}
            <div className="flex items-start gap-4 mb-6 flex-wrap">
              <span className="px-3 py-1 border-2 border-black dark:border-white text-xs font-bold uppercase tracking-widest bg-black dark:bg-white text-white dark:text-black flex-shrink-0">
                {project.project_type}
              </span>
              {project.live_link && (
                <a
                  href={project.live_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-red-500 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Live Demo
                </a>
              )}
            </div>

            <h1 className="font-syne font-black uppercase tracking-widest text-3xl lg:text-4xl leading-tight mb-4 break-words hyphens-auto">
              {project.title}
            </h1>

            {/* Rating */}
            {project.totalReviews > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-sm">
                  {project.avgRating.toFixed(1)}
                </span>
                <span className="text-gray-500 text-sm">
                  ({project.totalReviews} review{project.totalReviews !== 1 ? "s" : ""})
                </span>
              </div>
            )}

            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8 text-sm lg:text-base">
              {project.description}
            </p>

            {/* Tech stack */}
            {project.tech_stack.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-3">
                  Tech Stack
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.tech_stack.map((tech) => (
                    <span
                      key={tech}
                      className="px-3 py-1 border-2 border-black dark:border-white text-xs font-bold uppercase tracking-widest"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t-2 border-black dark:border-white pt-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              {/* Seller info */}
              {seller && (
                <div className="flex items-center gap-4">
                  {seller.profile_image_url ? (
                    <img
                      src={seller.profile_image_url}
                      alt={seller.name}
                      className="w-12 h-12 rounded-none border-2 border-black dark:border-white object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 border-2 border-black dark:border-white flex items-center justify-center bg-gray-100 dark:bg-[#0a0a0a]">
                      <User className="w-6 h-6 text-black dark:text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm uppercase tracking-widest">
                      {seller.name || seller.username}
                    </p>
                    <p className="text-gray-500 text-xs">@{seller.username}</p>
                    {seller.profile_visibility !== false && (
                      <div className="flex items-center gap-3 mt-1">
                        {seller.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {seller.location}
                          </span>
                        )}
                        {seller.website_url && (
                          <a
                            href={seller.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <Globe className="w-3 h-3" />
                            Website
                          </a>
                        )}
                        {seller.x_username && (
                          <a
                            href={`https://x.com/${seller.x_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <XIcon className="w-3 h-3" />
                            @{seller.x_username}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Price + CTA */}
              <div className="flex flex-col items-start lg:items-end gap-4 w-full lg:w-auto">
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">
                    Price
                  </p>
                  <p className="font-syne font-black text-3xl uppercase tracking-tighter">
                    {project.price === 0 ? "FREE" : `$${project.price}`}
                  </p>
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                  {authLoading ? (
                    <div className="flex-1 lg:w-56 px-6 py-4 border-2 border-black dark:border-white flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : (
                    <button
                      onClick={handleCTA}
                      className="flex-1 lg:w-56 group relative px-6 py-4 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest text-xs overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-red-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                      <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-white transition-colors duration-300">
                        {isAuthenticated
                          ? "Open in Marketplace"
                          : "Sign in to Open"}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  )}
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-4 border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    title="Copy link"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 uppercase tracking-widest mt-8">
          Powered by DevsDistro
        </p>
      </div>
    </div>
  );
}
