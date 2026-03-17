import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { MAX_REVIEW_LENGTH } from "../utils/constants";
import { ReviewSectionProps } from "../utils/types";

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  review,
  rating,
  onReviewChange,
  onRatingChange,
}) => (
  <div className="space-y-8 p-6 lg:p-10 border-2 border-black/10 dark:border-white/10">
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-[2px] bg-red-500"></div>
        <span className="font-space font-bold uppercase tracking-[0.2em] text-xs text-red-500">
          DevDistro Review
        </span>
      </div>
      <Textarea
        id="review"
        placeholder="WRITE YOUR REVIEW HERE..."
        value={review}
        onChange={onReviewChange}
        className="bg-transparent border-2 border-black/20 dark:border-white/20 text-black dark:text-white hover:border-black dark:hover:border-white focus:border-red-500 focus:ring-0 rounded-none transition-colors duration-300 p-4 font-space h-40 resize-none placeholder:text-black/30 placeholder:dark:text-white/30"
      />
      <div className="flex justify-between items-center mt-3">
        <p className="font-space font-bold text-[10px] uppercase tracking-widest text-gray-500">
          YOUR REVIEW MAY BE FEATURED ON OUR LANDING PAGE.
        </p>
        <p
          className={`font-space font-bold text-[10px] uppercase tracking-widest ${MAX_REVIEW_LENGTH - review.length <= 10 ? "text-red-500" : "text-gray-500"}`}
        >
          {review.length}/{MAX_REVIEW_LENGTH}
        </p>
      </div>
    </div>
    <div className="border-t-2 border-black/10 dark:border-white/10 pt-8 mt-2">
      <Label className="font-space font-bold uppercase tracking-[0.2em] text-[10px] md:text-xs text-black/50 dark:text-white/50 mb-4 block">
        DevDistro Rating
      </Label>
      <div className="flex items-center space-x-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-10 h-10 cursor-pointer transition-colors duration-300 ${star <= rating
                ? "text-red-500 fill-red-500"
                : "text-black/20 dark:text-white/20 hover:text-black/40 hover:dark:text-white/40"
              }`}
            strokeWidth={1.5}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    </div>
  </div>
);
