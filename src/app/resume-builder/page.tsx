import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Crop,
  FileScan,
  ImageIcon,
  Maximize2,
  Minimize2,
  PenLine,
  ScanLine,
} from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { ResumeBuilderTool } from "@/components/tools/ResumeBuilderTool";
import { breadcrumbJsonLd, metadataForPath, webApplicationJsonLd } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/resume-builder");

const relatedTools = [
  { name: "Passport Photo Maker", href: "/passport-photo", icon: ImageIcon },
  { name: "Signature Resize", href: "/signature-resize", icon: PenLine },
  { name: "PAN Photo Resize", href: "/pan-photo-resize", icon: Crop },
  { name: "Image to 20KB", href: "/image-to-20kb", icon: Minimize2 },
  { name: "Image to 50KB", href: "/image-to-50kb", icon: Maximize2 },
  { name: "Crop Image", href: "/crop-image", icon: ScanLine },
  { name: "Document Scanner", href: "/document-tools", icon: FileScan },
];

export default function ResumeBuilderPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Document Tools", path: "/document-tools" },
            { name: "Resume Builder", path: "/resume-builder" },
          ]),
          webApplicationJsonLd({
            name: "Resume Builder Online",
            description:
              "Build a clean resume in your browser with editable sections, live preview, template options, and print-friendly export.",
            path: "/resume-builder",
            applicationCategory: "BusinessApplication",
          }),
        ]}
      />

      <section className="mx-auto w-full max-w-[1160px] px-4 pb-6 pt-3 sm:px-5 lg:px-5 lg:pt-3.5">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
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
          <span className="font-medium text-[#171717]">Resume Builder</span>
        </nav>

        <div className="mt-2.5">
          <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">Resume Builder Online</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
            Build a clean resume in your browser with editable sections, live preview, template switching, and a print-friendly export.
          </p>
        </div>

        <ResumeBuilderTool />
      </section>

      <section className="border-t border-[#E5E7EB] bg-white">
        <div className="mx-auto grid w-full max-w-[1160px] gap-6 px-4 py-8 sm:px-5 lg:grid-cols-3 lg:px-5">
          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">What this resume builder does</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Resume Builder helps create a clean resume with editable sections, template switching, live preview, and browser print or PDF export.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">How to build a resume online</h2>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>1. Pick a template that matches the style you want.</li>
              <li>2. Fill in your profile, experience, education, and skills.</li>
              <li>3. Check the live preview as you edit.</li>
              <li>4. Print or save the resume as PDF from your browser.</li>
              <li>5. Review the final file before sending it anywhere.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-normal text-[#171717]">Before sending your resume</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>Use short, concrete bullets that show results.</li>
              <li>Keep contact details current and easy to read.</li>
              <li>Match the headline to the role you are applying for.</li>
              <li>Avoid crowded formatting if the role uses ATS screening.</li>
              <li>Verify the final PDF on your own device before sharing it.</li>
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
