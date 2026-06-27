import type { Metadata } from "next";

import { ToolCategoryPage } from "@/components/common/ToolCategoryPage";
import { toolCategories } from "@/data/tools";
import { metadataForPath } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/document-tools");

export default function DocumentToolsPage() {
  return <ToolCategoryPage category={toolCategories[3]} />;
}
