import { useFeaturedReviewQuery } from "@/hooks/apiQueries";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { featuredReviewType } from "../utils/types";
import { useEffect } from "react";

export default function ReviewSection() {
  const {
    data: featuredReviews,
    isLoading,
    isError,
  } = useFeaturedReviewQuery();

  useEffect(() => {
    if (!isLoading && !isError) {
      console.log(featuredReviews.data);
    }
  }, [isLoading, isError, featuredReviews]);

  return (
    <section id="reviews" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <h2 className="text-4xl font-bold mb-16 text-center">
          What Our Users Say
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-48 bg-gray-700 rounded-xl" />
            ))}
          </div>
        ) : isError || featuredReviews?.data.length < 3 ? (
          <div className="text-center py-16 bg-gray-800 bg-opacity-50 rounded-xl shadow-lg">
            <p className="text-gray-300 text-lg italic">
              "We are yet to receive enough reviews. Be the first to share your
              experience!"
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredReviews?.data.map(
              (review: featuredReviewType, index: number) => (
                <motion.div
                  key={index}
                  className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <img
                    src={review.profile_image_url}
                    alt={review.username}
                    className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                  />
                  <h3 className="text-xl font-semibold mb-1">
                    {review.username}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {review.job_role}
                  </p>
                  <p className="text-gray-300 italic">
                    "{review.review_description}"
                  </p>
                </motion.div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
