import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BottomCTA() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#171717] p-6 text-white shadow-sm sm:p-8">
        <div className="absolute right-6 top-6 h-20 w-20 rounded-full border border-primary/40" />
        <div className="absolute -right-8 bottom-4 h-16 w-32 rotate-[-10deg] rounded-full bg-primary/20" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:flex">
              <FileText className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold tracking-normal">Find the right tool for your file.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
                Explore image, PDF, conversion, and document tools in one place.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:flex">
            <Button render={<Link href="/tools" />} nativeButton={false} className="min-h-11 bg-primary hover:bg-[#B91C1C]">
              Browse all tools
              <ArrowRight className="size-4" />
            </Button>
            <Button
              render={<Link href="/pdf-tools" />}
              nativeButton={false}
              variant="outline"
              className="min-h-11 border-white/30 bg-transparent text-white hover:bg-white hover:text-[#171717]"
            >
              Explore PDF tools
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
