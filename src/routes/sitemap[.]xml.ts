import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://codebyvamshi.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/compiler", changefreq: "weekly", priority: "0.9" },
  { path: "/assistant", changefreq: "weekly", priority: "0.9" },
  { path: "/roadmap", changefreq: "weekly", priority: "0.9" },
  { path: "/assignments", changefreq: "weekly", priority: "0.8" },
  { path: "/interview", changefreq: "weekly", priority: "0.8" },
  { path: "/companies", changefreq: "weekly", priority: "0.8" },
  { path: "/placement", changefreq: "monthly", priority: "0.7" },
  { path: "/resume-checker", changefreq: "monthly", priority: "0.7" },
  { path: "/github", changefreq: "monthly", priority: "0.7" },
  { path: "/resources", changefreq: "monthly", priority: "0.7" },
  { path: "/analytics", changefreq: "monthly", priority: "0.5" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
