import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
const indexHtmlPath = path.join(distDir, "index.html");
const siteUrl = "https://devsdistro.com";
const defaultImage = `${siteUrl}/og-image.jpg`;

const routes = [
  {
    routeDir: "api",
    path: "/api",
    title: "World Cities API | DevsDistro",
    description:
      "Explore the DevsDistro World Cities API documentation. Search cities by prefix with a fast public REST endpoint designed for browser-based developer tooling.",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "World Cities API",
        url: `${siteUrl}/api`,
        description:
          "Explore the DevsDistro World Cities API documentation. Search cities by prefix with a fast public REST endpoint designed for browser-based developer tooling.",
      },
      {
        "@context": "https://schema.org",
        "@type": "WebAPI",
        name: "World Cities API",
        url: `${siteUrl}/api`,
        documentation: `${siteUrl}/api`,
        provider: {
          "@type": "Organization",
          name: "DevsDistro",
          url: siteUrl,
        },
        description:
          "Explore the DevsDistro World Cities API documentation. Search cities by prefix with a fast public REST endpoint designed for browser-based developer tooling.",
      },
    ],
  },
  {
    routeDir: "privacy",
    path: "/privacy",
    title: "Privacy Policy | DevsDistro",
    description:
      "Read the DevsDistro privacy policy covering GitHub OAuth data, repository metadata, wallet information, and how marketplace account data is handled.",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Privacy Policy",
        url: `${siteUrl}/privacy`,
        description:
          "Read the DevsDistro privacy policy covering GitHub OAuth data, repository metadata, wallet information, and how marketplace account data is handled.",
      },
    ],
  },
  {
    routeDir: "terms",
    path: "/terms",
    title: "Terms of Service | DevsDistro",
    description:
      "Review the DevsDistro terms of service for marketplace usage, GitHub app access, repository ownership, Solana payments, and delivery terms.",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Terms of Service",
        url: `${siteUrl}/terms`,
        description:
          "Review the DevsDistro terms of service for marketplace usage, GitHub app access, repository ownership, Solana payments, and delivery terms.",
      },
    ],
  },
];

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function replaceTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    throw new Error(`Expected pattern not found: ${pattern}`);
  }

  return html.replace(pattern, replacement);
}

function buildStructuredDataMarkup(entries) {
  return entries
    .map(
      (entry) =>
        `    <script type="application/ld+json">${JSON.stringify(entry)}</script>`
    )
    .join("\n");
}

function buildPageHtml(template, route) {
  const canonical = `${siteUrl}${route.path}`;
  const description = escapeHtml(route.description);
  const title = escapeHtml(route.title);

  let html = template;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = replaceTag(
    html,
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${description}" />`
  );
  html = replaceTag(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${canonical}" />`
  );
  html = replaceTag(
    html,
    /<link rel="alternate" hreflang="en-US" href="[^"]*"\s*\/>/,
    `<link rel="alternate" hreflang="en-US" href="${canonical}" />`
  );
  html = replaceTag(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${canonical}" />`
  );
  html = replaceTag(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${title}" />`
  );
  html = replaceTag(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${description}" />`
  );
  html = replaceTag(
    html,
    /<meta property="og:image" content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${defaultImage}" />`
  );
  html = replaceTag(
    html,
    /<meta name="twitter:url" content="[^"]*"\s*\/>/,
    `<meta name="twitter:url" content="${canonical}" />`
  );
  html = replaceTag(
    html,
    /<meta name="twitter:title" content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  html = replaceTag(
    html,
    /<meta name="twitter:description" content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${description}" />`
  );

  const structuredDataMarkup = buildStructuredDataMarkup(route.structuredData);
  return html.replace("</head>", `${structuredDataMarkup}\n  </head>`);
}

async function main() {
  const template = await readFile(indexHtmlPath, "utf8");

  await Promise.all(
    routes.map(async (route) => {
      const targetDir = path.join(distDir, route.routeDir);
      const targetFile = path.join(targetDir, "index.html");
      await mkdir(targetDir, { recursive: true });
      await writeFile(targetFile, buildPageHtml(template, route), "utf8");
    })
  );
}

main().catch((error) => {
  console.error("Failed to generate SEO route pages:", error);
  process.exitCode = 1;
});
