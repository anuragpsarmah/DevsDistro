import { useState, useCallback, useRef } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Star,
  Heart,
  MapPin,
  Globe,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Download,
  CheckCircle,
  FileText,
  AlertTriangle,
  Image,
  Video,
  Share2,
} from "lucide-react";
import XIcon from "@/assets/icons/XIcon";
import {
  useProjectDetailQuery,
  useGetWishlistQuery,
  useGetPurchasedProjectsQuery,
} from "@/hooks/apiQueries";
import {
  useToggleWishlistMutation,
  useDownloadProjectMutation,
  useDownloadReceiptMutation,
} from "@/hooks/apiMutations";
import FileTree from "./FileTree";
import PurchaseModal from "./PurchaseModal";
import ReviewSection from "./ReviewSection";
import { successToast, errorToast } from "@/components/ui/customToast";
import { usePurchaseFlow } from "../hooks/usePurchaseFlow";
import { ProjectDetailPageProps } from "../utils/types";

export default function ProjectDetailPage({
  projectId,
  onBack,
  logout,
  backLabel = "Back to Marketplace",
}: ProjectDetailPageProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [mediaTab, setMediaTab] = useState<"images" | "video">("images");
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    data: project,
    isLoading,
    isError,
  } = useProjectDetailQuery(projectId, { logout });
  const { data: wishlist } = useGetWishlistQuery({ logout });
  const { data: purchases } = useGetPurchasedProjectsQuery({ logout });
  const toggleWishlist = useToggleWishlistMutation({ logout });
  const downloadMutation = useDownloadProjectMutation({ logout });
  const receiptMutation = useDownloadReceiptMutation({ logout });

  const isPurchased =
    purchases?.some((p) => p.projectId?._id === projectId) ?? false;
  const isFreeProject = !!project && project.price <= 0;
  const canWriteReview = isPurchased || isFreeProject;
  const canFetchOwnReview = true;
  const purchaseRecord = purchases?.find((p) => p.projectId?._id === projectId);
  const isWishlisted = wishlist?.some((p) => p._id === projectId) ?? false;

  const handlePurchaseSuccess = useCallback(() => {
    setIsPurchaseModalOpen(false);
  }, []);

  const purchaseFlow = usePurchaseFlow({
    logout,
    onSuccess: handlePurchaseSuccess,
  });

  const handleOpenPurchaseModal = useCallback(() => {
    setIsPurchaseModalOpen(true);
    purchaseFlow.initiate(projectId);
  }, [projectId, purchaseFlow]);

  const handleClosePurchaseModal = useCallback(() => {
    setIsPurchaseModalOpen(false);
    purchaseFlow.reset();
  }, [purchaseFlow]);

  const handleRefreshQuote = useCallback(() => {
    purchaseFlow.refreshQuote(projectId);
  }, [projectId, purchaseFlow]);

  const images = project?.project_images ?? [];
  const detailImages =
    project?.project_images_detail && project.project_images_detail.length > 0
      ? project.project_images_detail
      : images;
  const hasMultipleImages = images.length > 1;

  const handlePrevImage = () =>
    setImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const handleNextImage = () =>
    setImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6 mt-6 max-w-7xl mx-auto">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 font-space font-bold uppercase tracking-widest text-xs text-black dark:text-white hover:text-red-500 dark:hover:text-red-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {backLabel}
        </button>
        <div className="flex flex-col items-center justify-center py-32 space-y-6 border-2 border-black dark:border-white p-8 bg-white dark:bg-[#050505] shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)]">
          <AlertCircle className="w-16 h-16 text-red-500" />
          <p className="font-syne font-black uppercase tracking-widest text-black dark:text-white text-3xl text-center leading-none">
            {isError
              ? "System Error: Project Unavailable"
              : "System Error: Project Not Found"}
          </p>
          <p className="font-space font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider text-center max-w-lg">
            {isError
              ? "We could not refresh this project right now. Please try again in a moment or return to the marketplace."
              : "This project may have been removed, restricted, or simply does not exist. Return to the marketplace to browse available listings."}
          </p>
        </div>
      </div>
    );
  }

  const seller = project.userid;
  const sellerIsPrivate = seller?.profile_visibility === false;
  const listedDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const downloadCount = project.downloadCount ?? 0;
  const downloadLabel = `${downloadCount} download${downloadCount === 1 ? "" : "s"}`;

  const handleShareProject = async () => {
    const shareUrl = `${window.location.origin}/p/${project.slug ?? projectId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      successToast("Share link copied to clipboard");
    } catch {
      errorToast("Failed to copy share link");
    }
  };

  return (
    <div className="mt-6 lg:mt-0 pb-32 max-w-7xl mx-auto selection:bg-red-500 selection:text-white">
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 font-space font-bold uppercase tracking-widest text-xs text-black dark:text-white hover:text-red-500 dark:hover:text-red-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {backLabel}
        </button>
        <button
          onClick={handleShareProject}
          className="flex items-center gap-2 px-4 py-2 border-2 border-black dark:border-white font-space font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
        >
          <Share2 className="w-3 h-3" />
          Share
        </button>
      </div>

      <div className="mb-12 space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="px-4 py-2 bg-red-500 text-white font-space font-bold uppercase tracking-widest text-[10px] border-2 border-red-500">
            {project.project_type}
          </span>
          {project.live_link && (
            <a
              href={project.live_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-space font-bold uppercase tracking-widest text-[10px] text-black dark:text-white border-black dark:border-white border-2 px-4 py-2 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Live Demo
            </a>
          )}
        </div>

        <h1 className="font-syne uppercase tracking-widest text-5xl lg:text-7xl font-black text-black dark:text-white leading-none break-words hyphens-auto">
          {project.title}
        </h1>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(project.avgRating)
                    ? "text-red-500 fill-red-500"
                    : "text-gray-300 dark:text-gray-700"
                }`}
              />
            ))}
            <span className="font-space font-bold text-black dark:text-white text-sm ml-2">
              {project.avgRating > 0 ? project.avgRating.toFixed(1) : "NEW"}
            </span>
            {project.totalReviews > 0 && (
              <span className="font-space text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest ml-1">
                ({project.totalReviews} REVIEWS)
              </span>
            )}
          </div>
          <span className="text-gray-300 dark:text-gray-700 font-bold">/</span>
          <span className="font-space text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            LISTED {listedDate.toUpperCase()}
          </span>
          {downloadCount > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-700 font-bold">
                /
              </span>
              <span className="font-space text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {downloadLabel.toUpperCase()}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="border-2 border-black dark:border-white bg-white dark:bg-[#050505] shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] mb-16">
        {project.project_video && (
          <div className="flex border-b-2 border-black dark:border-white">
            <button
              onClick={() => setMediaTab("images")}
              className={`flex items-center gap-2 px-6 py-3 font-space font-bold uppercase tracking-[0.2em] text-[10px] border-r-2 border-black dark:border-white transition-colors ${
                mediaTab === "images"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "bg-white dark:bg-[#050505] text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#111]"
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              Images
            </button>
            <button
              onClick={() => {
                setMediaTab("video");
                videoRef.current?.pause();
              }}
              className={`flex items-center gap-2 px-6 py-3 font-space font-bold uppercase tracking-[0.2em] text-[10px] transition-colors ${
                mediaTab === "video"
                  ? "bg-black dark:bg-white text-white dark:text-black"
                  : "bg-white dark:bg-[#050505] text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#111]"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Video
            </button>
          </div>
        )}

        <div className="p-2">
          <div className="w-full aspect-[21/9] bg-gray-100 dark:bg-[#111] overflow-hidden relative">
            {mediaTab === "video" && project.project_video ? (
              <video
                ref={videoRef}
                src={project.project_video}
                controls
                className="w-full h-full object-contain bg-black"
              />
            ) : images.length > 0 ? (
              <img
                src={detailImages[imageIndex]}
                alt={`${project.title} preview ${imageIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 tracking-widest">
                <span className="font-space font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 text-sm">
                  NO PREVIEW AVAILABLE [NULL]
                </span>
              </div>
            )}

            {mediaTab === "images" && hasMultipleImages && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white flex items-center justify-center hover:bg-red-500 hover:border-red-500 hover:text-white text-black dark:text-white transition-colors"
                  aria-label="Previous Image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-black border-2 border-black dark:border-white flex items-center justify-center hover:bg-red-500 hover:border-red-500 hover:text-white text-black dark:text-white transition-colors"
                  aria-label="Next Image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-black/90 border-2 border-black dark:border-white">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImageIndex(i)}
                      className={`h-2 transition-all duration-200 ${
                        i === imageIndex
                          ? "w-8 bg-red-500"
                          : "w-2 bg-black/20 dark:bg-white/20 hover:bg-black/50 dark:hover:bg-white/50"
                      }`}
                      aria-label={`Go to image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-12 mb-16">
        <div className="xl:col-span-3 relative">
          <div className="xl:absolute xl:inset-0 border-2 border-black dark:border-white bg-white dark:bg-[#050505] shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] flex flex-col overflow-hidden">
            <div className="p-8 lg:p-12 flex-[65] flex flex-col min-h-0">
              <div className="flex items-center gap-3 mb-8 flex-shrink-0">
                <div className="w-12 h-[2px] bg-red-500"></div>
                <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                  System Overview
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-black/20 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                <p className="font-space text-black dark:text-white text-lg lg:text-xl leading-relaxed font-medium whitespace-pre-wrap pr-2">
                  {project.description}
                </p>
              </div>
            </div>

            <div className="border-t-2 border-black dark:border-white flex-shrink-0" />

            <div className="p-8 lg:p-12 flex-[35] flex flex-col min-h-0">
              <div className="flex items-center gap-3 mb-8 flex-shrink-0">
                <div className="w-12 h-[2px] bg-red-500"></div>
                <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                  Tech Stack
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-black/20 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                <div className="flex flex-wrap gap-3 pr-2">
                  {project.tech_stack.map((tech) => (
                    <span
                      key={tech}
                      className="px-4 py-2 border-2 border-black dark:border-white bg-transparent text-black dark:text-white font-space font-bold uppercase tracking-widest text-[10px] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-default"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 h-full flex flex-col">
          <div className="h-full flex flex-col border-2 border-black dark:border-white bg-white dark:bg-[#050505] shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)]">
            <div className="p-8 lg:p-10 flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-black/20 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-[2px] bg-red-500"></div>
                <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                  Seller Identity
                </span>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  {seller?.profile_image_url ? (
                    <img
                      src={seller.profile_image_url}
                      alt={seller.username}
                      className="w-16 self-stretch border-2 border-black dark:border-white object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 self-stretch border-2 border-black dark:border-white bg-gray-100 dark:bg-[#111] flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pt-1 space-y-2.5">
                    <p className="font-syne font-black uppercase tracking-widest text-black dark:text-white text-xl leading-none truncate">
                      {seller?.username
                        ? seller.username.startsWith("@")
                          ? seller.username
                          : `@${seller.username}`
                        : "@UNKNOWN_USER"}
                    </p>
                    {seller?.name && (
                      <p className="font-space text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] truncate">
                        {seller.name}
                      </p>
                    )}
                    {seller?.job_role && (
                      <p className="font-space text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] truncate">
                        {seller.job_role}
                      </p>
                    )}
                  </div>
                </div>

                {sellerIsPrivate ? (
                  <div className="flex flex-col gap-3 mt-2 border-t-2 border-black/10 dark:border-white/10 pt-6">
                    <div className="h-3 w-full bg-black/[0.08] dark:bg-white/[0.08] mb-1" />
                    <div className="h-3 w-2/3 bg-black/[0.08] dark:bg-white/[0.08] mb-3" />
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-black/20 dark:text-white/20 flex-shrink-0" />
                      <div className="h-2.5 w-24 bg-black/10 dark:bg-white/10" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-black/20 dark:text-white/20 flex-shrink-0" />
                      <div className="h-2.5 w-32 bg-black/10 dark:bg-white/10" />
                    </div>
                    <div className="flex items-center gap-3">
                      <XIcon className="w-3.5 h-3.5 text-black/20 dark:text-white/20 flex-shrink-0" />
                      <div className="h-2.5 w-20 bg-black/10 dark:bg-white/10" />
                    </div>
                    <p className="font-space text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-[0.2em] mt-2">
                      Profile details hidden by seller
                    </p>
                  </div>
                ) : (
                  <>
                    {seller?.short_bio && (
                      <p className="font-space text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-black/10 dark:border-white/10 pl-4 py-1">
                        {seller.short_bio}
                      </p>
                    )}

                    {(seller?.location ||
                      seller?.website_url ||
                      seller?.x_username) && (
                      <div className="flex flex-col gap-3 mt-2 border-t-2 border-black/10 dark:border-white/10 pt-6">
                        {seller?.location && (
                          <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="font-space font-bold text-xs text-black dark:text-white uppercase tracking-widest">
                              {seller.location.toUpperCase()}
                            </span>
                          </div>
                        )}
                        {seller?.website_url && (
                          <a
                            href={seller.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group"
                          >
                            <Globe className="w-4 h-4 text-red-500 flex-shrink-0 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className="font-space font-bold text-xs text-black dark:text-white uppercase tracking-widest group-hover:text-red-500 transition-colors truncate">
                              {seller.website_url
                                .replace(/^https?:\/\//, "")
                                .toUpperCase()}
                            </span>
                          </a>
                        )}
                        {seller?.x_username && (
                          <a
                            href={`https://x.com/${seller.x_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group"
                          >
                            <div className="w-4 h-4 flex items-center justify-center group-hover:text-red-500 transition-colors">
                              <XIcon className="w-3.5 h-3.5 text-current flex-shrink-0" />
                            </div>
                            <span className="font-space font-bold text-xs text-black dark:text-white uppercase tracking-widest group-hover:text-red-500 transition-colors">
                              @{seller.x_username.toUpperCase()}
                            </span>
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="border-t-2 border-black dark:border-white" />

            <div className="p-8 lg:p-10 bg-gray-50 dark:bg-[#0a0a0a] flex-shrink-0">
              <div className="flex items-end justify-between mb-8">
                <span className="font-space font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mb-1">
                  System Cost
                </span>
                <span className="font-syne font-black text-black dark:text-white text-4xl lg:text-5xl uppercase tracking-wide leading-none">
                  {project.price === 0 ? "FREE" : `$ ${project.price}`}
                </span>
              </div>

              {isPurchased && purchaseRecord && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-green-50 dark:bg-green-950/20 border-2 border-green-500">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-space text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">
                    Purchased{" "}
                    {new Date(purchaseRecord.createdAt).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </span>
                </div>
              )}

              <div className="space-y-4">
                {isPurchased && project.scheduled_deletion_at && (
                  <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-space text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-snug">
                        Scheduled for deletion
                      </p>
                      <p className="font-space text-xs text-amber-700 dark:text-amber-300 mt-1">
                        This project will be permanently deleted on{" "}
                        <span className="font-bold">
                          {new Date(
                            project.scheduled_deletion_at
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        . Download your copy before then.
                      </p>
                    </div>
                  </div>
                )}

                {isPurchased ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => downloadMutation.mutate(projectId)}
                      disabled={downloadMutation.isPending}
                      className="flex-1 relative group px-6 py-5 border-2 border-green-500 bg-green-500 text-white font-space font-bold uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:bg-green-600 hover:border-green-600 transition-colors"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {downloadMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download
                      </span>
                    </button>
                    {purchaseRecord && (
                      <button
                        onClick={() =>
                          receiptMutation.mutate(purchaseRecord._id)
                        }
                        disabled={receiptMutation.isPending}
                        className="flex-1 relative group px-6 py-5 border-2 border-black dark:border-white bg-white dark:bg-[#050505] text-black dark:text-white font-space font-bold uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {receiptMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          Receipt
                        </span>
                      </button>
                    )}
                  </div>
                ) : project.price === 0 ? (
                  <button
                    onClick={() => downloadMutation.mutate(projectId)}
                    disabled={downloadMutation.isPending}
                    className="w-full relative group px-8 py-5 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-space font-bold uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-red-500 transform translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0 group-disabled:hidden" />
                    <span className="relative z-10 flex items-center justify-center gap-3 group-hover:text-white group-disabled:text-current">
                      {downloadMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download Free
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleOpenPurchaseModal}
                    className="w-full relative group px-8 py-5 border-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-space font-bold uppercase tracking-widest text-sm overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-red-500 transform translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
                    <span className="relative z-10 flex items-center justify-center gap-3 group-hover:text-white">
                      <ShoppingBag className="w-4 h-4" />
                      Execute Purchase
                    </span>
                  </button>
                )}

                {!isPurchased && (
                  <button
                    onClick={() => toggleWishlist.mutate(projectId)}
                    disabled={toggleWishlist.isPending}
                    className={`w-full relative group px-8 py-5 border-2 pb-5 font-space font-bold uppercase tracking-widest text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${
                      isWishlisted
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white dark:bg-[#050505] text-black dark:text-white border-black dark:border-white hover:border-red-500"
                    }`}
                  >
                    <div
                      className={`absolute inset-0 bg-red-500 transform translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0 ${isWishlisted ? "hidden" : "block"}`}
                    />
                    <span
                      className={`relative z-10 flex items-center justify-center gap-3 ${!isWishlisted ? "group-hover:text-white" : ""}`}
                    >
                      {toggleWishlist.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            isWishlisted
                              ? "fill-white"
                              : "group-hover:fill-white"
                          }`}
                        />
                      )}
                      {isWishlisted ? "Saved to Wishlist" : "Add to Wishlist"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-2 border-black dark:border-white mb-12 shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] overflow-hidden">
        {/* Terminal title bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-black dark:bg-white border-b-2 border-black dark:border-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500" />
              <div className="w-3 h-3 bg-yellow-400" />
              <div className="w-3 h-3 bg-green-500" />
            </div>
            <div className="w-px h-4 bg-white/20 dark:bg-black/20" />
            <span className="font-space font-bold uppercase tracking-[0.2em] text-[10px] text-white dark:text-black">
              ~/project/file-tree
            </span>
          </div>
          <span className="font-space font-bold uppercase tracking-[0.2em] text-[10px] text-white dark:text-black">
            Architecture
          </span>
        </div>

        {/* Tree content */}
        <div className="bg-[#fafafa] dark:bg-[#0a0a0a] px-6 py-4">
          {project.repo_tree_status === "PROCESSING" && (
            <div className="flex items-center gap-4 py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              <p className="font-mono text-xs text-black dark:text-white uppercase tracking-widest">
                ARCHITECTING FILE TREE...
              </p>
            </div>
          )}
          {project.repo_tree_status === "FAILED" && (
            <div className="flex items-center gap-4 py-8 justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="font-mono text-xs text-black dark:text-white uppercase tracking-widest">
                SYSTEM FAILURE: UNABLE TO GENERATE TREE
              </p>
            </div>
          )}
          {!project.repo_tree_status && (
            <div className="flex py-8 justify-center">
              <p className="font-mono text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                [ ARCHITECTURE DATA UNAVAILABLE ]
              </p>
            </div>
          )}
          {project.repo_tree_status === "SUCCESS" && project.repo_tree && (
            <FileTree node={project.repo_tree} />
          )}
        </div>
      </div>

      <ReviewSection
        projectId={projectId}
        canWriteReview={canWriteReview}
        canFetchOwnReview={canFetchOwnReview}
        logout={logout}
      />

      {/* Purchase Modal */}
      {isPurchaseModalOpen && (
        <PurchaseModal
          projectTitle={project.title}
          flowState={purchaseFlow.flowState}
          intent={purchaseFlow.intent}
          countdown={purchaseFlow.countdown}
          error={purchaseFlow.error}
          isWalletConnected={purchaseFlow.isWalletConnected}
          walletPublicKey={purchaseFlow.walletPublicKey}
          failedAfterOnChain={purchaseFlow.failedAfterOnChain}
          onConfirm={purchaseFlow.executePurchase}
          onRefreshQuote={handleRefreshQuote}
          onRetryConfirm={purchaseFlow.retryConfirm}
          onClose={handleClosePurchaseModal}
        />
      )}
    </div>
  );
}
