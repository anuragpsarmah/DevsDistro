import { GithubIcon, CodeIcon, DollarSignIcon, UsersIcon } from "lucide-react";
import {
  GithubAnimatedIcon,
  CodeAnimatedIcon,
  DollarAnimatedIcon,
  UsersAnimatedIcon,
} from "@/components/ui/iconAnimations";

export const features = [
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
    description: "Set your own prices and keep up to 99% of your earnings.",
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
