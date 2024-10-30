import React, { useEffect } from "react";
import { animate } from "framer-motion";
import { GithubIcon, CodeIcon, DollarSignIcon, UsersIcon } from "lucide-react";

export default function FeatureSection() {
  const features = [
    {
      icon: <GithubIcon className="w-8 h-8 text-white" />,
      animatedIcon: <GithubAnimatedIcon />,
      title: "GitHub Integration",
      description:
        "Seamlessly connect and sync your GitHub projects with our platform.",
      gradient: "from-blue-500 to-blue-700",
    },
    {
      icon: <CodeIcon className="w-8 h-8 text-white" />,
      animatedIcon: <CodeAnimatedIcon />,
      title: "Resume-Ready",
      description:
        "Build and showcase high-quality projects that make an impact on your resume.",
      gradient: "from-purple-500 to-purple-700",
    },
    {
      icon: <DollarSignIcon className="w-8 h-8 text-white" />,
      animatedIcon: <DollarAnimatedIcon />,
      title: "Fair Pricing Model",
      description: "Set your own prices and keep up to 98% of your earnings.",
      gradient: "from-green-500 to-green-700",
    },
    {
      icon: <UsersIcon className="w-8 h-8 text-white" />,
      animatedIcon: <UsersAnimatedIcon />,
      title: "Developer Network",
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
                  {feature.animatedIcon}
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

const AnimatedIcon = ({ children }: { children: React.ReactNode }) => {
  const scale = [1, 1.1, 1];
  const transform = ["translateY(0px)", "translateY(-4px)", "translateY(0px)"];

  useEffect(() => {
    animate(
      ".animated-icon",
      {
        scale,
        transform,
      },
      {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 1,
      }
    );
  }, []);

  return (
    <div className="animated-icon w-full h-full flex items-center justify-center">
      {children}
    </div>
  );
};

const GithubAnimatedIcon = () => (
  <AnimatedIcon>
    <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  </AnimatedIcon>
);

const CodeAnimatedIcon = () => (
  <AnimatedIcon>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-8 h-8"
    >
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  </AnimatedIcon>
);

const DollarAnimatedIcon = () => (
  <AnimatedIcon>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-8 h-8"
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  </AnimatedIcon>
);

const UsersAnimatedIcon = () => (
  <AnimatedIcon>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-8 h-8"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  </AnimatedIcon>
);
