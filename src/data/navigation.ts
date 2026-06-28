import {
  Camera,
  Crop,
  FileImage,
  FileOutput,
  FileText,
  ImageIcon,
  Images,
  Layers,
  LockKeyhole,
  Maximize2,
  Minimize2,
  PenLine,
  RotateCw,
  Scissors,
  Stamp,
} from "lucide-react";

import type { Tool } from "@/types/tool";

export type NavigationCategory = {
  label: string;
  href: string;
  featured: Tool;
  tools: Tool[];
};

export const navigationCategories: NavigationCategory[] = [
  {
    label: "Image Tools",
    href: "#image-tools",
    featured: {
      name: "Image Resizer",
      description: "Resize images to the dimensions you need.",
      href: "/image-resizer",
      icon: Maximize2,
    },
    tools: [
      { name: "Compress Image", description: "Reduce image size quickly.", href: "/compress-image", icon: Minimize2 },
      { name: "KB Resizer", description: "Resize by target file size.", href: "/kb-resizer", icon: ImageIcon },
      { name: "Crop Image", description: "Crop photos with precision.", href: "/crop-image", icon: Crop },
      { name: "JPG to PNG", description: "Convert JPG into PNG.", href: "/jpg-to-png", icon: Images },
      { name: "PNG to JPG", description: "Convert PNG into JPG.", href: "/png-to-jpg", icon: FileImage },
      { name: "Batch Image Cropper", description: "Crop multiple images together.", href: "/batch-image-cropper", icon: Layers },
    ],
  },
  {
    label: "PDF Tools",
    href: "#pdf-tools",
    featured: {
      name: "Merge PDF",
      description: "Combine multiple PDF files in one place.",
      href: "/merge-pdf",
      icon: FileText,
    },
    tools: [
      { name: "Split PDF", description: "Separate PDF pages.", href: "/split-pdf", icon: Scissors },
      { name: "Compress PDF", description: "Reduce PDF file size.", href: "/compress-pdf", icon: Minimize2 },
      { name: "Rotate PDF", description: "Rotate pages easily.", href: "/rotate-pdf", icon: RotateCw },
      { name: "Delete PDF Pages", description: "Remove unwanted pages.", href: "/delete-pdf-pages", icon: FileText },
      { name: "Watermark PDF", description: "Add a clear watermark.", href: "/watermark-pdf", icon: Stamp },
      { name: "Protect PDF", description: "Prepare secure PDF files.", href: "/protect-pdf", icon: LockKeyhole },
    ],
  },
  {
    label: "Convert",
    href: "#convert-tools",
    featured: {
      name: "PDF to Image",
      description: "Turn PDF pages into image files.",
      href: "/pdf-to-image",
      icon: ImageIcon,
    },
    tools: [
      { name: "Word to PDF", description: "Create a PDF from Word.", href: "/word-to-pdf", icon: FileOutput },
      { name: "Image to PDF", description: "Combine images into PDF.", href: "/image-to-pdf", icon: FileOutput },
      { name: "JPG to PNG", description: "Convert JPG into PNG.", href: "/jpg-to-png", icon: Images },
      { name: "PNG to JPG", description: "Convert PNG into JPG.", href: "/png-to-jpg", icon: FileImage },
      { name: "PDF to Image", description: "Turn pages into images.", href: "/pdf-to-image", icon: ImageIcon },
    ],
  },
  {
    label: "Document Tools",
    href: "#document-tools",
    featured: {
      name: "Passport Photo Maker",
      description: "Create passport-size photos with India digital, print, and custom presets.",
      href: "/passport-photo",
      icon: Camera,
    },
    tools: [
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
        icon: Camera,
      },
      { name: "Image to 20KB", description: "Compress image to 20KB.", href: "/image-to-20kb", icon: Minimize2 },
      { name: "Image to 50KB", description: "Compress image to 50KB.", href: "/image-to-50kb", icon: Minimize2 },
      { name: "Resume Builder", description: "Build a clean resume.", href: "/resume-builder", icon: FileText },
      { name: "Crop Image", description: "Crop document images cleanly.", href: "/crop-image", icon: Crop },
    ],
  },
];
