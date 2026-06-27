import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Crop, FileImage, ImageIcon, Minimize2, ScanLine } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { PassportPhotoTool } from "@/components/tools/PassportPhotoTool";
import { breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Passport Photo Maker Online | India Passport Size Photo | FileWalaTool",
  description:
    "Create and crop passport-size photos online. Use India Passport Seva digital, 35 × 45 mm print, and custom photo presets. Download JPG photos in seconds.",
  alternates: {
    canonical: "/passport-photo",
  },
  openGraph: {
    type: "website",
    siteName: "FileWalaTool",
    title: "Passport Photo Maker Online | Passport Size Photo",
    description:
      "Create passport-size photos online with digital, print, and custom presets. Crop, center, and download a JPG passport photo in your browser.",
    url: "https://www.filewalatool.com/passport-photo",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "FileWalaTool" }],
  },
  twitter: {
    card: "summary",
    title: "Passport Photo Maker Online | Passport Size Photo",
    description:
      "Create passport-size photos online with digital, print, and custom presets. Crop, center, and download a JPG passport photo in your browser.",
    images: ["/logo.png"],
  },
};

const relatedTools = [
  { name: "PAN Photo Resize", href: "/pan-photo-resize", icon: ImageIcon },
  { name: "Signature Resize", href: "/signature-resize", icon: ScanLine },
  { name: "Image to 20KB", href: "/image-to-20kb", icon: Minimize2 },
  { name: "Image to 50KB", href: "/image-to-50kb", icon: FileImage },
  { name: "Crop Image", href: "/crop-image", icon: Crop },
  { name: "KB Resizer", href: "/kb-resizer", icon: ScanLine },
];

export default function PassportPhotoPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Passport Photo Maker Online",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any",
    url: "/passport-photo",
    description:
      "Create and crop passport-size photos online with India Passport Seva digital, 35 x 45 mm print, and custom photo presets.",
  };

  return (
    <div className="bg-[#FAFAFA]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Document Tools", path: "/document-tools" },
          { name: "Passport Photo Maker", path: "/passport-photo" },
        ])}
      />

      <section className="mx-auto w-full max-w-[1160px] px-4 pb-6 pt-3 sm:px-5 lg:px-5 lg:pt-3.5">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link
            href="/"
            className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <Link
            href="/document-tools"
            className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Document Tools
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">Passport Photo Maker</span>
        </nav>

        <div className="mt-2.5">
          <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
            Passport Photo Maker Online
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
            Create passport-size photos online with India Passport Seva digital, 35 × 45 mm print, and custom presets. Crop, zoom, and download a JPG in your browser.
          </p>
        </div>

        <PassportPhotoTool />
      </section>

      <section className="border-t border-[#E5E7EB] bg-white">
        <div className="mx-auto grid w-full max-w-[1160px] gap-6 px-4 py-8 sm:px-5 lg:grid-cols-3 lg:px-5">
          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">What is Passport Photo Maker?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Passport Photo Maker helps crop and center a photo for common passport-size requirements. Requirements can vary by country and portal, so check the current instructions before upload or print.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">
              How to make a passport photo online
            </h2>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>1. Select the photo requirement you need.</li>
              <li>2. Upload a clear front-facing photo.</li>
              <li>3. Drag the photo until your face is centered inside the guide.</li>
              <li>4. Scroll to zoom if needed.</li>
              <li>5. Download the JPG and verify your final portal requirements.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">
              Before uploading or printing your passport photo
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>Use a recent colour photo.</li>
              <li>Keep face straight and centered.</li>
              <li>Keep eyes open and visible.</li>
              <li>Prefer a plain white background.</li>
              <li>Avoid blur, shadows, glare, filters, or face retouching.</li>
              <li>Do not use a cropped group photo.</li>
              <li>Check your exact application portal before submission.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto w-full max-w-[1160px] px-4 py-8 sm:px-5 lg:px-5">
          <h2 className="text-xl font-semibold tracking-normal text-[#171717]">Related tools</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            {relatedTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group flex min-h-16 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm font-medium text-[#171717] transition-colors hover:border-primary/35 hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 truncate">{tool.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
