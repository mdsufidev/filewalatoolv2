import type { Metadata } from "next";

import { ToolCategoryPage } from "@/components/common/ToolCategoryPage";
import { toolCategories } from "@/data/tools";
import { metadataForPath } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/pdf-tools");

export default function PdfToolsPage() {
  return <ToolCategoryPage category={toolCategories[1]} />;
}
