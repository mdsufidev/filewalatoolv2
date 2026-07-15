import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login | FileWalaTool",
  description: "Sign in to view submitted contact messages.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  return (
    <div className="bg-[#FAFAFA]">
      <section className="mx-auto flex min-h-[calc(100vh-1px)] w-full max-w-[520px] items-center px-4 py-10">
        <div className="w-full">
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="rounded-md hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              Home
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span className="font-medium text-[#171717]">Admin login</span>
          </nav>

          <AdminLoginFormWrapper searchParams={searchParams} />
        </div>
      </section>
    </div>
  );
}

async function AdminLoginFormWrapper({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const nextPath = Array.isArray(params?.next) ? params?.next[0] ?? "/sufi" : params?.next ?? "/sufi";
  return <AdminLoginForm nextPath={nextPath} />;
}
