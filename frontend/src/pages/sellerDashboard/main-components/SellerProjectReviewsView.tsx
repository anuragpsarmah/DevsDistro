import { useState } from "react";
import {
  Star,
  ArrowLeft,
  MessageSquare,
  Loader2,
  User,
  ChevronDown,
} from "lucide-react";
import { useGetProjectReviewsQuery } from "@/hooks/apiQueries";
import type { ProjectReview } from "@/utils/types";

interface SellerProjectReviewsViewProps {
  projectId: string;
  projectTitle: string;
  onBack: () => void;
}

const LIMIT = 10;

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function ReviewCard({ review }: { review: ProjectReview }) {
  const author = typeof review.userId === "string" ? null : review.userId;
  return (
    <div className="border-2 border-neutral-800 dark:border-white bg-white dark:bg-[#050505] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {author?.profile_image_url ? (
            <img
              src={author.profile_image_url}
              alt={author.username}
              className="w-9 h-9 border-2 border-neutral-800 dark:border-white object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 border-2 border-neutral-800 dark:border-white bg-gray-100 dark:bg-[#111] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-syne font-black uppercase tracking-widest text-neutral-800 dark:text-white text-xs leading-none truncate">
              {author?.name || author?.username || "Unknown User"}
            </p>
            {author?.username && (
              <p className="font-space text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5">
                @{author.username}
              </p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center gap-0.5 justify-end mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3 h-3 ${
                  s <= review.rating
                    ? "text-red-500 fill-red-500"
                    : "text-gray-300 dark:text-gray-700"
                }`}
              />
            ))}
          </div>
          <p className="font-space text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {relativeDate(review.createdAt)}
          </p>
        </div>
      </div>
      {review.review && (
        <p className="font-space text-sm text-neutral-800 dark:text-white leading-relaxed mt-3">
          {review.review}
        </p>
      )}
    </div>
  );
}

export default function SellerProjectReviewsView({
  projectId,
  projectTitle,
  onBack,
}: SellerProjectReviewsViewProps) {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching } = useGetProjectReviewsQuery(
    projectId,
    offset,
    LIMIT
  );

  const reviews = data?.reviews ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 font-space font-bold uppercase tracking-widest text-[10px] text-gray-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Projects
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-[2px] bg-red-500" />
          <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
            Reviews
          </span>
          {pagination && pagination.total > 0 && (
            <span className="font-space text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              ({pagination.total})
            </span>
          )}
        </div>
        <h2 className="font-syne uppercase tracking-widest text-2xl lg:text-3xl font-black text-neutral-800 dark:text-white leading-none">
          {projectTitle}
        </h2>
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-neutral-800/20 dark:border-white/20">
          <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-4" />
          <p className="font-space font-bold uppercase tracking-widest text-xs text-gray-400 dark:text-gray-600">
            No reviews yet
          </p>
        </div>
      ) : (
        <div className="space-y-4 relative">
          {isFetching && (
            <div className="absolute inset-0 bg-white/60 dark:bg-neutral-800/60 flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            </div>
          )}
          {reviews.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}

          {pagination?.hasNextPage && (
            <button
              onClick={() => setOffset((prev) => prev + LIMIT)}
              disabled={isFetching}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-neutral-800/20 dark:border-white/20 hover:border-neutral-800 dark:hover:border-white font-space font-bold uppercase tracking-widest text-xs text-gray-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-white transition-all disabled:opacity-50"
            >
              <ChevronDown className="w-4 h-4" />
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}
