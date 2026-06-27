import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Crop, FileImage, Minimize2, PenLine, ScissorsLineDashed } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { PanPhotoResizeTool } from "@/components/tools/PanPhotoResizeTool";
import { breadcrumbJsonLd, metadataForPath, webApplicationJsonLd } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/pan-photo-resize");

const relatedTools = [
  { name: "Signature Resize", href: "/signature-resize", icon: PenLine },
  { name: "Image to 20KB", href: "/image-to-20kb", icon: Minimize2 },
  { name: "Image to 50KB", href: "/image-to-50kb", icon: FileImage },
  { name: "Crop Image", href: "/crop-image", icon: Crop },
  { name: "KB Resizer", href: "/kb-resizer", icon: ScissorsLineDashed },
];

export default function PanPhotoResizePage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Document Tools", path: "/document-tools" },
            { name: "PAN Photo Resize", path: "/pan-photo-resize" },
          ]),
          webApplicationJsonLd({
            name: "PAN Photo Resize Online",
            description:
              "Resize and crop PAN application photos with JPEG output, provider presets, file size targets, dimensions, and DPI metadata.",
            path: "/pan-photo-resize",
            applicationCategory: "MultimediaApplication",
          }),
        ]}
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
          <span className="font-medium text-[#171717]">PAN Photo Resize</span>
        </nav>

        <div className="mt-2.5">
          <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
            PAN Photo Resize Online
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
            Prepare JPEG photos for Protean / NSDL and UTIITSL PAN application upload with portal presets, crop positioning, target file size, and DPI metadata.
          </p>
        </div>

        <PanPhotoResizeTool />
      </section>

      <section className="border-t border-[#E5E7EB] bg-white">
        <div className="mx-auto grid w-full max-w-[1160px] gap-6 px-4 py-8 sm:px-5 lg:grid-cols-3 lg:px-5">
          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">What is PAN Photo Resize?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              PAN Photo Resize helps prepare a photo for PAN application upload using Protean/NSDL or UTIITSL-style presets. Requirements can change, so verify the current portal instructions before upload.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">How to resize a PAN photo</h2>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>1. Select Protean or UTIITSL.</li>
              <li>2. Upload a clear face photo.</li>
              <li>3. Drag the photo to position your face inside the frame.</li>
              <li>4. Scroll to zoom if needed.</li>
              <li>5. Download the ready JPG and verify the portal instructions before upload.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">Before uploading your PAN photo</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>Use a recent clear colour photo.</li>
              <li>Keep face centered and visible.</li>
              <li>Prefer a white or light background.</li>
              <li>Do not use blurred, heavily filtered, or cropped-out face photos.</li>
              <li>Check the exact portal upload screen before submitting.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto w-full max-w-[1160px] px-4 py-8 sm:px-5 lg:px-5">
          <h2 className="text-xl font-semibold tracking-normal text-[#171717]">Related tools</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
