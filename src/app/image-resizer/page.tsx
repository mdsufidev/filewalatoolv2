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
  Minimize2,
  RotateCw,
  SlidersHorizontal,
  UploadCloud,
  Zap,
} from "lucide-react";

import { ImageResizerTool } from "@/components/tools/ImageResizerTool";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { breadcrumbJsonLd, metadataForPath, webApplicationJsonLd } from "@/lib/seo";
import type { Tool } from "@/types/tool";

export const metadata: Metadata = metadataForPath("/image-resizer");

type Step = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const steps: Step[] = [
  {
    title: "Upload your image",
    description: "Choose the JPG, PNG, or WebP file you want to resize.",
    icon: UploadCloud,
  },
  {
    title: "Enter width and height",
    description: "Set exact dimensions or choose a popular preset.",
    icon: SlidersHorizontal,
  },
  {
    title: "Download the resized file",
    description: "Save the optimized image to your device.",
    icon: Download,
  },
];

const faqs = [
  {
    question: "Which image formats can I resize?",
    answer:
      "FileWalaTool supports JPG, PNG, and WebP images up to 25 MB. You can keep the original format or export the resized image as JPG, PNG, or WebP.",
  },
  {
    question: "Will resizing an image reduce its quality?",
    answer:
      "Making an image smaller usually keeps it looking clear at its intended display size. Enlarging a small image can reveal blur or pixelation because resizing cannot create missing detail. For JPG and WebP output, use the quality control to balance clarity and file size.",
  },
  {
    question: "How do I resize an image without stretching it?",
    answer:
      "Leave Keep aspect ratio enabled. When you change the width or height, FileWalaTool calculates the other dimension from the image's original proportions, helping prevent a squeezed or stretched result.",
  },
  {
    question: "Are my uploaded images private?",
    answer:
      "Yes. The Image Resizer reads and processes your image locally in your browser using your device. The image is not uploaded to FileWalaTool's server, and the temporary browser preview is cleared when you remove the image or leave the page.",
  },
];

const relatedTools: Tool[] = [
  {
    name: "Compress Image",
    description: "Reduce image file size.",
    href: "/compress-image",
    icon: Minimize2,
  },
  {
    name: "KB Resizer",
    description: "Resize images to target KB.",
    href: "/kb-resizer",
    icon: FileImage,
  },
  {
    name: "Crop Image",
    description: "Crop photos precisely.",
    href: "/crop-image",
    icon: Crop,
  },
  {
    name: "JPG to PNG",
    description: "Convert JPG into PNG.",
    href: "/jpg-to-png",
    icon: RotateCw,
  },
  {
    name: "PNG to JPG",
    description: "Convert PNG into JPG.",
    href: "/png-to-jpg",
    icon: ImageIcon,
  },
  {
    name: "Passport Photo Maker",
    description: "Prepare official photos.",
    href: "/passport-photo",
    icon: BadgeCheck,
  },
];

