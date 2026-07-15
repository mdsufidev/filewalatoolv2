import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, webApplicationJsonLd } from "@/lib/seo";
import { ToolCard } from "@/components/common/ToolCard";
import type { ToolCategory } from "@/types/tool";

type ToolCategoryPageProps = {
  category: ToolCategory;
};

const categoryGuides: Record<string, { intro: string; points: string[]; tip: string }> = {
  "/image-tools": {
    intro: "Digital images rarely arrive in exactly the form a website, application form, email, or social platform needs. FileWalaTool image tools help you change pixel dimensions, reduce file size, crop unwanted areas, and convert between common formats. Each utility focuses on one clear task, so you can choose the right workflow without installing a desktop editor.",
    points: [
      "Resize when a form or layout requires exact width and height dimensions.",
      "Compress when the dimensions are acceptable but the file exceeds an upload limit.",
      "Crop when you need to improve framing or match a required aspect ratio.",
      "Convert when a service accepts JPG, PNG, or WebP but not your current format.",
    ],
    tip: "Keep an untouched copy of the original image. For photographs, JPG or WebP often produces smaller files; PNG is useful when transparency or crisp graphic edges matter. Always inspect the downloaded result at its intended display size.",
  },
  "/pdf-tools": {
    intro: "PDF files are widely used for reports, applications, scans, invoices, and records because their layout stays consistent across devices. Everyday document work still requires practical changes such as combining files, extracting selected pages, correcting rotation, removing unnecessary pages, reducing size, or adding a watermark. This collection groups those focused PDF workflows in one place.",
    points: [
      "Merge related PDFs into one ordered document before sharing or archiving.",
      "Split or delete pages when only part of a document is relevant.",
      "Rotate scanned pages so recipients can read them without manual adjustment.",
      "Compress large PDFs when email or portal upload limits are the main concern.",
    ],
    tip: "Review the page order and output file before sending it. Compression and conversion can affect complex layouts, so important forms, signatures, fine print, and scanned text should be checked at normal zoom after processing.",
  },
  "/convert-tools": {
    intro: "File conversion helps make content compatible with the software, website, or recipient that needs it. A document may need to become a PDF for consistent sharing, images may need to be collected into one PDF, or an image may need a different format for transparency, compatibility, or file size. These converters provide direct workflows for common format changes.",
    points: [
      "Use Word to PDF when you want a shareable document with a stable layout.",
      "Use Image to PDF to arrange scans, receipts, or photographs into one file.",
      "Convert JPG and PNG according to whether small photo size or transparency matters.",
      "Export PDF pages as images when individual pages are needed in visual form.",
    ],
    tip: "Conversion changes the file container and may also change visual properties. PNG transparency cannot be preserved in JPG, and editable Word content becomes fixed in a PDF. Check the format required by the destination before downloading your final version.",
  },
  "/document-tools": {
    intro: "Online forms often have strict requirements for photographs, signatures, file dimensions, and upload size. FileWalaTool document tools are designed to help prepare these everyday assets with clearer controls and previews. You can create passport-style photos, resize signature images, prepare PAN application photos, crop supporting images, or build a clean resume.",
    points: [
      "Start with a clear, well-lit source image rather than a screenshot or compressed copy.",
      "Choose the preset that matches the form, then compare it with the portal's current instructions.",
      "Preserve proportions unless the official specification explicitly requires a different ratio.",
      "Review dimensions, file type, visual clarity, and file size before final submission.",
    ],
    tip: "FileWalaTool provides preparation controls, but it is not affiliated with government portals and cannot guarantee acceptance. Requirements can change, so the official application website remains the final authority for dimensions, background, format, and size.",
  },
};

export function ToolCategoryPage({ category }: ToolCategoryPageProps) {
  const CategoryIcon = category.icon;
  const guide = categoryGuides[category.href];

  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: category.title, path: category.href },
          ]),
          webApplicationJsonLd({
            name: `${category.title} - FileWalaTool`,
            description: category.description,
            path: category.href,
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
          <span className="font-medium text-[#171717]">{category.title}</span>
        </nav>

        <div className="mt-2.5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/25 bg-white text-primary">
              Tool category
            </Badge>
            <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
              {category.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {category.description}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {category.tools.length} tools available · Open the one you need.
            </p>
          </div>

          <Card className="border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                  <CategoryIcon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-[#171717]">{category.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Browse the full set of tools in this category.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-primary/10 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
                All {category.title}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                Choose a tool to start working right away.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {category.tools.map((tool) => (
              <ToolCard key={tool.name} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {guide ? (
        <section className="border-t border-primary/10 bg-[#FFF1F2]">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
                Choosing the right {category.title.toLowerCase()}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">{guide.intro}</p>
              <h3 className="mt-7 text-lg font-semibold text-[#171717]">Common tasks and when to use them</h3>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2 sm:text-base">
                {guide.points.map((point) => (
                  <li key={point} className="rounded-xl border border-primary/10 bg-white p-4">
                    <span className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{point}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-7 text-lg font-semibold text-[#171717]">Before you download</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">{guide.tip}</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                No account is required to open these tools. Many workflows run in the browser for a fast,
                privacy-aware experience; consult the individual tool page and our Privacy Policy for details about
                the specific file-handling method used by each feature.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
