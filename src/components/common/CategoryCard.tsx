import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ToolCategory } from "@/types/tool";

type CategoryCardProps = {
  category: ToolCategory;
};

export function CategoryCard({ category }: CategoryCardProps) {
  const Icon = category.icon;
  const id = category.title.toLowerCase().replaceAll(" ", "-");

  return (
    <Card id={id} className="border-[#E5E7EB] bg-white shadow-sm">
      <CardHeader className="gap-4 sm:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary ring-1 ring-primary/10">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate text-[#171717]">{category.title}</CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{category.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {category.tools.map((tool) => {
            const ToolIcon = tool.icon;

            return (
              <Link
                key={tool.name}
                href={tool.href}
                className="group flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#171717] transition-colors hover:border-primary/20 hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <ToolIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{tool.name}</span>
                <ArrowRight
                  className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
        <Button
          render={<Link href={category.href} />}
          nativeButton={false}
          variant="ghost"
          className="mt-4 min-h-11 px-0 text-primary hover:bg-transparent hover:text-[#B91C1C]"
        >
          View all tools
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
