export const SITE_NAME = "DevsDistro";
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://devsdistro.com"
).replace(/\/+$/, "");
export const TWITTER_HANDLE = "@anuragpsarmah";
export const DEFAULT_SEO_IMAGE = `${SITE_URL}/og-image.png`;
export const DEFAULT_TITLE =
  "DevsDistro | Source Code Marketplace for GitHub Repositories";
export const DEFAULT_DESCRIPTION =
  "Buy and sell production-ready source code on DevsDistro. List private GitHub repositories, price them in USD, settle payments in SOL, and deliver code instantly.";

export function buildPageTitle(title: string) {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

export function toAbsoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncateDescription(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}
