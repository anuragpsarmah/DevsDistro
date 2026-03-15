import { motion } from "framer-motion";
import { useFeaturedReviewQuery } from "@/hooks/apiQueries";

export default function Reviews() {
  const { data, isLoading, isError } = useFeaturedReviewQuery();
  const reviews = data?.data ?? [];
  const hasReviews = reviews.length > 0;

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t-2 border-l-2 border-black/20 dark:border-white/20 transition-colors">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border-b-2 border-r-2 border-black/20 dark:border-white/20 p-10 flex flex-col justify-between animate-pulse"
            >
              <div className="mb-12">
                <div className="h-8 w-8 bg-black/10 dark:bg-white/10 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-full" />
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-5/6" />
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-4/6" />
                </div>
              </div>
              <div className="mt-auto border-t-2 border-black/10 dark:border-white/10 pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10" />
                  <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-24" />
                </div>
                <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-32 mb-3" />
                <div className="h-5 bg-black/10 dark:bg-white/10 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isError || !hasReviews) {
      return (
        <div className="border-t-2 border-l-2 border-black/20 dark:border-white/20 transition-colors">
          <div className="border-b-2 border-r-2 border-black/20 dark:border-white/20 p-16 flex flex-col items-center justify-center text-center min-h-[240px]">
            <div className="text-red-500 font-syne text-6xl font-black opacity-20 leading-none mb-6">"</div>
            <p className="font-space text-base text-gray-500 dark:text-gray-500 max-w-md">
              No reviews at the moment. Be the first to share yours.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t-2 border-l-2 border-black/20 dark:border-white/20 transition-colors">
        {reviews.map((review: any, idx: number) => (
          <motion.div
            key={review._id ?? idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1, duration: 0.6 }}
            className="border-b-2 border-r-2 border-black/20 dark:border-white/20 p-10 flex flex-col justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 group"
          >
            <div className="mb-12">
              <div className="text-red-500 font-syne text-6xl font-black opacity-30 group-hover:opacity-100 transition-opacity leading-none mb-4">"</div>
              <p className="font-space text-lg font-medium leading-relaxed text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                {review.review_description}
              </p>
            </div>

            <div className="mt-auto border-t-2 border-black/10 dark:border-white/10 group-hover:border-black/30 dark:group-hover:border-white/30 pt-6 transition-colors">
              <div className="flex items-center gap-3 mb-1">
                {review.profile_image_url && (
                  <img
                    src={review.profile_image_url}
                    alt={review.username}
                    className="w-8 h-8 rounded-full object-cover border border-black/10 dark:border-white/10"
                  />
                )}
                <div className="font-syne text-xl font-bold uppercase">{review.username}</div>
              </div>
              <div className="font-space text-sm text-gray-600 dark:text-gray-500 group-hover:text-black dark:group-hover:text-gray-400 mb-4 transition-colors">
                {review.job_role}
              </div>
              <div className="text-red-500 text-sm font-bold tracking-widest">
                {"★".repeat(Math.max(0, Math.min(5, review.review_stars)))}
                {"☆".repeat(Math.max(0, 5 - Math.min(5, review.review_stars)))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <section className="py-32 px-6 md:px-12 bg-white dark:bg-[#050505] text-black dark:text-white border-y border-black/10 dark:border-white/10 transition-colors duration-300 overflow-hidden" id="validations">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-20 border-b-4 border-black/20 dark:border-white/20 pb-6 transition-colors">
          <div className="flex items-center gap-3">
            <span className="font-space font-bold uppercase tracking-[0.2em] text-xs">Validations</span>
          </div>
          <div className="hidden md:flex gap-4 font-space text-xs font-bold uppercase tracking-widest text-red-500">
            <span>Ping: 12ms</span>
          </div>
        </div>

        {renderContent()}
      </div>
    </section>
  );
}
