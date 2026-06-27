import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { BottomCTA } from "@/components/home/BottomCTA";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PopularTools } from "@/components/home/PopularTools";
import { ToolCategories } from "@/components/home/ToolCategories";
import { TrustSection } from "@/components/home/TrustSection";
import { metadataForPath, organizationJsonLd, webApplicationJsonLd, websiteJsonLd } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/");

export default function Home() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), webApplicationJsonLd({
        name: "FileWalaTool",
        description:
          "FileWalaTool is a browser-based platform for image, PDF, conversion, and document tools.",
        path: "/",
        applicationCategory: "UtilitiesApplication",
      })]} />
      <HeroSection />
      <PopularTools />
      <ToolCategories />
      <TrustSection />
      <HowItWorks />
      <BottomCTA />
    </>
  );
}
