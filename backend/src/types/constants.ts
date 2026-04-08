export const PROJECT_TYPE_ENUM = [
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

export const JOB_ROLE_ENUM = [
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

export const FILE_TYPE_ENUM = ["image/png", "image/jpeg", "video/mp4"] as const;

export const MAX_ALLOWED_IMAGES = 5;

export const MAX_REPO_SIZE_BYTES = 500 * 1024 * 1024;

export const LOCK_TTL_SECONDS = 600;

export const PROJECT_PACKAGE_SOURCE_ENUM = [
  "INITIAL_LISTING",
  "MANUAL_REPACKAGE",
  "AUTO_REPACKAGE",
] as const;

export const PAYMENT_CURRENCY_ENUM = ["USDC", "SOL"] as const;

export const DEFAULT_PAYMENT_CURRENCY = "USDC" as const;

export const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

// Fixed lamport tolerance: both sides compute from the identical price_sol_total float
// using the same deterministic integer arithmetic, so the delta is always 0.
export const LAMPORT_FIXED_TOLERANCE = 5;

export const USDC_DECIMALS = 6;
