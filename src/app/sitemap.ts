import type { MetadataRoute } from "next";

import { absoluteUrl, publicRoutes } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const noIndexPaths = new Set(["/image-to-20kb", "/image-to-50kb"]);

  return publicRoutes.filter((route) => !noIndexPaths.has(route.path)).map((route) => ({
    url: absoluteUrl(route.path),
    ...(route.lastModified ? { lastModified: route.lastModified } : {}),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
