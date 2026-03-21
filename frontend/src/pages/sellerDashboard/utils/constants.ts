import { BarChart2, User, PlusSquare, History, Layers } from "lucide-react";
import { SolanaLogo } from "@/components/ui/solanaLogo";
import {
  ChartDataObject,
  CommonSalesInformation,
  DatePreset,
  ProfileInformation,
} from "./types";

export const sidebarItems = [
  { icon: BarChart2, label: "Overview" },
  { icon: User, label: "Settings" },
  { icon: PlusSquare, label: "List Project" },
  { icon: Layers, label: "My Projects" },
  { icon: History, label: "Sales" },
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

export const DEFAULT_PROJECT_OPTIONS = [
  { value: "all", label: "All Projects" },
  { value: "unlisted", label: "Unlisted" },
];

export const WALLET_LINKS: Record<string, string> = {
  Phantom: "https://phantom.app/",
  Solflare: "https://solflare.com/",
};

export const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> =
  [
    { value: "all", label: "All Time" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "thisYear", label: "This Year" },
  ];

export const MAX_TECH_STACK = 15;
export const MAX_REVIEW_LENGTH = 200;
export const MAX_BIO_LENGTH = 250;
export const WALLET_OP_DEBOUNCE_MS = 500;
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
  "UI Component",
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

// Card thumbnail: 16:9 at 1280x720
export const CARD_CROP_WIDTH = 1280;
export const CARD_CROP_HEIGHT = 720;
export const CARD_ASPECT_RATIO = CARD_CROP_WIDTH / CARD_CROP_HEIGHT; // 16/9

// Detail page banner: 21:9 at 1260x540
export const DETAIL_CROP_WIDTH = 1260;
export const DETAIL_CROP_HEIGHT = 540;
export const DETAIL_ASPECT_RATIO = DETAIL_CROP_WIDTH / DETAIL_CROP_HEIGHT; // 7/3
