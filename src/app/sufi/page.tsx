import type { Metadata } from "next";

export { default } from "@/app/admin/page";

export const metadata: Metadata = {
  title: "Sufi | Contact Messages",
  description: "View contact messages submitted through FileWalaTool.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
