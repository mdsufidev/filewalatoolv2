import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  action?: {
    label: string;
    icon?: ReactNode;
    href?: string;
  };
  className?: string;
};

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
  className,
}: PageHeaderProps) {
  const actionElement = action?.href
    ? action.href.startsWith("/")
      ? <Link href={action.href} />
      : <a href={action.href} />
    : undefined;

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {breadcrumb ? (
          <div className="text-sm text-muted-foreground">{breadcrumb}</div>
        ) : null}
        <div className="space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        <Button
          className="min-h-11 w-full sm:w-auto"
          render={actionElement}
          nativeButton={action.href ? false : undefined}
        >
          {action.href ? (
            <>
              {action.icon}
              {action.label}
            </>
          ) : (
            <>
              {action.icon}
              {action.label}
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}
