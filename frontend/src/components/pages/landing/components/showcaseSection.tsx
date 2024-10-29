import { motion } from "framer-motion";

export default function ShowcaseSection() {
  const projects = [
    {
      title: "AI Image Generator",
      description: "Create stunning images with state-of-the-art AI models",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["AI", "Computer Vision"],
    },
    {
      title: "Blockchain Explorer",
      description:
        "Real-time visualization of blockchain data and transactions",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["Blockchain", "Data Visualization"],
    },
    {
      title: "IoT Dashboard",
      description: "Comprehensive monitoring and control for IoT devices",
      image: "/placeholder.svg?height=200&width=300",
      tags: ["IoT", "Dashboard"],
    },
  ];

  return (
    <section id="showcase" className="py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-4xl font-bold mb-16 text-center">
          Featured Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <img
                src={project.image}
                alt={project.title}
                className="w-full object-cover h-48"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                <p className="text-gray-300 mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="bg-gray-700 text-xs font-semibold px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors shadow-md w-full">
                  View Project
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
