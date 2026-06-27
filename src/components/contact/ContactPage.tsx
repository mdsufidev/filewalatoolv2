"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Bug, CheckCircle2, MessageSquareMore, SearchCheck, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ContactTopic } from "@/types/contact";

type FormState = {
  name: string;
  email: string;
  subject: ContactTopic | "";
  relatedTool: string;
  message: string;
  technicalDetails: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

type TopicCard = {
  value: ContactTopic;
  title: string;
  description: string;
  icon: typeof Wrench;
};

const TOPICS: TopicCard[] = [
  {
    value: "tool-not-working",
    title: "Tool not working",
    description: "Upload, processing, preview, or download issue.",
    icon: Wrench,
  },
  {
    value: "report-a-bug",
    title: "Report a bug",
    description: "Something is broken or behaving unexpectedly.",
    icon: Bug,
  },
  {
    value: "request-a-tool",
    title: "Request a tool",
    description: "Suggest a tool or feature for FileWalaTool.",
    icon: SearchCheck,
  },
  {
    value: "general-feedback",
    title: "General feedback",
    description: "Share an idea, suggestion, or question.",
    icon: MessageSquareMore,
  },
];

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  subject: "",
  relatedTool: "",
  message: "",
  technicalDetails: "",
};

function buildTechnicalDetails() {
  if (typeof window === "undefined") return "";

  const browser = navigator.userAgent || "Unknown browser";
  const platform = navigator.platform || "Unknown OS";
  const screenSize = `${window.screen.width} x ${window.screen.height}`;
  const viewport = `${window.innerWidth} x ${window.innerHeight}`;
  const language = navigator.language || "Unknown language";

  return [
    `Browser: ${browser}`,
    `OS: ${platform}`,
    `Screen: ${screenSize}`,
    `Viewport: ${viewport}`,
    `Language: ${language}`,
  ].join("\n");
}

const REQUEST_TOOL_TEMPLATE = `Hello FileWalaTool team,

I would like to request a new tool:

Tool name:
What it should do:
Example file type:
Why it would be useful:`;

type ContactPageProps = {
  initialRelatedTool?: string;
  initialTopic?: string;
};

