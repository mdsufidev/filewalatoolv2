import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { ToolDirectory } from "@/components/directory/ToolDirectory";
import { breadcrumbJsonLd, metadataForPath, webApplicationJsonLd } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/tools");

export default function ToolsPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "All Tools", path: "/tools" },
          ]),
          webApplicationJsonLd({
            name: "All FileWalaTool Tools",
            description: "Browse FileWalaTool image, PDF, conversion, and document tools in one place.",
            path: "/tools",
            applicationCategory: "UtilitiesApplication",
          }),
        ]}
      />
      <section className="mx-auto w-full max-w-[1160px] px-4 pb-4 pt-3 sm:px-5 lg:px-5 lg:pb-5 lg:pt-3.5">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link
            href="/"
            className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">All Tools</span>
        </nav>

        <div className="mt-3">
          <ToolDirectory />
        </div>
      </section>
    </div>
  );
}
