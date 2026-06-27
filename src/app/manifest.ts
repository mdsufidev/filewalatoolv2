import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FileWalaTool",
    short_name: "FileWalaTool",
    description: "Free, fast, and private online file tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#D9232E",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
