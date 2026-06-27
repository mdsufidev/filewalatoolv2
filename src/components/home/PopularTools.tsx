import { SectionHeading } from "@/components/common/SectionHeading";
import { ToolCard } from "@/components/common/ToolCard";
import { popularTools } from "@/data/tools";

export function PopularTools() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="popular-tools">
      <SectionHeading
        title="Popular file tools"
        description="Quick tools for your everyday image and PDF tasks."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {popularTools.map((tool) => (
          <ToolCard key={tool.name} tool={tool} />
        ))}
      </div>
    </section>
  );
}
