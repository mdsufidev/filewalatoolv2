import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function BrandIntro() {
  return (
    <section className="bg-white" aria-labelledby="about-filewalatool">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            What is FileWalaTool?
          </p>
          <h2 id="about-filewalatool" className="mt-3 text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
            About FileWalaTool
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            FileWalaTool is a free online platform for image tools, PDF tools, file conversion, and document photo
            resizing.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            FileWalaTool, also known as FileWala, provides free online tools to compress images, resize photos, merge
            PDFs, convert files, and prepare document images for online uploads.
          </p>
          <Link
            href="/about"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            About FileWalaTool
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
