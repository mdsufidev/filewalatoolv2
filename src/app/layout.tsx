import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AppChatWidget } from "@/components/chat/AppChatWidget";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: "FileWalaTool",
  title: {
    default: "FileWalaTool - Free Online File Tools",
    template: "%s | FileWalaTool",
  },
  description:
    "Free, fast, and private online tools to resize, compress, convert, and manage images and PDFs.",
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
    title: "FileWalaTool - Free Online File Tools",
    description:
      "Free, fast, and private online tools to resize, compress, convert, and manage images and PDFs.",
    url: siteConfig.url,
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "FileWalaTool",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "FileWalaTool - Free Online File Tools",
    description:
      "Free, fast, and private online tools to resize, compress, convert, and manage images and PDFs.",
    images: ["/logo.png"],
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
