import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ErrorStateProps = {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = "The content could not be loaded. Please try again.",
  retryLabel = "Retry",
  onRetry,
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-none">
      <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-destructive ring-1 ring-destructive/20">
            <CircleAlert className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-foreground">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry} className="min-h-11 w-full sm:w-auto">
            {retryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
