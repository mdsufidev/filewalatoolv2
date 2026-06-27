import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

import { ToolSearch } from "@/components/home/ToolSearch";
import { Badge } from "@/components/ui/badge";
import { quickLinks } from "@/data/tools";

export function HeroSection() {
  return (
    <section className="border-b bg-white">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
          <Badge variant="outline" className="border-primary/25 bg-[#FFF1F2] text-primary">
            Free Online File Tools
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal text-[#171717] sm:text-5xl">
            Make every file <span className="text-primary">ready</span> in minutes.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Resize, compress, convert, and organize your images and PDFs with simple browser-based tools.
          </p>
          <ToolSearch />
          <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
            {quickLinks.map((tool) => (
              <Link
                key={tool.name}
                href={tool.href}
                className="inline-flex min-h-11 items-center rounded-full border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {tool.name}
              </Link>
            ))}
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            No signup required &middot; Fast tools &middot; Private file processing
          </p>
        </div>
        <div className="hidden justify-center lg:flex" aria-hidden="true">
          <div className="relative h-72 w-72">
            <div className="absolute inset-6 rounded-3xl border border-primary/10 bg-[#FFF1F2]" />
            <div className="absolute left-10 top-12 flex size-28 items-center justify-center rounded-2xl border border-primary/20 bg-white text-primary shadow-sm">
              <FileText className="size-14" />
            </div>
            <div className="absolute bottom-16 right-8 flex size-32 items-center justify-center rounded-full bg-primary text-white shadow-sm">
              <ArrowRight className="size-16" />
            </div>
            <div className="absolute bottom-12 left-14 h-3 w-28 rounded-full bg-[#171717]" />
          </div>
        </div>
      </div>
    </section>
  );
}
