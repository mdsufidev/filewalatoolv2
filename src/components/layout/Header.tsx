"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { DesktopNavDropdown } from "@/components/layout/DesktopNavDropdown";
import { MobileNav } from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { navigationCategories } from "@/data/navigation";
import { cn } from "@/lib/utils";

const quickNavLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const pathname = usePathname();

  const handleDropdownToggle = (id: string) => {
    setActiveDropdown((current) => (current === id ? null : id));
  };

  const handleDropdownClose = () => {
    setActiveDropdown(null);
  };

  // Close dropdowns on route change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveDropdown(null);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="FileWalaTool home"
        >
          <Image
            src="/logo.png"
            alt="FileWalaTool"
            width={190}
            height={104}
            priority
            className="h-10 w-auto object-contain sm:h-11"
          />
        </Link>

        {/* Desktop navigation */}
        <nav className="ml-4 hidden shrink-0 lg:block xl:ml-5" aria-label="Primary desktop navigation">
          <ul className="flex items-center gap-1.5 xl:gap-2">
          {navigationCategories.map((category) => {
            // Map category label to id
            const categoryIdMap: Record<string, string> = {
              "Image Tools": "image-tools",
              "PDF Tools": "pdf-tools",
              "Convert": "convert",
              "Document Tools": "document-tools",
            };
            const categoryId = categoryIdMap[category.label] ?? category.label.toLowerCase().replace(/\s+/g, "-");

            return (
              <DesktopNavDropdown
                key={category.label}
                id={categoryId}
                label={category.label}
                category={category}
                activeDropdown={activeDropdown}
                onDropdownToggle={handleDropdownToggle}
                onDropdownClose={handleDropdownClose}
              />
            );
          })}
          </ul>
        </nav>

        <div className="ml-auto hidden items-center gap-1.5 lg:flex">
          <div className="mx-3 h-6 w-px bg-[#E5E7EB] xl:mx-4" aria-hidden="true" />
          {quickNavLinks.map((link) => {
            const isActive =
              link.href === "/about"
                ? pathname === "/about"
                : pathname === "/contact" || pathname === "/contact-us";

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex h-10 items-center rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive
                    ? "bg-[#FFF1F2] font-medium text-[#B91C1C]"
                    : "font-medium text-[#4B5563] hover:bg-[#FFF1F2] hover:text-[#B91C1C]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Button type="button" variant="outline" className="min-h-11 px-3" aria-label="Select language">
            <Globe className="size-4" />
            EN
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5 lg:hidden">
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
