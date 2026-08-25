export const SITE_URL = "https://codebyvamshi.lovable.app";

interface SeoInput {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  noindex?: boolean;
  /** Absolute path to a social preview image served from /public, e.g. "/og/github.jpg". */
  image?: string;
}

/** Builds per-route head meta with self-referencing og:url and canonical. */
export function seoHead({ path, title, description, ogTitle, ogDescription, ogType = "website", noindex, image }: SeoInput) {
  const url = `${SITE_URL}${path}`;
  const imageUrl = image ? `${SITE_URL}${image}` : null;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: ogTitle ?? title },
      { property: "og:description", content: ogDescription ?? description },
      { property: "og:type", content: ogType },
      { property: "og:url", content: url },
      ...(imageUrl
        ? [
            { property: "og:image", content: imageUrl },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
            { property: "og:image:alt", content: ogTitle ?? title },
            { name: "twitter:image", content: imageUrl },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle ?? title },
      { name: "twitter:description", content: ogDescription ?? description },
      ...(noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
