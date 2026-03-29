import { useEffect } from "react";
import {
  buildPageTitle,
  DEFAULT_DESCRIPTION,
  DEFAULT_SEO_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  TWITTER_HANDLE,
  toAbsoluteUrl,
} from "@/lib/seo";

type StructuredData = Record<string, unknown> | Array<Record<string, unknown>>;

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  imageAlt?: string;
  robots?: string;
  type?: string;
  structuredData?: StructuredData;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image = DEFAULT_SEO_IMAGE,
  imageAlt = `${SITE_NAME} preview`,
  robots = "index, follow",
  type = "website",
  structuredData,
}: SEOProps) {
  useEffect(() => {
    const pageTitle = title ? buildPageTitle(title) : DEFAULT_TITLE;
    const canonicalUrl = toAbsoluteUrl(path ?? window.location.pathname);

    document.title = pageTitle;
    document.documentElement.setAttribute("lang", "en");

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: description,
    });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: robots,
    });
    upsertMeta('meta[name="author"]', {
      name: "author",
      content: SITE_NAME,
    });
    upsertMeta('meta[name="application-name"]', {
      name: "application-name",
      content: SITE_NAME,
    });
    upsertMeta('meta[name="apple-mobile-web-app-title"]', {
      name: "apple-mobile-web-app-title",
      content: SITE_NAME,
    });

    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: type,
    });
    upsertMeta('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: SITE_NAME,
    });
    upsertMeta('meta[property="og:locale"]', {
      property: "og:locale",
      content: "en_US",
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: pageTitle,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: image,
    });
    upsertMeta('meta[property="og:image:alt"]', {
      property: "og:image:alt",
      content: imageAlt,
    });

    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:site"]', {
      name: "twitter:site",
      content: TWITTER_HANDLE,
    });
    upsertMeta('meta[name="twitter:creator"]', {
      name: "twitter:creator",
      content: TWITTER_HANDLE,
    });
    upsertMeta('meta[name="twitter:url"]', {
      name: "twitter:url",
      content: canonicalUrl,
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: pageTitle,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: description,
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: image,
    });
    upsertMeta('meta[name="twitter:image:alt"]', {
      name: "twitter:image:alt",
      content: imageAlt,
    });

    upsertLink('link[rel="canonical"]', {
      rel: "canonical",
      href: canonicalUrl,
    });
    upsertLink('link[rel="alternate"][hreflang="en-US"]', {
      rel: "alternate",
      hreflang: "en-US",
      href: canonicalUrl,
    });

    Array.from(
      document.head.querySelectorAll('script[data-seo-structured-data="true"]')
    ).forEach((node) => node.remove());

    if (!structuredData) {
      return;
    }

    const payload = Array.isArray(structuredData)
      ? structuredData
      : [structuredData];

    payload.forEach((entry) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seoStructuredData = "true";
      script.text = JSON.stringify(entry);
      document.head.appendChild(script);
    });
  }, [description, image, imageAlt, path, robots, structuredData, title, type]);

  return null;
}
