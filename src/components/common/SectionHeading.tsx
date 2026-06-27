import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl space-y-2", className)}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{title}</h2>
      {description ? <p className="text-sm leading-6 text-muted-foreground sm:text-base">{description}</p> : null}
    </div>
  );
}
