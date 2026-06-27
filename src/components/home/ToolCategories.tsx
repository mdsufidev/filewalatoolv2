import { CategoryCard } from "@/components/common/CategoryCard";
import { SectionHeading } from "@/components/common/SectionHeading";
import { toolCategories } from "@/data/tools";

export function ToolCategories() {
  return (
    <section className="bg-white" aria-labelledby="tool-categories">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          title="Browse tools by category"
          description="Find the exact utility you need for images, PDFs, conversions, and form documents."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {toolCategories.map((category) => (
            <CategoryCard key={category.title} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}
