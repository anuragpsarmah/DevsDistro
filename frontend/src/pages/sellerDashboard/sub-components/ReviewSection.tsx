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
  <div className="space-y-6">
    <div>
      <Label htmlFor="review" className="text-gray-300 mb-2 block">
        DevExchange Review
      </Label>
      <Textarea
        id="review"
        placeholder="Write your review here..."
        value={review}
        onChange={onReviewChange}
        className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-colors duration-200 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-indigo-500/50 h-32 resize-none"
      />
      <p
        className={`text-sm mt-1 ${MAX_REVIEW_LENGTH - review.length <= 10 ? "text-red-400" : "text-gray-400"}`}
      >
        {review.length}/{MAX_REVIEW_LENGTH} characters
      </p>
    </div>
    <div>
      <Label className="text-gray-300 mb-2 block">DevExchange Rating</Label>
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-8 h-8 cursor-pointer transition-colors duration-200 ${
              star <= rating
                ? "text-yellow-500 fill-yellow-200"
                : "text-gray-600 hover:text-gray-400"
            }`}
            strokeWidth={1.5}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    </div>
    <p className="text-sm text-gray-400 mt-1">
      <i>Your review may be featured on our landing page!</i>
    </p>
  </div>
);
