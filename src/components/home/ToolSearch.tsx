import { ArrowRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ToolSearch() {
  return (
    <form className="relative mx-auto mt-7 flex max-w-2xl rounded-xl border bg-white p-1 shadow-sm">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label="Search file tools"
        placeholder="Search for a tool, such as Image Resizer"
        className="h-12 min-w-0 flex-1 border-0 pl-10 pr-2 text-base shadow-none focus-visible:ring-0"
      />
      <Button type="submit" className="min-h-11 min-w-11 bg-primary hover:bg-[#B91C1C]" aria-label="Search tools">
        <span className="hidden sm:inline">Search</span>
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
