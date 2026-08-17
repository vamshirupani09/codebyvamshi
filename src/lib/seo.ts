export const SITE_URL = "https://codebyvamshi.lovable.app";

interface SeoInput {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  noindex?: boolean;
}

/** Builds per-route head meta with self-referencing og:url and canonical. */
export function seoHead({ path, title, description, ogTitle, ogDescription, ogType = "website", noindex }: SeoInput) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: ogTitle ?? title },
      { property: "og:description", content: ogDescription ?? description },
      { property: "og:type", content: ogType },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle ?? title },
      { name: "twitter:description", content: ogDescription ?? description },
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
