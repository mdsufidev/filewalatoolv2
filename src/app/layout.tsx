import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AppChatWidget } from "@/components/chat/AppChatWidget";
import { Toaster } from "@/components/ui/sonner";
import { absoluteUrl, siteConfig } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: "FileWalaTool",
  title: {
    default: siteConfig.title,
    template: "%s | FileWalaTool",
  },
  description: siteConfig.socialDescription,
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
    title: siteConfig.title,
    description: siteConfig.socialDescription,
    url: absoluteUrl("/"),
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FileWalaTool social preview showing online image, PDF, convert and document tools.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.socialDescription,
    images: [
      {
        url: "/og-image.png",
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
      <body className="flex min-h-full flex-col bg-background text-foreground" suppressHydrationWarning>
        <Header />
        <main className="min-w-0 flex-1">{children}</main>
        <Footer />
        <AppChatWidget />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
