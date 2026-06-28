import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight, FileCheck2, ShieldAlert, Ban, Sparkles, BookOpenText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, metadataForPath } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/terms");

const sections = [
  {
    title: "Using the service",
    icon: FileCheck2,
    items: [
      "Use FileWalaTool only for lawful purposes and in compliance with applicable rules.",
      "You are responsible for the files you upload, the content you generate, and how you use the output.",
      "Some tools may have practical limits such as file size, browser support, or format compatibility.",
    ],
  },
  {
    title: "Acceptable use",
    icon: Ban,
    items: [
      "Do not upload files or content you do not have the right to use.",
      "Do not attempt to disrupt, reverse engineer, or abuse the service.",
      "Do not use the site to distribute malware, spam, or harmful content.",
    ],
  },
  {
    title: "Service behavior",
    icon: Sparkles,
    items: [
      "We may update, improve, add, or remove tools and features over time.",
      "We may change file limits, supported formats, or processing methods when needed.",
      "Availability is provided on a best-effort basis and may vary by browser, device, or network conditions.",
    ],
  },
  {
    title: "Intellectual property",
    icon: BookOpenText,
    items: [
      "FileWalaTool branding, site design, and original content belong to us or our licensors.",
      "You keep rights to your own uploaded files and output content, subject to any rights you grant us to process them.",
    ],
  },
  {
    title: "Disclaimer and limits",
    icon: ShieldAlert,
    items: [
      "The service is provided as-is and as available.",
      "We do not guarantee that every file will be compatible, editable, or error-free.",
      "You should review important output before using it for official, legal, or commercial purposes.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Terms of Use", path: "/terms" },
          ]),
        ]}
      />
      <section className="mx-auto w-full max-w-5xl px-4 pb-12 pt-3 sm:px-5 lg:px-8">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">Terms of Use</span>
        </nav>

        <div className="mt-7 max-w-3xl">
          <Badge variant="outline" className="border-primary/25 bg-white text-primary">
            FileWalaTool Legal
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-[#171717] sm:text-5xl">
            Terms of Use
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            These terms apply when you use FileWalaTool’s image, PDF, conversion, and document tools.
          </p>
        </div>

        <div className="mt-8 grid gap-4">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <Card key={section.title} className="rounded-2xl border-[#E5E7EB] bg-white shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-[#171717]">{section.title}</h2>
                      <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-sm">
            <CardContent className="grid gap-4 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-[#171717]">Questions about these terms</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  If something in these terms needs clarification, reach out through the contact page.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Contact support
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
