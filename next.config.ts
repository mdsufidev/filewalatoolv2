import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/convert",
        destination: "/convert-tools",
        statusCode: 301,
      },
      {
        source: "/contact-us",
        destination: "/contact",
        statusCode: 301,
      },
      {
        source: "/pdf-to-jpg",
        destination: "/pdf-to-image",
        statusCode: 301,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
