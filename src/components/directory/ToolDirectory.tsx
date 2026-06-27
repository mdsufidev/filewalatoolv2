"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileSearch2, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toolCategories } from "@/data/tools";
import { navigationCategories } from "@/data/navigation";
import { cn } from "@/lib/utils";
import type { Tool } from "@/types/tool";

type DirectoryCategoryKey = "all" | "image-tools" | "pdf-tools" | "convert-tools" | "document-tools";

type DirectoryTool = Tool & {
  categoryLabel: string;
  categoryKey: Exclude<DirectoryCategoryKey, "all">;
  searchText: string;
};

type DirectoryCategory = {
  key: Exclude<DirectoryCategoryKey, "all">;
  label: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  count: number;
  tools: DirectoryTool[];
};

const categoryLabelMap: Record<Exclude<DirectoryCategoryKey, "all">, string> = {
  "image-tools": "Image Tools",
  "pdf-tools": "PDF Tools",
  "convert-tools": "Convert",
  "document-tools": "Document Tools",
};

function getCategoryKey(label: string): Exclude<DirectoryCategoryKey, "all"> {
  if (label === "Image Tools") return "image-tools";
  if (label === "PDF Tools") return "pdf-tools";
  if (label === "Convert" || label === "Convert Tools") return "convert-tools";
  return "document-tools";
}

function useDebouncedValue<T>(value: T, delay = 180) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}

function buildDirectoryCategories() {
  const counts = new Map<string, number>();
  const toolsByLabel = new Map<string, DirectoryTool[]>();

  navigationCategories.forEach((category) => {
    const key = getCategoryKey(category.label);
    const categoryLabel = categoryLabelMap[key];
    const items = [category.featured, ...category.tools].map((tool) => {
      const searchText = [tool.name, tool.description, category.label, categoryLabel].join(" ").toLowerCase();

      return {
        ...tool,
        categoryLabel,
        categoryKey: key,
        searchText,
      };
    });

    toolsByLabel.set(category.label, items);
    counts.set(category.label, items.length);
  });

  return toolCategories.map((category) => {
    const key = getCategoryKey(category.title === "Convert Tools" ? "Convert" : category.title);
    const navigationLabel = category.title === "Convert Tools" ? "Convert" : category.title;
    const tools = toolsByLabel.get(navigationLabel) ?? [];

    return {
      key,
      label: navigationLabel,
      title: navigationLabel,
      description: category.description,
      href: category.href,
      icon: category.icon,
      count: counts.get(navigationLabel) ?? tools.length,
      tools,
    };
  });
}

