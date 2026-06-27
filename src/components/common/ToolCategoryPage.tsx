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

export function ToolCategoryPage({ category }: ToolCategoryPageProps) {
  const CategoryIcon = category.icon;

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
    </div>
  );
}
