import type { Metadata } from "next";

import { ContactPage } from "@/components/contact/ContactPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, metadataForPath } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/contact");

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ tool?: string | string[]; topic?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const tool = params?.tool;
  const topic = params?.topic;
  const initialRelatedTool = Array.isArray(tool) ? tool[0] : tool ?? "";
  const initialTopic = Array.isArray(topic) ? topic[0] : topic ?? "";

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <ContactPage initialRelatedTool={initialRelatedTool} initialTopic={initialTopic} />
    </>
  );
}
