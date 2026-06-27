import type { LucideIcon } from "lucide-react";

export type Tool = {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export type ToolCategory = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tools: Tool[];
};
