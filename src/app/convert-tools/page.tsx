import type { Metadata } from "next";

import { ToolCategoryPage } from "@/components/common/ToolCategoryPage";
import { toolCategories } from "@/data/tools";
import { metadataForPath } from "@/lib/seo";

export const metadata: Metadata = metadataForPath("/convert-tools");

export default function ConvertToolsPage() {
  return <ToolCategoryPage category={toolCategories[2]} />;
}
