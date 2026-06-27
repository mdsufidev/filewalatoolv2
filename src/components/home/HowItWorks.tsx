import { SectionHeading } from "@/components/common/SectionHeading";
import { Download, SlidersHorizontal, Wrench } from "lucide-react";

const steps = [
  {
    title: "Choose a tool",
    description: "Select the file tool you need.",
    icon: Wrench,
  },
  {
    title: "Upload and adjust",
    description: "Upload your file and choose the settings.",
    icon: SlidersHorizontal,
  },
  {
    title: "Download your result",
    description: "Get your processed file in seconds.",
    icon: Download,
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#FFF1F2]" aria-labelledby="how-it-works">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeading
          title="Simple from upload to download"
          description="No complicated setup. Choose a tool and finish your task in a few steps."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
            <div key={step.title} className="relative rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
              {index < steps.length - 1 ? (
                <div className="absolute left-[calc(100%-0.5rem)] top-10 hidden h-px w-8 bg-primary/25 md:block" />
              ) : null}
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" aria-hidden="true" />
                    <h3 className="text-base font-semibold text-[#171717]">{step.title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
