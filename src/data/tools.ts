import {
  BadgeCheck,
  Camera,
  Crop,
  FileImage,
  FileOutput,
  FileScan,
  FileText,
  ImageIcon,
  Images,
  Layers,
  Maximize2,
  Minimize2,
  PenLine,
  RotateCw,
  Scissors,
  ShieldCheck,
  Stamp,
  Zap,
} from "lucide-react";

import type { Tool, ToolCategory } from "@/types/tool";

export const navLinks = [
  { label: "Image Tools", href: "/image-tools" },
  { label: "PDF Tools", href: "/pdf-tools" },
  { label: "Convert", href: "/convert-tools" },
  { label: "Document Tools", href: "/document-tools" },
];

export const popularTools: Tool[] = [
  {
    name: "Image Resizer",
    description: "Resize images for forms, websites, and social sharing.",
    href: "/image-resizer",
    icon: Maximize2,
  },
  {
    name: "Compress Image",
    description: "Reduce image file size while keeping it clear.",
    href: "/compress-image",
    icon: Minimize2,
  },
  {
    name: "Merge PDF",
    description: "Combine multiple PDF files into one clean document.",
    href: "/merge-pdf",
    icon: FileText,
  },
  {
    name: "PDF to Image",
    description: "Convert PDF pages into image files.",
    href: "/pdf-to-image",
    icon: ImageIcon,
  },
  {
    name: "Word to PDF",
    description: "Create a PDF from a Word document.",
    href: "/word-to-pdf",
    icon: FileOutput,
  },
  {
    name: "Passport Photo Maker",
    description: "Create passport-size photos with India digital, print, and custom presets.",
    href: "/passport-photo",
    icon: Camera,
  },
];

export const quickLinks = popularTools.filter((tool) =>
  ["Image Resizer", "Compress Image", "Merge PDF", "PDF to Image", "Passport Photo Maker"].includes(tool.name),
);

const imageTools: Tool[] = [
  { name: "Image Resizer", description: "Resize images", href: "/image-resizer", icon: Maximize2 },
  { name: "Compress Image", description: "Compress images", href: "/compress-image", icon: Minimize2 },
  { name: "KB Resizer", description: "Resize by target KB", href: "/kb-resizer", icon: ImageIcon },
  { name: "Crop Image", description: "Crop photos precisely", href: "/crop-image", icon: Crop },
  { name: "JPG to PNG", description: "Convert JPG files", href: "/jpg-to-png", icon: Images },
  { name: "PNG to JPG", description: "Convert PNG files", href: "/png-to-jpg", icon: FileImage },
  { name: "Batch Image Cropper", description: "Crop multiple images together", href: "/batch-image-cropper", icon: Layers },
];

const pdfTools: Tool[] = [
  { name: "Merge PDF", description: "Combine PDF files", href: "/merge-pdf", icon: FileText },
  { name: "Split PDF", description: "Extract PDF pages", href: "/split-pdf", icon: Scissors },
  { name: "Compress PDF", description: "Reduce PDF size", href: "/compress-pdf", icon: Minimize2 },
  { name: "Rotate PDF", description: "Rotate PDF pages", href: "/rotate-pdf", icon: RotateCw },
  { name: "Delete PDF Pages", description: "Remove PDF pages", href: "/delete-pdf-pages", icon: FileText },
  { name: "Watermark PDF", description: "Add PDF watermark", href: "/watermark-pdf", icon: Stamp },
];

const convertTools: Tool[] = [
  { name: "Word to PDF", description: "Document to PDF", href: "/word-to-pdf", icon: FileOutput },
  { name: "Image to PDF", description: "Images to PDF", href: "/image-to-pdf", icon: FileOutput },
  { name: "JPG to PNG", description: "JPG to PNG", href: "/jpg-to-png", icon: Images },
  { name: "PNG to JPG", description: "PNG to JPG", href: "/png-to-jpg", icon: FileImage },
  { name: "PDF to Image", description: "PDF pages to images", href: "/pdf-to-image", icon: ImageIcon },
  { name: "Image Resizer", description: "Resize images", href: "/image-resizer", icon: Maximize2 },
  { name: "Compress Image", description: "Compress images", href: "/compress-image", icon: Minimize2 },
];

const documentTools: Tool[] = [
  {
    name: "Passport Photo Maker",
    description: "Create passport-size photos with India digital, print, and custom presets.",
    href: "/passport-photo",
    icon: Camera,
  },
  {
    name: "Signature Resize",
    description: "Resize and compress signatures for PAN application upload.",
    href: "/signature-resize",
    icon: PenLine,
  },
  {
    name: "PAN Photo Resize",
    description: "Prepare PAN application photos for Protean and UTIITSL upload.",
    href: "/pan-photo-resize",
    icon: BadgeCheck,
  },
  { name: "Resume Builder", description: "Create a resume", href: "/resume-builder", icon: FileText },
  { name: "Crop Image", description: "Crop document images", href: "/crop-image", icon: Crop },
];

export const toolCategories: ToolCategory[] = [
  {
    title: "Image Tools",
    description: "Resize, compress, crop, and convert images.",
    href: "/image-tools",
    icon: ImageIcon,
    tools: imageTools,
  },
  {
    title: "PDF Tools",
    description: "Manage, edit, and organize PDF files.",
    href: "/pdf-tools",
    icon: FileText,
    tools: pdfTools,
  },
  {
    title: "Convert Tools",
    description: "Change files into the format you need.",
    href: "/convert-tools",
    icon: FileOutput,
    tools: convertTools,
  },
  {
    title: "Document Tools",
    description: "Prepare photos and documents for official use.",
    href: "/document-tools",
    icon: FileScan,
    tools: documentTools,
  },
];

export const trustItems = [
  {
    title: "Private by design",
    description: "Your files stay protected and are not kept permanently.",
    icon: ShieldCheck,
  },
  {
    title: "Fast results",
    description: "Most tools are designed to complete your task quickly.",
    icon: Zap,
  },
  {
    title: "Free to use",
    description: "Use essential file tools without creating an account.",
    icon: BadgeCheck,
  },
];
