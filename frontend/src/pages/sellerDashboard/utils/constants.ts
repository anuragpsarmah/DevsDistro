import {
  ChartDataObject,
  CommonSalesInformation,
  ProfileInformation,
} from "./types";

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
];

export const INITIAL_SALES_INFO: CommonSalesInformation = {
  active_projects: 0,
  best_seller: "",
  customer_rating: 0,
  total_sales: 0,
};

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
export const CITY_SEARCH_DELAY = 500;
export const MAX_DESCRIPTION_LENGTH = 1000;
export const MAX_IMAGES = 5;

export const INITIAL_PROFILE_INFORMATION_DATA: ProfileInformation = {
  username: "",
  name: "",
  profileImageUrl: "",
  jobRole: "",
  location: "",
  reviewDescription: "",
  reviewStar: 0,
  profileVisibility: true,
};

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
