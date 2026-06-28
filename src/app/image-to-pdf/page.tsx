import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronRight,
  Download,
  FileImage,
  FileOutput,
  FileText,
  Images,
  Minimize2,
  RefreshCw,
  UploadCloud,
  Zap,
} from "lucide-react";

import { ImageToPdfTool } from "@/components/tools/ImageToPdfTool";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { breadcrumbJsonLd, metadataForPath, webApplicationJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import type { Tool } from "@/types/tool";

export const metadata: Metadata = metadataForPath("/image-to-pdf");

type Step = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const steps: Step[] = [
  {
    title: "Upload your images",
    description: "Choose JPG, PNG, or WebP images from your device.",
    icon: UploadCloud,
  },
  {
    title: "Create one PDF",
    description: "Each image is placed on its own PDF page.",
    icon: RefreshCw,
  },
  {
    title: "Download PDF",
    description: "Save the combined PDF file to your device.",
    icon: Download,
  },
];

const relatedTools: Tool[] = [
  {
    name: "PDF to Image",
    description: "Turn PDF pages into images.",
    href: "/pdf-to-image",
    icon: Images,
  },
  {
    name: "PDF to JPG",
    description: "Export PDF pages as JPG.",
    href: "/pdf-to-image",
    icon: FileImage,
  },
  {
    name: "Word to PDF",
    description: "Create a PDF from a document.",
    href: "/word-to-pdf",
    icon: FileText,
  },
  {
    name: "Compress PDF",
    description: "Reduce PDF file size.",
    href: "/compress-pdf",
    icon: Minimize2,
  },
  {
    name: "JPG to PNG",
    description: "Convert JPG images to PNG.",
    href: "/jpg-to-png",
    icon: FileOutput,
  },
  {
    name: "Compress Image",
    description: "Reduce image file size.",
    href: "/compress-image",
    icon: Minimize2,
  },
];

export default function ImageToPdfPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Convert Tools", path: "/convert-tools" },
            { name: "Image to PDF", path: "/image-to-pdf" },
          ]),
          webApplicationJsonLd({
            name: "Image to PDF Converter",
            description: "Convert JPG, PNG, and WebP images into one PDF file in your browser.",
            path: "/image-to-pdf",
            applicationCategory: "UtilitiesApplication",
          }),
        ]}
      />
      <section className="mx-auto w-full max-w-[1160px] px-4 pb-5 pt-3 sm:px-5 lg:px-5 lg:pb-6 lg:pt-3.5">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link
            href="/"
            className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <Link
            href="/convert-tools"
            className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Convert
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">Image to PDF</span>
        </nav>

        <div className="mt-2.5">
          <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">Image to PDF</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Convert JPG, PNG, and WebP images into one PDF file.
          </p>
        </div>

        <ImageToPdfTool />
      </section>

      <section className="border-y border-primary/10 bg-[#FFF1F2]">
        <div className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 py-10 sm:px-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/25 bg-white text-primary">
              Convert Tool
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-[#171717] sm:text-4xl">
              Convert images to <span className="text-primary">PDF</span>
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Combine images into a clean PDF with a fast browser-based workflow.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              No signup required - Browser-based conversion - One image per PDF page
            </p>
          </div>

          <Card className="border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                  <Zap className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#171717]">Built for quick image conversion</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Upload images, generate a PDF, and download it directly from your browser.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-[#FFF1F2]">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
              How to convert images to PDF
            </h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              A simple flow for creating a PDF from image files.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="relative rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
                  {index < steps.length - 1 ? (
                    <div className="absolute left-[calc(100%-0.5rem)] top-10 hidden h-px w-8 bg-primary/25 md:block" />
                  ) : null}
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" aria-hidden="true" />
                        <h3 className="text-base font-semibold text-[#171717]">{step.title}</h3>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
              Related convert tools
            </h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              Continue with other conversion utilities from FileWalaTool.
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group flex min-h-24 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-[#FFF1F2] hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#171717] group-hover:text-[#B91C1C]">
                      {tool.name}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">{tool.description}</span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