export function ContactPage({ initialRelatedTool = "", initialTopic = "" }: ContactPageProps) {
  const [form, setForm] = useState<FormState>(() => {
    const isRequestTool = initialTopic === "request-tool";
    return {
      ...INITIAL_FORM,
      subject: isRequestTool ? "request-a-tool" : ("" as ContactTopic),
      relatedTool: initialRelatedTool,
      message: isRequestTool ? REQUEST_TOOL_TEMPLATE : "",
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [announce, setAnnounce] = useState("");

  const selectedTopic = useMemo(() => {
    return TOPICS.find((topic) => topic.value === form.subject)?.value ?? null;
  }, [form.subject]);

  const resetForm = () => {
    setForm({
      ...INITIAL_FORM,
      relatedTool: initialRelatedTool,
      technicalDetails: "",
    });
    setErrors({});
    setSubmitError("");
    setIsSent(false);
    setAnnounce("");
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (form.name.trim().length < 2) nextErrors.name = "Please enter your name.";
    else if (form.name.trim().length > 80) nextErrors.name = "Your name must be 80 characters or fewer.";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!form.subject) nextErrors.subject = "Please choose a topic.";
    if (form.message.trim().length < 20) nextErrors.message = "Your message must be at least 20 characters.";
    if (form.message.trim().length > 1500) nextErrors.message = "Message cannot be longer than 1500 characters.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setAnnounce("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          topic: form.subject,
          relatedTool: form.relatedTool.trim(),
          message: form.message.trim(),
          technicalDetails: form.technicalDetails.trim(),
        }),
      });

      const payload = (await response.json()) as { message?: string; errors?: FormErrors };

      if (!response.ok) {
        if (payload.errors) setErrors(payload.errors);
        setSubmitError(payload.message ?? "We could not send your message right now. Please check your connection and try again.");
        setAnnounce(payload.message ?? "Submission failed.");
        return;
      }

      setIsSent(true);
      setAnnounce("Message sent successfully.");
    } catch {
      setSubmitError("We could not send your message right now. Please check your connection and try again.");
      setAnnounce("Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FAFAFA]">
      <section className="mx-auto w-full max-w-[1120px] px-5 py-5 pb-12">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">Contact FileWalaTool</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Need help with a tool, found an issue, or have an idea for a new feature? Send us a message and we will review it.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-[#374151]">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              No login required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              Share feedback or report an issue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />
              Your message is handled securely
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:gap-7">
          <aside className="order-2 lg:order-1">
            <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-none">
              <CardHeader className="gap-1.5 px-5 pb-2 pt-5">
                <CardTitle className="text-lg text-[#171717]">How can we help?</CardTitle>
                <CardDescription className="text-sm leading-6">
                  Choose a topic and tell us what happened. Adding useful details helps us understand the issue faster.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <div className="grid gap-2">
                  {TOPICS.map((topic) => {
                    const Icon = topic.icon;
                    const active = selectedTopic === topic.value;

                    return (
                      <button
                        key={topic.value}
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, subject: topic.value }));
                          setErrors((current) => ({ ...current, subject: undefined }));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setForm((current) => ({ ...current, subject: topic.value }));
                          }
                        }}
                        className={cn(
                          "flex min-h-[64px] items-center gap-3 rounded-xl border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                          active
                            ? "border-primary bg-[#FFF1F2]"
                            : "border-[#E5E7EB] bg-white hover:border-primary/25 hover:bg-[#FFF7F8]",
                        )}
                        aria-pressed={active}
                      >
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-primary text-white" : "bg-[#FFF1F2] text-primary")}>
                          <Icon className="size-4.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#171717]">{topic.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{topic.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3 text-sm leading-6 text-muted-foreground">
                  Your files are processed privately. Do not include passwords, personal ID numbers, or sensitive documents in your message.
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="order-1 lg:order-2">
            <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-none">
              <CardHeader className="gap-1.5 px-5 pb-2 pt-5">
                <CardTitle className="text-lg text-[#171717]">Send a message</CardTitle>
                <CardDescription className="text-sm leading-6">
                  We review support requests, bug reports, and feature suggestions.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {isSent ? (
                  <div className="rounded-2xl border border-[#E5E7EB] bg-[#FAFAFA] px-5 py-6">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF1F2] text-primary">
                        <CheckCircle2 className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-[#171717]">Message sent successfully</h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          Thanks for contacting FileWalaTool. Your message has been received.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      <Button render={<Link href="/" />} nativeButton={false} className="min-h-11 bg-primary hover:bg-[#B91C1C]">
                        Back to Home
                      </Button>
                      <Button type="button" variant="outline" className="min-h-11 border-[#E5E7EB]" onClick={resetForm}>
                        Send another message
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={submit} noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-name" className="text-xs font-medium text-[#171717]">
                          Your name
                        </Label>
                        <Input
                          id="contact-name"
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Enter your name"
                          aria-invalid={Boolean(errors.name)}
                          className="h-11 rounded-xl border-[#E5E7EB] bg-white text-sm shadow-none focus-visible:ring-3 focus-visible:ring-ring/30"
                          maxLength={80}
                        />
                        {errors.name ? <p className="text-xs text-[#B91C1C]">{errors.name}</p> : null}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="contact-email" className="text-xs font-medium text-[#171717]">
                          Email address
                        </Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={form.email}
                          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="you@example.com"
                          aria-invalid={Boolean(errors.email)}
                          className="h-11 rounded-xl border-[#E5E7EB] bg-white text-sm shadow-none focus-visible:ring-3 focus-visible:ring-ring/30"
                          maxLength={120}
                        />
                        {errors.email ? <p className="text-xs text-[#B91C1C]">{errors.email}</p> : null}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="contact-subject" className="text-xs font-medium text-[#171717]">
                        What is this about?
                      </Label>
                      <Select
                        value={form.subject}
                        onValueChange={(value) => {
                          setForm((current) => ({ ...current, subject: value as ContactTopic }));
                          setErrors((current) => ({ ...current, subject: undefined }));
                        }}
                      >
                        <SelectTrigger
                          id="contact-subject"
                          className="h-11 w-full rounded-xl border-[#E5E7EB] bg-white text-sm shadow-none focus-visible:ring-3 focus-visible:ring-ring/30"
                          aria-invalid={Boolean(errors.subject)}
                        >
                          <SelectValue placeholder="Choose a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tool-not-working">Tool not working</SelectItem>
                          <SelectItem value="report-a-bug">Report a bug</SelectItem>
                          <SelectItem value="request-a-tool">Request a tool</SelectItem>
                          <SelectItem value="general-feedback">General feedback</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.subject ? <p className="text-xs text-[#B91C1C]">{errors.subject}</p> : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="contact-tool" className="text-xs font-medium text-[#171717]">
                        Related tool (optional)
                      </Label>
                      <Input
                        id="contact-tool"
                        value={form.relatedTool}
                        onChange={(event) => setForm((current) => ({ ...current, relatedTool: event.target.value }))}
                        placeholder="Example: Crop Image, Merge PDF"
                        className="h-11 rounded-xl border-[#E5E7EB] bg-white text-sm shadow-none focus-visible:ring-3 focus-visible:ring-ring/30"
                        maxLength={120}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-end justify-between gap-3">
                        <Label htmlFor="contact-message" className="text-xs font-medium text-[#171717]">
                          Your message
                        </Label>
                        <span className="text-xs text-muted-foreground">{form.message.length} / 1500</span>
                      </div>
                      <Textarea
                        id="contact-message"
                        value={form.message}
                        onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                        placeholder="Tell us what happened, what you expected, and what device/browser you are using."
                        aria-invalid={Boolean(errors.message)}
                        className="min-h-[150px] rounded-xl border-[#E5E7EB] bg-white text-sm shadow-none focus-visible:ring-3 focus-visible:ring-ring/30"
                        maxLength={1500}
                      />
                      {errors.message ? <p className="text-xs text-[#B91C1C]">{errors.message}</p> : null}
                    </div>

                    <details
                      className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-4 py-3"
                      onToggle={(event) => {
                        if (event.currentTarget.open && !form.technicalDetails) {
                          setForm((current) => ({ ...current, technicalDetails: buildTechnicalDetails() }));
                        }
                      }}
                    >
                      <summary className="cursor-pointer list-none text-sm font-medium text-[#171717]">
                        Add browser and device details
                      </summary>
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs leading-5 text-muted-foreground">
                          You can remove or edit this before sending. It helps us debug rendering or browser-specific issues.
                        </p>
                        <Textarea
                          value={form.technicalDetails}
                          onChange={(event) => setForm((current) => ({ ...current, technicalDetails: event.target.value }))}
                          className="min-h-[124px] rounded-xl border-[#E5E7EB] bg-white text-xs shadow-none focus-visible:ring-3 focus-visible:ring-ring/30"
                        />
                      </div>
                    </details>

                    {submitError ? (
                      <div className="rounded-xl border border-primary/20 bg-[#FFF1F2] px-4 py-3 text-sm text-[#B91C1C]" aria-live="polite">
                        {submitError}
                      </div>
                    ) : null}

                    <div className="sr-only" aria-live="polite">
                      {announce}
                    </div>

                    <Button
                      type="submit"
                      className="min-h-11 w-full bg-primary hover:bg-[#B91C1C]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending message…" : "Send message"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        <section className="mt-5">
          <Card className="rounded-2xl border-[#E5E7EB] bg-white shadow-none">
            <CardContent className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#171717]">Looking for a specific tool?</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Explore all FileWalaTool image, PDF, conversion, and document tools.
                </p>
              </div>
              <Button render={<Link href="/tools" />} nativeButton={false} variant="outline" className="min-h-11 border-[#E5E7EB] bg-white">
                Browse all tools
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </section>
    </div>
  );
}
