"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type TemplateId = "ats" | "modern" | "compact";
type SectionId = "profile" | "experience" | "education" | "skills";

type ExperienceEntry = {
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  highlights: string;
};

type EducationEntry = {
  degree: string;
  school: string;
  location: string;
  start: string;
  end: string;
  note: string;
};

type ResumeData = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  summary: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string;
};

const TEMPLATES: {
  id: TemplateId;
  label: string;
  summary: string;
  accent: string;
  surface: string;
}[] = [
  {
    id: "ats",
    label: "ATS Classic",
    summary: "Clean single-column layout for recruiter scans.",
    accent: "text-[#B91C1C]",
    surface: "bg-[#FFF7F7]",
  },
  {
    id: "modern",
    label: "Modern",
    summary: "Balanced layout with a stronger title block.",
    accent: "text-[#0F766E]",
    surface: "bg-[#F0FDFC]",
  },
  {
    id: "compact",
    label: "Compact",
    summary: "Dense layout for short, content-heavy resumes.",
    accent: "text-[#6D28D9]",
    surface: "bg-[#F5F3FF]",
  },
];

const DEFAULT_RESUME: ResumeData = {
  fullName: "Aarav Sharma",
  headline: "Product Operations Specialist",
  email: "aarav.sharma@example.com",
  phone: "+91 98765 43210",
  location: "Pune, India",
  website: "aaravsharma.work",
  linkedin: "linkedin.com/in/aaravsharma",
  summary:
    "Operations and process-focused professional with experience improving reporting, coordinating cross-functional delivery, and turning messy workflows into repeatable systems.",
  experience: [
    {
      role: "Senior Operations Analyst",
      company: "Northstar Systems",
      location: "Pune, India",
      start: "2022",
      end: "Present",
      highlights:
        "Improved weekly reporting accuracy\nBuilt a shared process tracker for cross-functional requests\nReduced turnaround time by standardizing intake and approvals",
    },
    {
      role: "Operations Associate",
      company: "BluePeak Commerce",
      location: "Mumbai, India",
      start: "2019",
      end: "2022",
      highlights:
        "Managed vendor follow-ups and internal SLA tracking\nCreated reusable templates for recurring reports\nSupported launch coordination for new product lines",
    },
  ],
  education: [
    {
      degree: "MBA, Operations Management",
      school: "University of Pune",
      location: "Pune, India",
      start: "2017",
      end: "2019",
      note: "Focused on process optimization, analytics, and business communication.",
    },
    {
      degree: "B.Com",
      school: "Savitribai Phule Pune University",
      location: "Pune, India",
      start: "2014",
      end: "2017",
      note: "Graduated with a foundation in accounting and business systems.",
    },
  ],
  skills: "Process improvement, Reporting, Excel, SQL, Stakeholder management, Documentation, Presentation, Workflow design",
};

