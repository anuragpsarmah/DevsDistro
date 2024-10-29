import { GithubIcon, CodeIcon, DollarSignIcon, UsersIcon } from "lucide-react";

export default function FeatureSection() {
  const features = [
    {
      icon: <GithubIcon className="w-8 h-8 text-white" />,
      title: "GitHub Integration",
      description:
        "Seamlessly connect and sync your GitHub projects with our platform.",
      gradient: "from-blue-500 to-blue-700",
    },
    {
      icon: <CodeIcon className="w-8 h-8 text-white" />,
      title: "Resume-Ready Projects",
      description:
        "Build and showcase high-quality projects that make an impact on your resume.",
      gradient: "from-purple-500 to-purple-700",
    },
    {
      icon: <DollarSignIcon className="w-8 h-8 text-white" />,
      title: "Fair Pricing Model",
      description: "Set your own prices and keep up to 98% of your earnings.",
      gradient: "from-green-500 to-green-700",
    },
    {
      icon: <UsersIcon className="w-8 h-8 text-white" />,
      title: "Global Developer Network",
      description:
        "Connect with a diverse community of developers from around the world.",
      gradient: "from-pink-500 to-pink-700",
    },
  ];

  return (
    <section id="features" className="py-24 bg-gray-900">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-4xl font-bold mb-16 text-center text-white">
          Why Choose DevExchange?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl bg-gray-800 flex flex-col"
            >
              <div className={`bg-gradient-to-br ${feature.gradient} p-6`}>
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-white bg-opacity-20">
                  {feature.icon}
                </div>
              </div>
              <div className="p-6 bg-gray-800 flex-grow flex flex-col">
                <h3 className="text-xl font-semibold mb-2 text-white min-h-[3rem]">
                  {feature.title}
                </h3>
                <p className="text-gray-300 text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
