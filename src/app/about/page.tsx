import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  ImageIcon,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, founderProfileJsonLd, metadataForPath, organizationJsonLd } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/about");

const highlights = [
  {
    title: "Practical file tools",
    description: "Resize images, edit PDFs, convert files, and prepare common documents from one clean workspace.",
    icon: Wrench,
  },
  {
    title: "Browser-first workflows",
    description: "Many tools process files directly in your browser, keeping the experience quick and private.",
    icon: ShieldCheck,
  },
  {
    title: "Simple by design",
    description: "Each page focuses on the task first: upload, adjust settings, preview where needed, and download.",
    icon: Zap,
  },
];

const toolGroups = [
  { label: "Image tools", href: "/image-tools", icon: ImageIcon },
  { label: "PDF tools", href: "/pdf-tools", icon: FileText },
  { label: "Convert tools", href: "/convert-tools", icon: Sparkles },
  { label: "Document tools", href: "/document-tools", icon: LockKeyhole },
];

export default function AboutPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
          organizationJsonLd(),
          founderProfileJsonLd(),
        ]}
      />
      <section className="mx-auto w-full max-w-[1160px] px-4 pb-10 pt-3 sm:px-5 lg:px-5 lg:pb-12 lg:pt-3.5">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link
            href="/"
            className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">About</span>
        </nav>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/25 bg-white text-primary">
              About FileWalaTool
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-[#171717] sm:text-5xl">
              Fast file tools for everyday work
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              FileWalaTool is built for common image, PDF, conversion, and document tasks that should not require
              heavy software or complicated steps. Open the tool, upload your file, make the change, and download the
              result.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/tools"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Browse tools
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Contact us
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#171717]">What we focus on</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Reliable tools, clear settings, fast downloads, and pages that work well on desktop and mobile.
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                {toolGroups.map((group) => {
                  const Icon = group.icon;

                  return (
                    <Link
                      key={group.href}
                      href={group.href}
                      className="group flex min-h-11 items-center gap-3 rounded-lg border border-[#E5E7EB] px-3 transition-colors hover:border-primary/30 hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <Icon className="size-4 text-primary" aria-hidden="true" />
                      <span className="flex-1 text-sm font-medium text-[#171717] group-hover:text-[#B91C1C]">
                        {group.label}
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-[#FAFAFA]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="relative min-h-[320px] bg-[#FFF1F2] sm:min-h-[420px] lg:min-h-full">
                <Image
                  src="/founder-muhammad-sufiyan.webp"
                  alt="Muhammad Sufiyan, founder of FileWalaTool"
                  fill
                  sizes="(min-width: 1024px) 44vw, 100vw"
                  className="object-cover object-center"
                />
              </div>
              <div className="flex flex-col justify-center px-5 py-8 sm:px-7 sm:py-10 lg:px-10">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Founder</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
                  Meet the Founder
                </h2>
                <div className="mt-5">
                  <h3 className="text-xl font-semibold text-[#171717]">Muhammad Sufiyan</h3>
                  <p className="mt-1 text-sm font-medium text-primary">Founder of FileWalaTool · Java Full Stack Developer</p>
                </div>
                <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Muhammad Sufiyan created FileWalaTool to offer practical online tools for image, PDF, and document
                  tasks. The platform focuses on simplicity, privacy-aware browser-based workflows, and a user-friendly
                  experience.
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  The vision behind FileWalaTool is to make common file tasks easier, faster, and more accessible for
                  everyone.
                </p>
                <div className="mt-6 grid gap-2 text-sm text-[#374151] sm:grid-cols-3">
                  {["Built for simple file workflows", "Focused on browser-based tools", "Designed for everyday users"].map((item) => (
                    <div key={item} className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-3">
                      <span className="inline-flex items-start gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/tools"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Explore FileWalaTool
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Contact us
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <a
                    href="https://mdsufidev.vercel.app/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    View portfolio
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-primary/10 bg-[#FFF1F2]">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
              Built for repeat use
            </h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              The interface stays direct and task-focused so you can finish file work without searching through menus.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-[#171717]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-normal text-[#171717]">Need help or want a new tool?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
              Send feedback, report a problem, or request a tool from the contact page.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Contact FileWalaTool
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
