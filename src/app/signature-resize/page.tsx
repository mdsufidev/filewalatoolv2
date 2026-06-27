import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Crop, FileImage, FileScan, ImageIcon, Minimize2, ScanLine } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { SignatureResizeTool } from "@/components/tools/SignatureResizeTool";
import { breadcrumbJsonLd, metadataForPath, webApplicationJsonLd } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/signature-resize");

const relatedTools = [
  { name: "PAN Photo Resize", href: "/pan-photo-resize", icon: ImageIcon },
  { name: "Image to 20KB", href: "/image-to-20kb", icon: Minimize2 },
  { name: "Image to 50KB", href: "/image-to-50kb", icon: FileImage },
  { name: "Crop Image", href: "/crop-image", icon: Crop },
  { name: "KB Resizer", href: "/kb-resizer", icon: ScanLine },
  { name: "Document Scanner", href: "/document-tools", icon: FileScan },
];

export default function SignatureResizePage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Document Tools", path: "/document-tools" },
            { name: "Signature Resize", path: "/signature-resize" },
          ]),
          webApplicationJsonLd({
            name: "Signature Resize Online",
            description:
              "Resize signature images for PAN application upload with JPG output, cleanup controls, DPI metadata, and file size validation.",
            path: "/signature-resize",
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
          <span className="font-medium text-[#171717]">Signature Resize</span>
        </nav>

        <div className="mt-2.5">
          <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
            PAN Signature Resize Online
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
            Prepare JPG signatures for Protean / NSDL and UTIITSL PAN application upload with provider presets, crop positioning, cleanup, DPI metadata, and file-size validation.
          </p>
        </div>

        <SignatureResizeTool />
      </section>

      <section className="border-t border-[#E5E7EB] bg-white">
        <div className="mx-auto grid w-full max-w-[1160px] gap-6 px-4 py-8 sm:px-5 lg:grid-cols-3 lg:px-5">
          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">What is Signature Resize?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Signature Resize helps crop and prepare a signature image for online application uploads. Always verify the current portal instructions before submitting the final JPG.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">
              How to resize your PAN signature
            </h2>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>1. Select Protean/NSDL or UTIITSL.</li>
              <li>2. Upload a clear signature image.</li>
              <li>3. Position the signature within the frame.</li>
              <li>4. Adjust cleanup only if needed.</li>
              <li>5. Download the JPG and verify final portal upload instructions.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">
              Before uploading your signature
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>Use a clear signature on plain white paper.</li>
              <li>Sign with black or dark-blue ink.</li>
              <li>Avoid shadows, ruled paper, borders, and fingers in the image.</li>
              <li>Keep enough space around the signature.</li>
              <li>Check final portal upload requirements before submission.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto w-full max-w-[1160px] px-4 py-8 sm:px-5 lg:px-5">
          <h2 className="text-xl font-semibold tracking-normal text-[#171717]">Related tools</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
