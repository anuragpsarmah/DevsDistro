import { BarChart2, User, PlusSquare, History, Layers } from "lucide-react";
import { SolanaLogo } from "@/components/ui/solanaLogo";
import {
  ChartDataObject,
  CommonSalesInformation,
  ProfileInformation,
} from "./types";

export const sidebarItems = [
  { icon: BarChart2, label: "Overview" },
  { icon: User, label: "Settings" },
  { icon: PlusSquare, label: "List Project" },
  { icon: Layers, label: "My Projects" },
  { icon: History, label: "Orders" },
  { icon: SolanaLogo, label: "Wallet" },
] as const;

export const INITIAL_CHART_DATA: ChartDataObject[] = [
  { month: "January", sales: 0 },
  { month: "February", sales: 0 },
  { month: "March", sales: 0 },
  { month: "April", sales: 0 },
  { month: "May", sales: 0 },
  { month: "June", sales: 0 },
  { month: "July", sales: 0 },
  { month: "August", sales: 0 },
  { month: "September", sales: 0 },
  { month: "October", sales: 0 },
  { month: "November", sales: 0 },
  { month: "December", sales: 0 },
] as const;

export const INITIAL_SALES_INFO: CommonSalesInformation = {
  active_projects: 0,
  best_seller: "",
  customer_rating: 0,
  total_sales: 0,
} as const;

export const JOB_ROLES = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Mobile Developer",
  "DevOps Engineer",
  "Data Scientist",
  "UI/UX Designer",
  "Product Manager",
  "QA Engineer",
  "Full Stack Developer",
  "Student",
  "Other",
] as const;

export const MAX_REVIEW_LENGTH = 200;
export const CITY_SEARCH_DELAY = 300;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_IMAGES = 5;

export const INITIAL_PROFILE_INFORMATION_DATA: ProfileInformation = {
  website_url: "",
  x_username: "",
  short_bio: "",
  job_role: "",
  location: "",
  review_description: "",
  review_stars: 0,
  profile_visibility: true,
  auto_repackage_on_push: false,
} as const;

export const PROJECT_TYPES = [
  "Web Application",
  "Mobile Application",
  "Desktop Application",
  "SaaS Platform",
  "E-commerce Platform",
  "CMS/Blog",
  "Framework",
  "Library",
  "API",
  "CLI Tool",
  "Data Visualization",
  "Game",
  "IoT Application",
  "Machine Learning/AI",
  "Blockchain Application",
  "DevOps Tool",
  "Cybersecurity Tool",
  "Scientific Computing",
  "Educational Application",
  "Enterprise Software",
  "Productivity Tool",
  "Other",
] as const;

export const ALLOWED_IMAGE_TYPES: { [key: string]: string[] } = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
} as const;

export const ALLOWED_VIDEO_TYPES: { [key: string]: string[] } = {
  "video/mp4": ["mp4"],
} as const;

export const MAX_IMAGE_FILE_SIZE = 2 * 1024 * 1024;

export const MAX_VIDEO_FILE_SIZE = 50 * 1024 * 1024;
