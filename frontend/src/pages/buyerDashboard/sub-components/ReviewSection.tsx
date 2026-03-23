import { useState } from "react";
import {
  Star,
  Trash2,
  Pencil,
  ChevronDown,
  Loader2,
  User,
  MessageSquare,
} from "lucide-react";
import {
  useGetProjectReviewsQuery,
  useGetMyProjectReviewQuery,
} from "@/hooks/apiQueries";
import {
  useSubmitReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
} from "@/hooks/apiMutations";
import { successToast, errorToast } from "@/components/ui/customToast";
import type { ProjectReview } from "@/utils/types";

interface ReviewSectionProps {
  projectId: string;
  canWriteReview: boolean;
  canFetchOwnReview: boolean;
  logout?: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ── StarSelector ─────────────────────────────────────────────────────────────

function StarSelector({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-110"
          aria-label={`Rate ${star} out of 5`}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= (hovered || value)
                ? "text-red-500 fill-red-500"
                : "text-gray-300 dark:text-gray-700"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="font-space font-bold text-xs text-gray-500 dark:text-gray-400 ml-2 uppercase tracking-widest">
          {["", "Poor", "Fair", "Good", "Great", "Excellent"][value]}
        </span>
      )}
    </div>
  );
}

// ── ReviewCard ───────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  isOwn = false,
}: {
  review: ProjectReview;
  isOwn?: boolean;
}) {
  const author = typeof review.userId === "string" ? null : review.userId;
  return (
    <div
      className={`border-2 p-5 ${
        isOwn
          ? "border-red-500 bg-red-50/50 dark:bg-red-950/10"
          : "border-black dark:border-white bg-white dark:bg-[#050505]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {author?.profile_image_url ? (
            <img
              src={author.profile_image_url}
              alt={author.username}
              className="w-9 h-9 border-2 border-black dark:border-white object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 border-2 border-black dark:border-white bg-gray-100 dark:bg-[#111] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-syne font-black uppercase tracking-widest text-black dark:text-white text-xs leading-none truncate">
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
        <p className="font-space text-sm text-black dark:text-white leading-relaxed mt-3">
          {review.review}
        </p>
      )}
      {isOwn && (
        <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-900/40">
          <span className="font-space text-[10px] font-bold text-red-500 uppercase tracking-widest">
            Your Review
          </span>
        </div>
      )}
    </div>
  );
}

// ── ReviewSection ─────────────────────────────────────────────────────────────

export default function ReviewSection({
  projectId,
  canWriteReview,
  canFetchOwnReview,
  logout,
}: ReviewSectionProps) {
  const LIMIT = 10;
  const [offset, setOffset] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [ratingInput, setRatingInput] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: myReview, isLoading: isMyReviewLoading } =
    useGetMyProjectReviewQuery(projectId, canFetchOwnReview, { logout });

  const {
    data: reviewsData,
    isLoading: isListLoading,
    isFetching: isListFetching,
  } = useGetProjectReviewsQuery(projectId, offset, LIMIT);

  const submitMutation = useSubmitReviewMutation({ logout });
  const updateMutation = useUpdateReviewMutation({ logout });
  const deleteMutation = useDeleteReviewMutation({ logout });

  const handleStartEdit = () => {
    setRatingInput(myReview?.rating ?? 0);
    setReviewText(myReview?.review ?? "");
    setConfirmDelete(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setRatingInput(0);
    setReviewText("");
  };

  const handleSubmit = () => {
    if (ratingInput === 0) {
      errorToast("Please select a rating before submitting");
      return;
    }
    const mutation = myReview ? updateMutation : submitMutation;
    mutation.mutate(
      {
        project_id: projectId,
        rating: ratingInput,
        review: reviewText.trim() || undefined,
      },
      {
        onSuccess: () => {
          successToast(myReview ? "Review updated" : "Review submitted");
          setIsEditing(false);
          setRatingInput(0);
          setReviewText("");
          setOffset(0);
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(projectId, {
      onSuccess: () => {
        successToast("Review deleted");
        setConfirmDelete(false);
        setOffset(0);
      },
    });
  };

  const reviews = reviewsData?.reviews ?? [];
  const pagination = reviewsData?.pagination;
  const isLoading = isListLoading || (canFetchOwnReview && isMyReviewLoading);
  const isSavingReview = submitMutation.isPending || updateMutation.isPending;
  const canEditOwnReview = canWriteReview;
  const canDeleteOwnReview = !!myReview;

  const getAuthorId = (
    review: ProjectReview | null | undefined
  ): string | undefined => {
    if (!review) return undefined;
    if (typeof review.userId === "string") return review.userId;
    return review.userId?._id;
  };

  // Filter own review out of the public list to avoid double-rendering
  const myAuthorId = getAuthorId(myReview);
  const otherReviews = myAuthorId
    ? reviews.filter((r) => getAuthorId(r) !== myAuthorId)
    : reviews;

  return (
    <div className="border-2 border-black dark:border-white bg-white dark:bg-[#050505] p-8 lg:p-12 mb-12 shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)]">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8">
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

      {/* ── Buyer review controls ── */}
      {(canWriteReview || myReview) && (
        <div className="mb-8">
          {/* No review yet + not editing: show "Leave a Review" trigger */}
          {!isEditing && !myReview && !isMyReviewLoading && canWriteReview && (
            <button
              onClick={handleStartEdit}
              className="w-full flex items-center justify-center gap-3 py-5 border-2 border-dashed border-black/30 dark:border-white/30 hover:border-black dark:hover:border-white font-space font-bold uppercase tracking-widest text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-all"
            >
              <Star className="w-4 h-4" />
              Leave a Review
            </button>
          )}

          {/* Existing review: show card + Edit / Delete controls */}
          {!isEditing && myReview && (
            <div className="mb-6">
              <ReviewCard review={myReview} isOwn />
              <div className="flex gap-3 mt-3">
                {canEditOwnReview && (
                  <button
                    onClick={handleStartEdit}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-black dark:border-white font-space font-bold uppercase tracking-widest text-[10px] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
                {canDeleteOwnReview && confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 bg-red-500 text-white font-space font-bold uppercase tracking-widest text-[10px] hover:bg-red-600 hover:border-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleteMutation.isPending}
                      className="px-4 py-2 border-2 border-black/30 dark:border-white/30 text-black/50 dark:text-white/50 font-space font-bold uppercase tracking-widest text-[10px] hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : canDeleteOwnReview ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-500 font-space font-bold uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {/* Edit form */}
          {isEditing && canEditOwnReview && (
            <div className="border-2 border-black dark:border-white p-6 mb-6 bg-gray-50 dark:bg-[#0a0a0a]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-[2px] bg-red-500" />
                <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
                  {myReview ? "Edit Review" : "Write a Review"}
                </span>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="font-space font-bold uppercase tracking-widest text-xs text-black dark:text-white mb-3 block">
                    Rating <span className="text-red-500">*</span>
                  </label>
                  <StarSelector
                    value={ratingInput}
                    onChange={setRatingInput}
                    disabled={isSavingReview}
                  />
                </div>
                <div>
                  <label className="font-space font-bold uppercase tracking-widest text-xs text-black dark:text-white mb-2 block">
                    Review{" "}
                    <span className="text-gray-400 dark:text-gray-600 font-normal normal-case tracking-normal">
                      (Optional)
                    </span>
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    disabled={isSavingReview}
                    placeholder="Share your experience with this project..."
                    className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#050505] text-black dark:text-white font-space text-sm p-4 resize-none focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                  <p
                    className={`font-space text-[10px] uppercase tracking-widest mt-1 text-right ${
                      reviewText.length > 1950
                        ? "text-red-500"
                        : reviewText.length > 1800
                          ? "text-yellow-500"
                          : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {reviewText.length}/2000
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={isSavingReview || ratingInput === 0}
                    className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white font-space font-bold uppercase tracking-widest text-xs hover:bg-red-500 hover:border-red-500 dark:hover:bg-red-500 dark:hover:border-red-500 hover:text-white dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingReview && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    {myReview ? "Update Review" : "Submit Review"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSavingReview}
                    className="px-6 py-3 border-2 border-black/30 dark:border-white/30 text-black/50 dark:text-white/50 font-space font-bold uppercase tracking-widest text-xs hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Reviews List ── */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      )}

      {!isLoading && reviews.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-black/20 dark:border-white/20">
          <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-700 mb-4" />
          <p className="font-space font-bold uppercase tracking-widest text-xs text-gray-400 dark:text-gray-600">
            No reviews yet
          </p>
          {!canWriteReview && (
            <p className="font-space text-[10px] text-gray-400 dark:text-gray-600 mt-1">
              Purchase this project to leave the first review
            </p>
          )}
        </div>
      )}

      {!isLoading && reviews.length > 0 && (
        <div className="space-y-4 relative">
          {isListFetching && (
            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center z-10 rounded-sm">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            </div>
          )}
          {otherReviews.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </div>
      )}

      {/* Load More */}
      {pagination?.hasNextPage && (
        <button
          onClick={() => setOffset((prev) => prev + LIMIT)}
          disabled={isListFetching}
          className="mt-6 w-full flex items-center justify-center gap-2 py-4 border-2 border-black dark:border-white font-space font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-4 h-4" />
          Load More Reviews
        </button>
      )}
    </div>
  );
}
