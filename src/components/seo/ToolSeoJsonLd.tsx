import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, routeByPath, webApplicationJsonLd } from "@/lib/seo";

type ToolSeoJsonLdProps = {
  path: string;
  name: string;
  categoryName: string;
  categoryPath: string;
};

export function ToolSeoJsonLd({ path, name, categoryName, categoryPath }: ToolSeoJsonLdProps) {
  const route = routeByPath.get(path);

  if (!route) return null;

  return (
    <JsonLd
      data={[
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: categoryName, path: categoryPath },
          { name, path },
        ]),
        webApplicationJsonLd({
          name,
          description: route.description,
          path,
          applicationCategory: "UtilitiesApplication",
        }),
      ]}
    />
  );
}
