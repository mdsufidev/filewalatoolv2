import type { Metadata } from "next";

import { ToolCategoryPage } from "@/components/common/ToolCategoryPage";
import { toolCategories } from "@/data/tools";
import { metadataForPath } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/image-tools");

export default function ImageToolsPage() {
  return <ToolCategoryPage category={toolCategories[0]} />;
}
