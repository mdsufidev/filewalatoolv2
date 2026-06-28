import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, ShieldCheck, LockKeyhole, Server, Cookie, ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, metadataForPath } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/privacy");

const sections = [
  {
    title: "What we collect",
    icon: FileText,
    items: [
      "Files you upload to use a tool are processed to complete the requested action.",
      "If you contact us, we may collect your name, email address, and message content.",
      "We may collect basic technical data such as browser type, device, and page interactions to keep the site working.",
    ],
  },
  {
    title: "How we use data",
    icon: ShieldCheck,
    items: [
      "To run the requested tool and return your output file or result.",
      "To respond to support requests, bug reports, and feature requests.",
      "To improve performance, reliability, security, and usability.",
    ],
  },
  {
    title: "File handling",
    icon: LockKeyhole,
    items: [
      "Many FileWalaTool tools are designed to work directly in your browser.",
      "When a tool needs server-side processing, we only use the file for that operation.",
      "We do not sell your files or use them for advertising purposes.",
    ],
  },
  {
    title: "Cookies and analytics",
    icon: Cookie,
    items: [
      "We may use limited cookies or similar technologies for essential site behavior, theme preferences, or basic analytics.",
      "If analytics or embedded services are used, they are intended to help us understand site usage and maintain the product.",
    ],
  },
  {
    title: "Retention and deletion",
    icon: Server,
    items: [
      "Files are not intended to be stored permanently as part of normal tool usage.",
      "Support messages or account-related records may be retained as needed for operations and legal obligations.",
      "If you want us to remove a message or record we control, contact us at the address below.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-[#FAFAFA]">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy" },
          ]),
        ]}
      />
      <section className="mx-auto w-full max-w-5xl px-4 pb-12 pt-3 sm:px-5 lg:px-8">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">Privacy Policy</span>
        </nav>

        <div className="mt-7 max-w-3xl">
          <Badge variant="outline" className="border-primary/25 bg-white text-primary">
            FileWalaTool Legal
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-[#171717] sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            This policy explains how FileWalaTool handles data when you use our browser-based image, PDF, conversion,
            and document tools.
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
                <h2 className="text-lg font-semibold text-[#171717]">Contact</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  For privacy questions or removal requests, contact us through the support page.
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
