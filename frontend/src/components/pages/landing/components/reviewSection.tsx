import { motion } from "framer-motion";

export default function ReviewSection() {
  const reviews = [
    {
      reviewer: "Alex Johnson",
      role: "Full-Stack Developer",
      review:
        "DevExchange has transformed how I share and monetize my projects. The platform is intuitive and connects me with developers worldwide!",
      image: "/reviewer-alex.jpg", // Add your image path here
    },
    {
      reviewer: "Megan Smith",
      role: "Frontend Developer",
      review:
        "Listing my projects on DevExchange was easy and rewarding! The community feedback has helped me improve and showcase my work.",
      image: "/reviewer-megan.jpg", // Add your image path here
    },
    {
      reviewer: "John Doe",
      role: "Data Scientist",
      review:
        "A fantastic platform for anyone looking to showcase resume-ready projects and collaborate on groundbreaking tech!",
      image: "/reviewer-john.jpg", // Add your image path here
    },
  ];

  return (
    <section id="reviews" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <h2 className="text-4xl font-bold mb-16 text-center">
          What Our Users Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-center shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <img
                src={review.image}
                alt={review.reviewer}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-semibold mb-1">{review.reviewer}</h3>
              <p className="text-sm text-gray-400 mb-4">{review.role}</p>
              <p className="text-gray-300 italic">"{review.review}"</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
