import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Inbox, LogOut, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";

import { readContactMessages } from "@/lib/contact-messages";

export const metadata: Metadata = {
  title: "Admin | Contact Messages",
  description: "View contact messages submitted through FileWalaTool.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getPreview(value: string, limit = 220) {
  const trimmed = value.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit).trimEnd()}...`;
}

export default async function AdminPage() {
  const messages = await readContactMessages();
  const latest = messages[0];

  return (
    <div className="bg-[#FAFAFA]">
      <section className="mx-auto w-full max-w-[1180px] px-4 pb-6 pt-3 sm:px-5 lg:px-5 lg:pt-3.5">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Home
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-[#171717]">Admin</span>
        </nav>

        <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-[#171717] sm:text-3xl">Contact Messages</h1>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
              Review messages sent from the contact form. Data comes from Supabase when configured, otherwise from the local fallback store.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {process.env.SUPABASE_URL ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1.5 text-green-700">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Supabase connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FFF1F2] px-3 py-1.5 text-[#B91C1C]">
                <ShieldAlert className="size-3.5" aria-hidden="true" />
                Local fallback store
              </span>
            )}
            <Link
              href="/sufi/logout"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#171717] transition-colors hover:border-primary/35 hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <LogOut className="size-4" />
              Logout
            </Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs text-muted-foreground">Total messages</div>
            <div className="mt-1 text-2xl font-semibold text-[#171717]">{messages.length}</div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs text-muted-foreground">Latest status</div>
            <div className="mt-1 text-2xl font-semibold text-[#171717]">{latest?.status ?? "None"}</div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs text-muted-foreground">Latest topic</div>
            <div className="mt-1 truncate text-lg font-semibold text-[#171717]">{latest?.topic ?? "No messages"}</div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-xs text-muted-foreground">Latest received</div>
            <div className="mt-1 text-sm font-semibold text-[#171717]">{latest ? formatDate(latest.createdAt) : "—"}</div>
          </div>
        </div>

        <section className="mt-4 rounded-[14px] border border-[#E5E7EB] bg-white shadow-none">
          <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#171717]">Messages</h2>
              <p className="text-xs leading-4 text-muted-foreground">Newest messages first.</p>
            </div>
            <Link
              href="/sufi"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm font-medium text-[#171717] transition-colors hover:border-primary/35 hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Link>
          </div>

          {messages.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="bg-[#FAFAFA]">
                  <tr className="text-xs text-muted-foreground">
                    <th className="border-b border-[#E5E7EB] px-4 py-3 font-medium">Received</th>
                    <th className="border-b border-[#E5E7EB] px-4 py-3 font-medium">Name</th>
                    <th className="border-b border-[#E5E7EB] px-4 py-3 font-medium">Email</th>
                    <th className="border-b border-[#E5E7EB] px-4 py-3 font-medium">Topic</th>
                    <th className="border-b border-[#E5E7EB] px-4 py-3 font-medium">Message</th>
                    <th className="border-b border-[#E5E7EB] px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr key={message.id} className="align-top">
                      <td className="border-b border-[#F3F4F6] px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(message.createdAt)}
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-sm font-medium text-[#171717]">{message.name}</td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-sm text-[#171717]">{message.email}</td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-sm text-[#171717]">{message.topic}</td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3 text-sm leading-6 text-[#171717]">
                        <div className="max-w-[26rem] whitespace-pre-wrap">{getPreview(message.message)}</div>
                      </td>
                      <td className="border-b border-[#F3F4F6] px-4 py-3">
                        <details className="group rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2">
                          <summary className="cursor-pointer list-none text-xs font-medium text-[#171717]">
                            View technical details
                          </summary>
                          <div className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">
                            <div>
                              <span className="font-medium text-[#171717]">Related tool:</span>{" "}
                              {message.relatedTool || "—"}
                            </div>
                            <div>
                              <span className="font-medium text-[#171717]">Status:</span> {message.status}
                            </div>
                            <pre className="whitespace-pre-wrap rounded-md border border-[#E5E7EB] bg-white p-2 text-[11px] leading-4 text-[#374151]">
                              {message.technicalDetails || "No technical details provided."}
                            </pre>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 px-4 py-10">
              <div className="flex size-11 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                <Inbox className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#171717]">No messages yet</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Contact submissions will appear here after someone sends the form.
                </p>
              </div>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
