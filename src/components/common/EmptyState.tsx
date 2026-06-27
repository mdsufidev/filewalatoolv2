import type { LucideIcon } from "lucide-react";
import { FileX2, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "default" | "search";
};

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  variant = "default",
}: EmptyStateProps) {
  const Icon = icon ?? (variant === "search" ? SearchX : FileX2);

  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="max-w-sm space-y-1">
          <h3 className="text-base font-medium text-foreground">
            {title ?? (variant === "search" ? "No results found" : "Nothing here yet")}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {description ??
              (variant === "search"
                ? "Try adjusting the search term or clearing active filters."
                : "Helpful content will appear here when it is available.")}
          </p>
        </div>
        {actionLabel ? (
          <Button type="button" variant="outline" onClick={onAction} className="min-h-11">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
