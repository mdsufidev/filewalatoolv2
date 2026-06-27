import { SectionHeading } from "@/components/common/SectionHeading";
import { Card, CardContent } from "@/components/ui/card";
import { trustItems } from "@/data/tools";

export function TrustSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8" aria-labelledby="why-choose">
      <SectionHeading
        title="Why choose FileWalaTool"
        description="Reliable file utilities with a practical, privacy-aware experience."
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {trustItems.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title} className="border-[#E5E7EB] bg-white shadow-none">
              <CardContent className="space-y-4 border-t-2 border-primary p-5">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-[#171717]">{item.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