export function ToolDirectory() {
  const categories = useMemo(() => buildDirectoryCategories(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DirectoryCategoryKey>("all");
  const debouncedQuery = useDebouncedValue(searchQuery.trim().toLowerCase(), 180);

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => {
        if (selectedCategory !== "all" && category.key !== selectedCategory) {
          return null;
        }

        const tools = category.tools.filter((tool) => tool.searchText.includes(debouncedQuery));
        return tools.length ? { ...category, tools } : null;
      })
      .filter((category): category is DirectoryCategory => category !== null);
  }, [categories, debouncedQuery, selectedCategory]);

  const totalCount = useMemo(() => categories.reduce((sum, category) => sum + category.count, 0), [categories]);
  const filteredCount = useMemo(
    () => filteredCategories.reduce((sum, category) => sum + category.tools.length, 0),
    [filteredCategories],
  );

  const allCategoryButtons = [
    { key: "all" as const, label: "All tools", count: totalCount },
    ...categories.map((category) => ({ key: category.key, label: category.label, count: category.count })),
  ];

  const scrollToSection = (categoryKey: DirectoryCategoryKey) => {
    if (typeof window === "undefined") return;

    if (categoryKey === "all") {
      document.getElementById("tools-directory-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    document.getElementById(categoryKey)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-5">
      {/* ── Hero Card ── */}
      <section
        id="tools-directory-top"
        className="rounded-2xl border border-[#E5E7EB] bg-white px-5 py-[22px] shadow-none sm:px-6 sm:py-[26px]"
      >
        <div className="flex flex-col gap-4">
          {/* Eyebrow + Tool count badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">All tools</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-1 text-xs font-medium text-muted-foreground">
              {totalCount} tools available
            </span>
          </div>

          {/* Heading + Description + Trust points */}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">
              Explore all FileWalaTool tools
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Browse image, PDF, conversion, and document tools in one place. Search by task or choose a category to get started.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#374151]">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                Free to use
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                No signup required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                Browser-based processing
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="w-full max-w-[760px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                }}
                aria-label="Search tools"
                placeholder='Search tools — resize image, merge PDF, passport photo...'
                className="h-12 rounded-xl border-[#E5E7EB] bg-white pl-10 pr-11 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-3 focus-visible:ring-primary/15"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#FFF1F2] hover:text-[#B91C1C]"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {debouncedQuery
                ? `Showing ${filteredCount} result${filteredCount === 1 ? "" : "s"} for "${searchQuery.trim()}"`
                : `Showing ${filteredCount} tools`}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {allCategoryButtons.map((category) => {
              const active = selectedCategory === category.key;

              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category.key);
                    scrollToSection(category.key);
                  }}
                  className={cn(
                    "inline-flex h-[42px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-[#E5E7EB] bg-white text-[#171717] hover:border-primary/30 hover:bg-[#FFF1F2]",
                  )}
                >
                  <span>{category.label}</span>
                  <span className={cn("text-xs", active ? "text-white/80" : "text-muted-foreground")}>({category.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Tool Results (full width, no sidebar) ── */}
      <div className="grid grid-cols-[minmax(0,1fr)]">
        <main className="min-w-0 space-y-9">
          {filteredCategories.length ? (
            filteredCategories.map((category) => {
              const CategoryIcon = category.icon;

              return (
                <section key={category.key} id={category.key} className="scroll-mt-24">
                  {/* Category Section Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary ring-1 ring-primary/10">
                        <CategoryIcon className="size-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-[26px] font-semibold leading-tight tracking-normal text-[#171717] sm:text-[30px]">
                          {category.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-[15px]">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <span className="mt-1 shrink-0 rounded-full border border-[#E5E7EB] bg-[#FAFAFA] px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {category.tools.length} tools
                    </span>
                  </div>

                  {/* Tool Cards Grid */}
                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {category.tools.map((tool) => {
                      const ToolIcon = tool.icon;

                      return (
                        <Link
                          key={tool.name}
                          href={tool.href}
                          className="group flex min-h-[88px] items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                            <ToolIcon className="size-5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[#171717] group-hover:text-[#B91C1C]">
                              {tool.name}
                            </span>
                            <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">{tool.description}</span>
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })
          ) : (
            /* ── Empty State ── */
            <div className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FFF1F2] text-primary">
                <FileSearch2 className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-normal text-[#171717]">No matching tools found</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Try searching for &ldquo;PDF&rdquo;, &ldquo;image&rdquo;, &ldquo;resize&rdquo;, or &ldquo;convert&rdquo;.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-5 min-h-11 border-[#E5E7EB] bg-white px-4 text-sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                View all tools
              </Button>
            </div>
          )}

          {/* ── Request a Tool Panel ── */}
          <section className="rounded-2xl border border-primary/10 bg-[#FFF7F8] px-[22px] py-[22px] sm:px-[26px] sm:py-[26px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[#171717]">Can&rsquo;t find the tool you need?</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Tell us what you want to do with your file, and we may add it to FileWalaTool.
                </p>
              </div>
              <Button
                render={<Link href="/contact?topic=request-tool" />}
                nativeButton={false}
                className="min-h-11 shrink-0 bg-primary hover:bg-[#B91C1C]"
              >
                Request a tool
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
