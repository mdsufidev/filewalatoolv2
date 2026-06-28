import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Crop,
  Download,
  FileImage,
  ImageIcon,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  UploadCloud,
} from "lucide-react";

import { KbResizerTool } from "@/components/tools/KbResizerTool";
import { ToolSeoJsonLd } from "@/components/seo/ToolSeoJsonLd";
import { metadataForPath } from "@/lib/seo";
import type { Tool } from "@/types/tool";

export const metadata: Metadata = metadataForPath("/image-to-50kb");

type Step = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const steps: Step[] = [
  { title: "Upload your image", description: "Choose the JPG, PNG, or WebP file you want to compress.", icon: UploadCloud },
  { title: "Adjust quality", description: "Use the target KB settings to reach a smaller file.", icon: SlidersHorizontal },
  { title: "Download the result", description: "Save the compressed image to your device.", icon: Download },
];

const relatedTools: Tool[] = [
  { name: "Image Resizer", description: "Resize image dimensions.", href: "/image-resizer", icon: Maximize2 },
  { name: "Compress Image", description: "Reduce image file size.", href: "/compress-image", icon: Minimize2 },
  { name: "KB Resizer", description: "Resize images to target KB.", href: "/kb-resizer", icon: FileImage },
  { name: "Image to 20KB", description: "Compress image to 20KB.", href: "/image-to-20kb", icon: ImageIcon },
  { name: "Crop Image", description: "Crop photos precisely.", href: "/crop-image", icon: Crop },
  { name: "Passport Photo Maker", description: "Prepare official photos.", href: "/passport-photo", icon: BadgeCheck },
];

export default function ImageTo50KbPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <ToolSeoJsonLd path="/image-to-50kb" name="Image to 50KB" categoryName="Document Tools" categoryPath="/document-tools" />
      <section className="mx-auto w-full max-w-[1160px] px-4 pb-5 pt-3 sm:px-5 lg:px-5 lg:pb-6 lg:pt-3.5">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <Link href="/#image-tools" className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Image Tools
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">Image to 50KB</span>
        </nav>

        <div className="mt-2.5">
          <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">Image to 50KB</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Upload an image, compress it to a 50 KB target, and download the result.
          </p>
        </div>

        <KbResizerTool
          title="Upload image"
          description="Choose a JPG, PNG, or WebP image up to 25 MB."
          settingsTitle="50 KB settings"
          settingsDescription="Upload an image to target a 50 KB file size."
          defaultTargetKb={50}
          targetPills={[20, 50, 100, 200]}
        />
      </section>

      <section className="border-y border-primary/10 bg-[#FFF1F2]">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">How to compress to 50KB</h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">A simple flow for preparing smaller upload files.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="relative rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
                  {index < steps.length - 1 ? <div className="absolute left-[calc(100%-0.5rem)] top-10 hidden h-px w-8 bg-primary/25 md:block" /> : null}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">Related image tools</h2>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">Continue with other image utilities from FileWalaTool.</p>
            </div>
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
                    <span className="block truncate text-sm font-semibold text-[#171717] group-hover:text-[#B91C1C]">{tool.name}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">{tool.description}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
