"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { type NavigationCategory } from "@/data/navigation";
import { cn } from "@/lib/utils";

type DesktopNavDropdownProps = {
  id: string;
  label: string;
  category: NavigationCategory;
  activeDropdown: string | null;
  onDropdownToggle: (id: string) => void;
  onDropdownClose: () => void;
};

export function DesktopNavDropdown({
  id,
  label,
  category,
  activeDropdown,
  onDropdownToggle,
  onDropdownClose,
}: DesktopNavDropdownProps) {
  const wrapperRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isOpen = activeDropdown === id;
  const FeaturedIcon = category.featured.icon;
  const categoryPageHrefMap: Record<string, string> = {
    "image-tools": "/image-tools",
    "pdf-tools": "/pdf-tools",
    convert: "/convert-tools",
    "document-tools": "/document-tools",
  };
  const categoryPageHref = categoryPageHrefMap[id] ?? "/tools";
  const browseLabel = label.endsWith("Tools") ? label : `${label} Tools`;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        onDropdownClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onDropdownClose]);

  // Close on Escape, return focus to trigger
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDropdownClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onDropdownClose]);

  return (
    <li ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={`${id}-menu`}
        onClick={() => onDropdownToggle(id)}
        className={cn(
          "inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          isOpen
            ? "bg-[#FFF1F2] text-[#B91C1C]"
            : "text-muted-foreground hover:bg-[#FFF1F2] hover:text-[#B91C1C]",
        )}
      >
        {label}
        <ChevronDown
          className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
      <div
        id={`${id}-menu`}
        className="absolute left-0 top-full z-50 mt-2 w-[680px] origin-top-left rounded-2xl border border-[#E5E7EB] bg-white shadow-lg transition-all duration-200"
      >
        {/* Header */}
        <div className="border-b border-[#E5E7EB] px-[18px] py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-[#171717]">{label}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{category.featured.description}</p>
            </div>
            <Link
              href="/tools"
              onClick={onDropdownClose}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              View all tools
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Highlighted featured tool */}
        <div className="px-[18px] pt-3">
          <Link
            href={category.featured.href}
            onClick={onDropdownClose}
            className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <FeaturedIcon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#171717] group-hover:text-[#B91C1C]">
                {category.featured.name}
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                {category.featured.description}
              </span>
            </span>
            <ArrowRight
              className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Tool list grid */}
        <div className="grid grid-cols-2 gap-3 px-[18px] pb-3 pt-3">
          {category.tools.map((tool) => {
            const ToolIcon = tool.icon;

            return (
              <Link
                key={tool.name}
                href={tool.href}
                onClick={onDropdownClose}
                className="group flex min-h-[62px] items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#FFF1F2] text-primary transition-colors group-hover:bg-white">
                  <ToolIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#171717] group-hover:text-[#B91C1C]">
                    {tool.name}
                  </span>
                  <span className="line-clamp-1 block text-xs text-muted-foreground">
                    {tool.description}
                  </span>
                </span>
                <ArrowRight
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>

        {/* Footer link */}
        <div className="border-t border-[#E5E7EB] px-[18px] py-3">
          <Link
            href={categoryPageHref}
            onClick={onDropdownClose}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Browse all {browseLabel.toLowerCase()}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
      ) : null}
    </li>
  );
}
