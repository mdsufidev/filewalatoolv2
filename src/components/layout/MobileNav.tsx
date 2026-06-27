"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navigationCategories } from "@/data/navigation";

const quickNavLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="min-h-11 min-w-11 lg:hidden"
              aria-label="Open navigation menu"
            />
        }
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(23rem,90vw)] overflow-y-auto p-0">
        <SheetHeader className="border-b p-4">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="FileWalaTool logo"
              width={190}
              height={104}
              className="h-10 w-auto object-contain"
            />
            <SheetTitle className="sr-only">FileWalaTool</SheetTitle>
          </div>
          <SheetDescription>Free, fast, and practical online file tools.</SheetDescription>
        </SheetHeader>
        <nav className="p-3" aria-label="Mobile navigation">
          <Accordion className="gap-1">
            {navigationCategories.map((category) => (
              <AccordionItem key={category.label} value={category.label} className="border-0">
                <AccordionTrigger className="min-h-11 px-3 text-[#171717] hover:bg-[#FFF1F2] hover:text-[#B91C1C] hover:no-underline">
                  {category.label}
                </AccordionTrigger>
                <AccordionContent className="pb-2 pl-2 pr-1">
                  <div className="grid gap-1">
                    {[category.featured, ...category.tools].map((tool) => {
                      const Icon = tool.icon;

                      return (
                        <Link
                          key={`${category.label}-${tool.name}`}
                          href={tool.href}
                          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{tool.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="mt-2 border-t border-[#E5E7EB] pt-2">
            {quickNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-[#171717] transition-colors hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