export default function ImageResizerPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Image Tools", path: "/image-tools" },
            { name: "Image Resizer", path: "/image-resizer" },
          ]),
          webApplicationJsonLd({
            name: "Image Resizer Online",
            description:
              "Resize JPG, PNG, and WebP images online by setting exact width and height or choosing common presets.",
            path: "/image-resizer",
            applicationCategory: "MultimediaApplication",
          }),
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          },
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
            href="/#image-tools"
            className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Image Tools
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">Image Resizer</span>
        </nav>

        <div className="mt-2.5">
          <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">Resize Image</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Upload an image, set your dimensions, and download the result.
          </p>
        </div>

        <ImageResizerTool />
      </section>

      <section className="border-y border-primary/10 bg-[#FFF1F2]">
        <div className="mx-auto grid w-full max-w-[1240px] gap-6 px-4 py-10 sm:px-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
          <div className="max-w-3xl">
            <Badge variant="outline" className="border-primary/25 bg-white text-primary">
              Image Tool
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal text-[#171717] sm:text-4xl">
              Resize images <span className="text-primary">online</span>
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Change image dimensions for websites, forms, documents, and social media in a few simple steps.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              No signup required · Fast browser-based tool · Private file handling
            </p>
          </div>

          <Card className="border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                  <Zap className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#171717]">Built for quick resizing</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Choose a preset, set exact pixels, and prepare images for common online requirements.
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
              How to resize an image
            </h2>
            <p className="text-sm leading-6 text-muted-foreground sm:text-base">
              A simple flow for preparing images at the exact size you need.
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
          <div className="mt-8 max-w-4xl space-y-5 text-sm leading-7 text-muted-foreground sm:text-base">
            <p>
              Select a JPG, PNG, or WebP image up to 25 MB. FileWalaTool reads its current pixel dimensions and shows
              a preview, giving you a useful reference before you make any changes.
            </p>
            <ol className="grid gap-3">
              <li><strong className="text-[#171717]">1. Choose the target size.</strong> Enter an exact width and height in pixels, resize by percentage, or select a preset for an Instagram post, YouTube thumbnail, passport photo, website banner, or HD image.</li>
              <li><strong className="text-[#171717]">2. Protect the proportions.</strong> Keep the aspect-ratio option enabled when you want the tool to calculate the matching dimension automatically. Enable “Do not enlarge” if you want to avoid scaling a smaller source beyond its original size.</li>
              <li><strong className="text-[#171717]">3. Select an output format.</strong> Keep the source format or choose JPG, PNG, or WebP. JPG and WebP also include a quality setting for controlling the trade-off between visual detail and file size.</li>
              <li><strong className="text-[#171717]">4. Resize and review.</strong> Select Resize Image, compare the before and after previews, and check the output dimensions, format, and size shown below the preview.</li>
              <li><strong className="text-[#171717]">5. Download the result.</strong> Save the resized image to your device. If it needs adjustment, change the settings and create another version.</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="border-t border-primary/10 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
              Why image resizing matters in everyday digital work
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
              <p>
                Image dimensions affect how quickly a page loads, how neatly a photo fits into a form, and how clearly
                a graphic appears on different screens. A large camera photo may be unnecessary for an online profile,
                while a banner or thumbnail often needs an exact width and height. Resizing the image before uploading
                it can make websites faster, emails lighter, documents easier to share, and social posts more consistent.
              </p>
              <p>
                Pixel dimensions and file size are related but not identical. Resizing changes the number of pixels;
                format and quality settings also influence storage size. For the best result, begin with the dimensions
                required by the website or document, preserve the aspect ratio, and then adjust output quality only if
                you need a smaller file. Always check the downloaded image at the size where it will actually be used.
              </p>
            </div>

            <h2 className="mt-10 text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
              Benefits of using FileWalaTool Image Resizer
            </h2>
            <ul className="mt-5 grid gap-3 text-sm leading-7 text-muted-foreground sm:text-base md:grid-cols-2">
              <li className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4"><strong className="text-[#171717]">Private browser processing:</strong> resizing happens locally on your device. This image tool does not send your file to our server.</li>
              <li className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4"><strong className="text-[#171717]">Fast workflow:</strong> preview, resize, compare, and download without waiting for an upload or server queue.</li>
              <li className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4"><strong className="text-[#171717]">No signup:</strong> use the online image resizer immediately without creating an account or providing an email address.</li>
              <li className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-4"><strong className="text-[#171717]">Useful controls:</strong> work in pixels or percentages, preserve proportions, prevent enlargement, use presets, and choose the output format.</li>
            </ul>

            <h2 className="mt-10 text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="mt-5 divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB] bg-white px-5">
              {faqs.map((faq) => (
                <div key={faq.question} className="py-5">
                  <h3 className="text-base font-semibold text-[#171717]">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
                Related image tools
              </h2>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                Continue with other image utilities from FileWalaTool.
              </p>
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
