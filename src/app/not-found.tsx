import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileImage,
  FileSearch,
  FileText,
  Home,
  ImageIcon,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    absolute: "404 – Page Not Found | FileWalaTool",
  },
  description:
    "The page you are looking for does not exist. Explore FileWalaTool’s free online image, PDF, and document tools.",
  robots: {
    index: false,
    follow: false,
  },
};

const popularTools = [
  { label: "Image Resizer", href: "/image-resizer", icon: Maximize2 },
  { label: "Compress Image", href: "/compress-image", icon: Minimize2 },
  { label: "Merge PDF", href: "/merge-pdf", icon: FileText },
  { label: "Image to PDF", href: "/image-to-pdf", icon: FileImage },
  { label: "PDF to JPG", href: "/pdf-to-jpg", icon: ImageIcon },
  { label: "Passport Photo Maker", href: "/passport-photo", icon: FileSearch },
];

function NotFoundIllustration() {
  return (
    <div className="relative mx-auto flex h-[220px] w-full max-w-[320px] items-center justify-center sm:h-[260px] lg:max-w-[360px]" aria-hidden="true">
      <div className="absolute left-4 top-8 rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm dark:bg-card">
        PDF
      </div>
      <div className="absolute right-3 top-14 rounded-full border border-[#93C5FD]/40 bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1D4ED8] shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white">
        JPG
      </div>
      <div className="absolute bottom-8 left-8 rounded-full border border-[#A7F3D0]/60 bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#047857] shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white">
        PNG
      </div>

      <div className="relative h-[172px] w-[136px] rotate-[-7deg] rounded-2xl border border-border bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.10)] dark:bg-card">
        <div className="absolute right-0 top-0 h-12 w-12 rounded-bl-2xl rounded-tr-2xl border-b border-l border-border bg-[#FFF1F2] dark:bg-white/10" />
        <div className="space-y-2 pt-6">
          <div className="h-2.5 w-20 rounded-full bg-[#D9232E]/25" />
          <div className="h-2 w-24 rounded-full bg-muted" />
          <div className="h-2 w-16 rounded-full bg-muted" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="h-8 rounded-lg border border-border bg-[#FAFAFA] dark:bg-background" />
          <div className="h-8 rounded-lg border border-border bg-[#FAFAFA] dark:bg-background" />
        </div>
      </div>

      <div className="absolute bottom-10 right-9 flex size-16 rotate-6 items-center justify-center rounded-2xl border border-border bg-white shadow-[0_14px_35px_rgba(15,23,42,0.12)] dark:bg-card">
        <Search className="size-7 text-primary" />
      </div>

      <svg className="absolute left-[54%] top-[35%] h-11 w-11 text-muted-foreground" viewBox="0 0 44 44" fill="none">
        <path d="M16 22h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M14.5 27.5 9 33m26-22-5.5 5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M17.5 15.5 14 12a6 6 0 0 0-8.5 8.5l3.5 3.5M26.5 28.5 30 32a6 6 0 0 0 8.5-8.5L35 20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function NotFound() {
  return (
    <section className="relative isolate overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.42] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(217,35,46,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,23,23,0.08) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-16 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_0.82fr] lg:gap-12">
          <div className="order-2 mx-auto w-full max-w-2xl text-center lg:order-1 lg:mx-0 lg:text-left">
            <span className="inline-flex items-center rounded-full border border-primary/15 bg-[#FFF1F2] px-3 py-1 text-xs font-semibold tracking-[0.14em] text-[#B91C1C] dark:border-white/10 dark:bg-white/10 dark:text-white">
              ERROR 404
            </span>

            <h1 className="mt-5 text-[clamp(2.25rem,8vw,4.75rem)] font-semibold leading-[1.02] tracking-normal text-foreground">
              This page could not be found
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0">
              The link may be incorrect, expired, or the page may have moved. Let&apos;s get you back to the right tool.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/" className={cn(buttonVariants({ size: "lg" }), "min-h-11 w-full gap-2 px-4 sm:w-auto")}>
                <Home className="size-4" aria-hidden="true" />
                Go to Home
              </Link>
              <Link
                href="/tools"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-h-11 w-full gap-2 px-4 sm:w-auto")}
              >
                Explore Tools
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <section className="mt-9 text-left" aria-labelledby="popular-tools-heading">
              <h2 id="popular-tools-heading" className="text-sm font-semibold text-foreground">
                Popular tools
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {popularTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="group inline-flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-[#FFF7F8] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-card dark:hover:bg-white/10"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="truncate">{tool.label}</span>
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="mt-7 rounded-xl border border-border bg-white p-4 text-left shadow-sm dark:bg-card" aria-labelledby="browse-tools-heading">
              <p id="browse-tools-heading" className="text-sm font-medium text-foreground">
                Looking for something specific?
              </p>
              <Link
                href="/tools"
                className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-[#FFF7F8] hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:hover:bg-white/10"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">Browse all FileWalaTool tools</span>
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </Link>
            </section>
          </div>

          <div className="order-1 lg:order-2">
            <NotFoundIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}
