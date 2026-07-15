import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AppChatWidget } from "@/components/chat/AppChatWidget";
import { ToolEditorialContent } from "@/components/seo/ToolEditorialContent";
import { Toaster } from "@/components/ui/sonner";
import { absoluteUrl, homeMetadata, siteConfig } from "@/lib/seo";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

const googleAdSenseClient =
  process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT ?? "ca-pub-2241216694217592";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: homeMetadata.title,
    template: "%s | FileWalaTool",
  },
  description: homeMetadata.description,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_US",
    title: homeMetadata.title,
    description: homeMetadata.description,
    url: siteConfig.url,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: "FileWalaTool social preview showing online image, PDF, convert and document tools.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: homeMetadata.title,
    description: homeMetadata.description,
    images: [
      {
        url: siteConfig.ogImage,
        alt: "FileWalaTool social preview showing online image, PDF, convert and document tools.",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {googleAdSenseClient ? <meta name="google-adsense-account" content={googleAdSenseClient} /> : null}
        {googleAdSenseClient ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdSenseClient}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground" suppressHydrationWarning>
        <Header />
        <main className="min-w-0 flex-1">
          {children}
          <ToolEditorialContent />
        </main>
        <Footer />
        <AppChatWidget />
        <Toaster position="top-right" richColors closeButton />
        <SpeedInsights />
      </body>
    </html>
  );
}