const SECTION_ORDER: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Profile", icon: FileText },
  { id: "experience", label: "Experience", icon: BriefcaseBusiness },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "skills", label: "Skills", icon: Sparkles },
];

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitSkills(value: string) {
  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReadiness(value: boolean) {
  return value ? "Passed" : "Needs attention";
}

export function ResumeBuilderTool() {
  const [templateId, setTemplateId] = useState<TemplateId>("ats");
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [resume, setResume] = useState<ResumeData>(DEFAULT_RESUME);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(() => TEMPLATES.find((template) => template.id === templateId) ?? TEMPLATES[0], [templateId]);

  const skills = useMemo(() => splitSkills(resume.skills), [resume.skills]);

  const readinessChecks = useMemo(
    () => [
      { label: "Name and headline are filled", passed: resume.fullName.trim().length > 0 && resume.headline.trim().length > 0 },
      { label: "Contact details are present", passed: [resume.email, resume.phone, resume.location].some((value) => value.trim().length > 0) },
      { label: "Summary is written", passed: resume.summary.trim().length >= 40 },
      { label: "Experience entries added", passed: resume.experience.some((entry) => entry.role.trim().length > 0 && entry.company.trim().length > 0) },
      { label: "Education entries added", passed: resume.education.some((entry) => entry.degree.trim().length > 0 && entry.school.trim().length > 0) },
      { label: "Skills listed", passed: splitSkills(resume.skills).length >= 5 },
    ],
    [resume.education, resume.email, resume.experience, resume.fullName, resume.headline, resume.location, resume.phone, resume.skills, resume.summary],
  );

  const readyCount = readinessChecks.filter((check) => check.passed).length;
  const canExport = readyCount >= 5 && !isPrinting;

  const updateResume = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setError(null);
    setResume((current) => ({ ...current, [key]: value }));
  };

  const updateExperience = (index: number, key: keyof ExperienceEntry, value: string) => {
    setError(null);
    setResume((current) => ({
      ...current,
      experience: current.experience.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [key]: value } : entry)),
    }));
  };

  const addExperience = () => {
    setResume((current) => ({
      ...current,
      experience: [
        ...current.experience,
        {
          role: "",
          company: "",
          location: "",
          start: "",
          end: "",
          highlights: "",
        },
      ],
    }));
    setActiveSection("experience");
  };

  const removeExperience = (index: number) => {
    setResume((current) => ({
      ...current,
      experience: current.experience.length > 1 ? current.experience.filter((_, itemIndex) => itemIndex !== index) : current.experience,
    }));
  };

  const updateEducation = (index: number, key: keyof EducationEntry, value: string) => {
    setError(null);
    setResume((current) => ({
      ...current,
      education: current.education.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [key]: value } : entry)),
    }));
  };

  const addEducation = () => {
    setResume((current) => ({
      ...current,
      education: [
        ...current.education,
        {
          degree: "",
          school: "",
          location: "",
          start: "",
          end: "",
          note: "",
        },
      ],
    }));
    setActiveSection("education");
  };

  const removeEducation = (index: number) => {
    setResume((current) => ({
      ...current,
      education: current.education.length > 1 ? current.education.filter((_, itemIndex) => itemIndex !== index) : current.education,
    }));
  };

  const openPrintWindow = () => {
    const templateClass =
      templateId === "modern"
        ? "modern"
        : templateId === "compact"
          ? "compact"
          : "ats";

    const experienceHtml = resume.experience
      .filter((entry) => entry.role.trim() || entry.company.trim() || entry.highlights.trim())
      .map((entry) => {
        const bullets = splitLines(entry.highlights);
        return `
          <section class="block">
            <div class="row">
              <div>
                <h3>${escapeHtml(entry.role || "Role title")}</h3>
                <p class="muted">${escapeHtml(entry.company || "Company name")} ${entry.location ? `- ${escapeHtml(entry.location)}` : ""}</p>
              </div>
              <div class="time">${escapeHtml([entry.start, entry.end].filter(Boolean).join(" - ") || "Dates")}</div>
            </div>
            <ul>
              ${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}
            </ul>
          </section>
        `;
      })
      .join("");

    const educationHtml = resume.education
      .filter((entry) => entry.degree.trim() || entry.school.trim() || entry.note.trim())
      .map((entry) => {
        return `
          <section class="block">
            <div class="row">
              <div>
                <h3>${escapeHtml(entry.degree || "Degree")}</h3>
                <p class="muted">${escapeHtml(entry.school || "School name")} ${entry.location ? `- ${escapeHtml(entry.location)}` : ""}</p>
              </div>
              <div class="time">${escapeHtml([entry.start, entry.end].filter(Boolean).join(" - ") || "Dates")}</div>
            </div>
            ${entry.note.trim() ? `<p>${escapeHtml(entry.note)}</p>` : ""}
          </section>
        `;
      })
      .join("");

    const skillsHtml = skills.map((skill) => `<span class="chip">${escapeHtml(skill)}</span>`).join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(resume.fullName || "Resume")}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .page {
              min-height: 100%;
              padding: 0;
            }
            .resume {
              font-size: ${templateClass === "compact" ? "9.5pt" : "10.5pt"};
              line-height: 1.45;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              border-bottom: 2px solid ${templateClass === "modern" ? "#0F766E" : templateClass === "compact" ? "#6D28D9" : "#B91C1C"};
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .name {
              margin: 0;
              font-size: 22pt;
              line-height: 1.05;
            }
            .headline {
              margin: 4px 0 0;
              color: #374151;
              font-size: 10.5pt;
            }
            .contact {
              text-align: right;
              font-size: 9pt;
              color: #374151;
            }
            .section {
              margin-top: 14px;
            }
            .section h2 {
              margin: 0 0 8px;
              font-size: 11pt;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: ${templateClass === "modern" ? "#0F766E" : templateClass === "compact" ? "#6D28D9" : "#B91C1C"};
            }
            .block {
              margin-bottom: 10px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              align-items: flex-start;
            }
            h3 {
              margin: 0;
              font-size: 11pt;
            }
            p {
              margin: 3px 0 0;
            }
            .muted {
              color: #4b5563;
            }
            .time {
              white-space: nowrap;
              color: #4b5563;
              font-size: 9pt;
            }
            ul {
              margin: 6px 0 0 18px;
              padding: 0;
            }
            li {
              margin: 0 0 3px;
            }
            .chips {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
            }
            .chip {
              border: 1px solid #d1d5db;
              border-radius: 999px;
              padding: 4px 8px;
              font-size: 9pt;
              background: ${templateClass === "modern" ? "#ECFDF5" : templateClass === "compact" ? "#F3E8FF" : "#FFF1F2"};
            }
            .columns {
              display: grid;
              grid-template-columns: ${templateClass === "ats" ? "1fr" : "1fr 1fr"};
              gap: 14px;
            }
            .sidebar {
              border-left: ${templateClass === "ats" ? "none" : `3px solid ${templateClass === "modern" ? "#0F766E" : "#6D28D9"}`};
              padding-left: ${templateClass === "ats" ? "0" : "12px"};
            }
          </style>
        </head>
        <body>
          <div class="page">
            <main class="resume">
              <header class="header">
                <div>
                  <h1 class="name">${escapeHtml(resume.fullName || "Your Name")}</h1>
                  <p class="headline">${escapeHtml(resume.headline || "Professional headline")}</p>
                </div>
                <div class="contact">
                  ${resume.email ? `<div>${escapeHtml(resume.email)}</div>` : ""}
                  ${resume.phone ? `<div>${escapeHtml(resume.phone)}</div>` : ""}
                  ${resume.location ? `<div>${escapeHtml(resume.location)}</div>` : ""}
                  ${resume.website ? `<div>${escapeHtml(resume.website)}</div>` : ""}
                  ${resume.linkedin ? `<div>${escapeHtml(resume.linkedin)}</div>` : ""}
                </div>
              </header>
              <section class="section">
                <h2>Summary</h2>
                <p>${escapeHtml(resume.summary || "Add a short summary.")}</p>
              </section>
              <div class="columns">
                <div>
                  <section class="section">
                    <h2>Experience</h2>
                    ${experienceHtml || "<p class='muted'>Add work history.</p>"}
                  </section>
                </div>
                <div class="sidebar">
                  <section class="section">
                    <h2>Education</h2>
                    ${educationHtml || "<p class='muted'>Add education details.</p>"}
                  </section>
                  <section class="section">
                    <h2>Skills</h2>
                    <div class="chips">${skillsHtml || "<span class='muted'>Add skills.</span>"}</div>
                  </section>
                </div>
              </div>
            </main>
          </div>
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 150);
            };
          </script>
        </body>
      </html>
    `;

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1120,height=900");
    if (!popup) {
      setError("Your browser blocked the print window. Allow pop-ups and try again.");
      return;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  };

  const resetResume = () => {
    setTemplateId("ats");
    setActiveSection("profile");
    setResume(DEFAULT_RESUME);
    setError(null);
    setIsPrinting(false);
  };

  const summaryChips = splitSkills(resume.skills);

  return (
    <div className="mt-3.5 space-y-3.5">
      <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
        <CardHeader className="gap-2 px-4 pb-3 pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base text-[#171717]">
                <FileText className="size-4 text-primary" aria-hidden="true" />
                Resume Builder
              </CardTitle>
              <CardDescription className="text-xs leading-5">
                Build a clean resume with editable sections, live preview, and a browser print export.
              </CardDescription>
            </div>
            <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
              <BadgeCheck className="size-3.5" />
              Browser only
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(330px,0.9fr)]">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="gap-1.5 px-4 pb-1 pt-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base text-[#171717]">Live resume preview</CardTitle>
                <CardDescription className="text-xs leading-5">
                  Changes appear here as you edit. Switch templates to change the layout.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("h-7 text-xs hover:bg-inherit", selectedTemplate.surface, selectedTemplate.accent)}>
                  <LayoutTemplate className="size-3.5" />
                  {selectedTemplate.label}
                </Badge>
                <Badge className="h-7 bg-[#FAFAFA] text-xs text-muted-foreground hover:bg-[#FAFAFA]">
                  {readyCount}/6 checks
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div
              className={cn(
                "overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white shadow-[0_1px_0_rgba(17,24,39,0.02)]",
                templateId === "compact" ? "max-w-full" : "",
              )}
            >
              <div
                className={cn(
                  "resume-preview mx-auto w-full bg-white p-5 text-[#111827]",
                  templateId === "ats" && "max-w-[820px]",
                  templateId === "modern" && "max-w-[860px]",
                  templateId === "compact" && "max-w-[780px]",
                )}
              >
                <div className={cn("mb-4 border-b-2 pb-3", templateId === "ats" && "border-primary", templateId === "modern" && "border-[#0F766E]", templateId === "compact" && "border-[#6D28D9]")}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-[1.9rem] font-semibold tracking-tight text-[#111827] sm:text-[2.1rem]">
                        {resume.fullName || "Your Name"}
                      </h2>
                      <p className={cn("mt-1 text-sm font-medium", selectedTemplate.accent)}>{resume.headline || "Professional headline"}</p>
                    </div>
                    <div className="space-y-0.5 text-right text-xs leading-5 text-[#4B5563]">
                      {resume.email ? <div className="truncate">{resume.email}</div> : null}
                      {resume.phone ? <div>{resume.phone}</div> : null}
                      {resume.location ? <div>{resume.location}</div> : null}
                      {resume.website ? <div className="truncate">{resume.website}</div> : null}
                      {resume.linkedin ? <div className="truncate">{resume.linkedin}</div> : null}
                    </div>
                  </div>
                </div>

                <section className="mb-4">
                  <h3 className={cn("text-xs font-semibold uppercase tracking-[0.14em]", selectedTemplate.accent)}>Summary</h3>
                  <p className="mt-2 text-sm leading-6 text-[#1F2937]">{resume.summary || "Add a short summary."}</p>
                </section>

                <div className={cn("grid gap-4", templateId === "ats" ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1.4fr_0.8fr]")}>
                  <section>
                    <h3 className={cn("text-xs font-semibold uppercase tracking-[0.14em]", selectedTemplate.accent)}>Experience</h3>
                    <div className="mt-2 space-y-4">
                      {resume.experience.map((entry, index) => (
                        <div key={`${entry.company}-${index}`} className="space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#111827]">{entry.role || "Role title"}</p>
                              <p className="text-sm text-[#4B5563]">
                                {entry.company || "Company name"}
                                {entry.location ? ` - ${entry.location}` : ""}
                              </p>
                            </div>
                            <span className="whitespace-nowrap text-xs text-[#6B7280]">{[entry.start, entry.end].filter(Boolean).join(" - ") || "Dates"}</span>
                          </div>
                          <ul className="ml-5 list-disc space-y-1 text-sm leading-6 text-[#1F2937]">
                            {splitLines(entry.highlights).map((bullet) => (
                              <li key={bullet}>{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="space-y-4">
                    <section>
                      <h3 className={cn("text-xs font-semibold uppercase tracking-[0.14em]", selectedTemplate.accent)}>Education</h3>
                      <div className="mt-2 space-y-3">
                        {resume.education.map((entry, index) => (
                          <div key={`${entry.school}-${index}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-[#111827]">{entry.degree || "Degree"}</p>
                                <p className="text-sm text-[#4B5563]">
                                  {entry.school || "School name"}
                                  {entry.location ? ` - ${entry.location}` : ""}
                                </p>
                              </div>
                              <span className="whitespace-nowrap text-xs text-[#6B7280]">{[entry.start, entry.end].filter(Boolean).join(" - ") || "Dates"}</span>
                            </div>
                            {entry.note ? <p className="mt-1 text-sm leading-6 text-[#1F2937]">{entry.note}</p> : null}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className={cn("text-xs font-semibold uppercase tracking-[0.14em]", selectedTemplate.accent)}>Skills</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {summaryChips.length ? (
                          summaryChips.map((skill) => (
                            <span
                              key={skill}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-xs",
                                templateId === "modern" && "border-[#A7F3D0] bg-[#ECFDF5]",
                                templateId === "compact" && "border-[#DDD6FE] bg-[#F5F3FF]",
                                templateId === "ats" && "border-[#FECACA] bg-[#FFF1F2]",
                              )}
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-[#6B7280]">Add skills.</span>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-3.5">
          <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="text-sm text-[#171717]">Template selector</CardTitle>
              <CardDescription className="text-[11px] leading-4">Choose the layout before printing or updating your content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {TEMPLATES.map((template) => {
                const selected = template.id === templateId;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(template.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                      selected ? "border-primary bg-[#FFF1F2]" : "border-[#E5E7EB] bg-white hover:border-primary/35 hover:bg-[#FFF7F7]",
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg", template.surface, template.accent)}>
                      <LayoutTemplate className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-medium text-[#171717]">
                        {template.label}
                        {selected ? <Check className="size-3.5 text-primary" aria-hidden="true" /> : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{template.summary}</span>
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="text-sm text-[#171717]">Resume editor</CardTitle>
              <CardDescription className="text-[11px] leading-4">Edit one section at a time to keep the layout compact.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-4 gap-1.5">
                {SECTION_ORDER.map((section) => {
                  const Icon = section.icon;
                  const selected = section.id === activeSection;
                  return (
                    <Button
                      key={section.id}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className={cn("min-h-11 px-2 text-xs lg:min-h-8", selected && "bg-primary hover:bg-[#B91C1C]")}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon className="size-4" />
                      {section.label}
                    </Button>
                  );
                })}
              </div>

              {activeSection === "profile" ? (
                <div className="grid gap-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="resume-name" className="text-xs">Full name</Label>
                    <Input id="resume-name" value={resume.fullName} className="min-h-11 lg:min-h-8" onChange={(event) => updateResume("fullName", event.target.value)} />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="resume-headline" className="text-xs">Headline</Label>
                    <Input id="resume-headline" value={resume.headline} className="min-h-11 lg:min-h-8" onChange={(event) => updateResume("headline", event.target.value)} />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="resume-summary" className="text-xs">Professional summary</Label>
                    <Textarea id="resume-summary" value={resume.summary} rows={5} className="min-h-[120px] resize-none" onChange={(event) => updateResume("summary", event.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="resume-email" className="text-xs">Email</Label>
                      <Input id="resume-email" value={resume.email} className="min-h-11 lg:min-h-8" onChange={(event) => updateResume("email", event.target.value)} />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="resume-phone" className="text-xs">Phone</Label>
                      <Input id="resume-phone" value={resume.phone} className="min-h-11 lg:min-h-8" onChange={(event) => updateResume("phone", event.target.value)} />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="resume-location" className="text-xs">Location</Label>
                      <Input id="resume-location" value={resume.location} className="min-h-11 lg:min-h-8" onChange={(event) => updateResume("location", event.target.value)} />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="resume-website" className="text-xs">Website</Label>
                      <Input id="resume-website" value={resume.website} className="min-h-11 lg:min-h-8" onChange={(event) => updateResume("website", event.target.value)} />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="resume-linkedin" className="text-xs">LinkedIn</Label>
                      <Input id="resume-linkedin" value={resume.linkedin} className="min-h-11 lg:min-h-8" onChange={(event) => updateResume("linkedin", event.target.value)} />
                    </div>
                  </div>
                </div>
              ) : null}

              {activeSection === "experience" ? (
                <div className="space-y-3">
                  {resume.experience.map((entry, index) => (
                    <div key={`${index}-${entry.company}`} className="space-y-2 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#171717]">Experience {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-[#B91C1C]"
                          onClick={() => removeExperience(index)}
                          disabled={resume.experience.length <= 1}
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-xs">Role</Label>
                          <Input value={entry.role} className="min-h-11 lg:min-h-8" onChange={(event) => updateExperience(index, "role", event.target.value)} />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Company</Label>
                          <Input value={entry.company} className="min-h-11 lg:min-h-8" onChange={(event) => updateExperience(index, "company", event.target.value)} />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Location</Label>
                          <Input value={entry.location} className="min-h-11 lg:min-h-8" onChange={(event) => updateExperience(index, "location", event.target.value)} />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Dates</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input value={entry.start} placeholder="Start" className="min-h-11 lg:min-h-8" onChange={(event) => updateExperience(index, "start", event.target.value)} />
                            <Input value={entry.end} placeholder="End" className="min-h-11 lg:min-h-8" onChange={(event) => updateExperience(index, "end", event.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-xs">Highlights, one per line</Label>
                        <Textarea
                          value={entry.highlights}
                          rows={4}
                          className="min-h-[108px] resize-none"
                          onChange={(event) => updateExperience(index, "highlights", event.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="min-h-11 w-full" onClick={addExperience}>
                    <Plus className="size-4" />
                    Add experience
                  </Button>
                </div>
              ) : null}

              {activeSection === "education" ? (
                <div className="space-y-3">
                  {resume.education.map((entry, index) => (
                    <div key={`${index}-${entry.school}`} className="space-y-2 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#171717]">Education {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-[#B91C1C]"
                          onClick={() => removeEducation(index)}
                          disabled={resume.education.length <= 1}
                        >
                          <Trash2 className="size-4" />
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-xs">Degree</Label>
                          <Input value={entry.degree} className="min-h-11 lg:min-h-8" onChange={(event) => updateEducation(index, "degree", event.target.value)} />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">School</Label>
                          <Input value={entry.school} className="min-h-11 lg:min-h-8" onChange={(event) => updateEducation(index, "school", event.target.value)} />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Location</Label>
                          <Input value={entry.location} className="min-h-11 lg:min-h-8" onChange={(event) => updateEducation(index, "location", event.target.value)} />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-xs">Dates</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input value={entry.start} placeholder="Start" className="min-h-11 lg:min-h-8" onChange={(event) => updateEducation(index, "start", event.target.value)} />
                            <Input value={entry.end} placeholder="End" className="min-h-11 lg:min-h-8" onChange={(event) => updateEducation(index, "end", event.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-xs">Note</Label>
                        <Textarea value={entry.note} rows={3} className="min-h-[86px] resize-none" onChange={(event) => updateEducation(index, "note", event.target.value)} />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="min-h-11 w-full" onClick={addEducation}>
                    <Plus className="size-4" />
                    Add education
                  </Button>
                </div>
              ) : null}

              {activeSection === "skills" ? (
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="resume-skills" className="text-xs">Skills, separated by commas</Label>
                    <Textarea
                      id="resume-skills"
                      value={resume.skills}
                      rows={5}
                      className="min-h-[130px] resize-none"
                      onChange={(event) => updateResume("skills", event.target.value)}
                    />
                  </div>
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-xs leading-5 text-muted-foreground">
                    <span className="flex items-center gap-2 font-medium text-[#171717]">
                      <Sparkles className="size-4 text-primary" />
                      Skills preview
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {summaryChips.length ? (
                        summaryChips.map((skill) => (
                          <span key={skill} className="rounded-full border border-[#FECACA] bg-[#FFF1F2] px-2.5 py-1 text-xs text-[#7F1D1D]">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span>No skills added yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <Separator className="bg-[#E5E7EB]" />

              <div className="space-y-2">
                <div className="grid gap-1.5">
                  <Button
                    type="button"
                    className="min-h-11 bg-primary hover:bg-[#B91C1C] lg:min-h-9"
                    onClick={() => {
                      setError(null);
                      setIsPrinting(true);
                      try {
                        openPrintWindow();
                      } finally {
                        setTimeout(() => setIsPrinting(false), 400);
                      }
                    }}
                    disabled={!canExport}
                  >
                    <Printer className="size-4" />
                    Print / Save PDF
                  </Button>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetResume}>
                      <RotateCcw className="size-4" />
                      Reset
                    </Button>
                    <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={() => setActiveSection("profile")}>
                      Edit profile
                    </Button>
                  </div>
                </div>

                {error ? <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-[#B91C1C]">{error}</p> : null}
                {isPrinting ? <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-primary">Preparing print view...</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="text-sm text-[#171717]">Resume readiness</CardTitle>
              <CardDescription className="text-[11px] leading-4">
                {readyCount >= 5 ? "The resume has the core fields needed for a clean export." : "Fill the missing fields before printing."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {readinessChecks.map((check) => (
                <div key={check.label} className="flex items-start gap-2 text-xs leading-5">
                  {check.passed ? (
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
                  )}
                  <span className={check.passed ? "text-green-700" : "text-red-700"}>
                    <span className="sr-only">{formatReadiness(check.passed)}: </span>
                    {check.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
