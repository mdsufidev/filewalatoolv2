import type { Metadata } from "next";

import { portfolioAbsoluteUrl, portfolioConfig } from "@/lib/portfolio";

export const homeMetadata = {
  title: "Free PDF & Image Tools Online | FileWalaTool",
  description:
    "Free online PDF tools, image compressor, file converter, image resizer, and document tools.",
};

export const siteConfig = {
  name: "FileWalaTool",
  alternateNames: ["FileWala", "File Wala", "File Wala Tool"],
  organizationAlternateNames: ["FileWala", "File Wala Tool"],
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.filewalatool.com").replace(/\/$/, ""),
  description:
    "Resize, compress, convert and edit images, PDFs and documents online for free. Fast, private browser-based file tools.",
  logo: "/logo.png",
  ogImage: "/og-image.png",
  title: homeMetadata.title,
  socialDescription:
    "Free online image tools, PDF tools, file converters, and document photo resizing tools.",
  founderName: "Muhammad Sufiyan",
  founderPortfolio: "https://mdsufidev.vercel.app/",
};

export type PublicRoute = {
  path: string;
  title: string;
  description: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
  lastModified?: string;
};

export const publicRoutes: PublicRoute[] = [
  {
    path: "/",
    title: homeMetadata.title,
    description: homeMetadata.description,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/tools",
    title: "All Online File Tools | FileWalaTool",
    description:
      "Browse all FileWalaTool image, PDF, conversion, and document tools in one place.",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/image-tools",
    title: "Image Tools Online | FileWalaTool",
    description:
      "Resize, compress, crop, and convert images online with simple browser-based tools.",
    changeFrequency: "weekly",
    priority: 0.86,
  },
  {
    path: "/pdf-tools",
    title: "PDF Tools Online | FileWalaTool",
    description:
      "Merge, split, compress, rotate, delete pages, and watermark PDF files online.",
    changeFrequency: "weekly",
    priority: 0.86,
  },
  {
    path: "/convert-tools",
    title: "Convert Tools Online | FileWalaTool",
    description:
      "Convert images, PDFs, and documents online with quick browser-based tools.",
    changeFrequency: "weekly",
    priority: 0.84,
  },
  {
    path: "/document-tools",
    title: "Document Tools Online | FileWalaTool",
    description:
      "Prepare passport photos, PAN photos, signatures, resumes, and document images online.",
    changeFrequency: "weekly",
    priority: 0.84,
  },
  {
    path: "/image-resizer",
    title: "Image Resizer Online Free | Resize JPG, PNG and WebP",
    description:
      "Resize JPG, PNG, and WebP images online. Set exact width and height, use presets, and download the resized image in your browser.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/compress-image",
    title: "Compress Image Online Free | Reduce JPG, PNG and WebP",
    description:
      "Compress JPG, PNG, and WebP images online. Adjust quality, reduce file size, and download a smaller image directly in your browser.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/crop-image",
    title: "Crop Image Online Free | Crop JPG, PNG and WebP",
    description:
      "Crop JPG, PNG, and WebP images online. Adjust the crop area, resize your image, and download the result directly in your browser.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/merge-pdf",
    title: "Merge PDF Online Free | Combine PDF Files",
    description:
      "Merge multiple PDF files into one document online. Arrange PDF order and download a single combined PDF in your browser.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/pan-photo-resize",
    title: "PAN Photo Resize Online | Protean NSDL and UTIITSL",
    description:
      "Resize and crop PAN application photos online for Protean NSDL and UTIITSL presets. Download a JPG and verify current portal instructions before upload.",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/signature-resize",
    title: "Signature Resize Online | PAN Signature JPG Tool",
    description:
      "Resize and prepare signature images online for PAN application upload. Crop, clean up, and download a JPG while checking current portal instructions.",
    changeFrequency: "monthly",
    priority: 0.88,
  },
  {
    path: "/passport-photo",
    title: "Passport Photo Maker Online | Passport Size Photo",
    description:
      "Create passport-size photos online with digital, print, and custom presets. Crop, center, and download a JPG passport photo in your browser.",
    changeFrequency: "monthly",
    priority: 0.88,
  },
  {
    path: "/resume-builder",
    title: "Resume Builder Online | Create a Clean Resume",
    description:
      "Build a clean resume online with editable sections, live preview, template options, and print-friendly export.",
    changeFrequency: "monthly",
    priority: 0.86,
  },
  {
    path: "/kb-resizer",
    title: "KB Image Resizer Online | Resize Image to Target KB",
    description:
      "Resize and compress images to a target file size online for forms, uploads, and document requirements.",
    changeFrequency: "monthly",
    priority: 0.82,
  },
  {
    path: "/image-to-20kb",
    title: "Image to 20KB Online | Compress Photo to 20KB",
    description:
      "Compress and resize an image near 20KB online with browser-based image controls.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/image-to-50kb",
    title: "Image to 50KB Online | Compress Photo to 50KB",
    description:
      "Compress and resize an image near 50KB online with browser-based image controls.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/jpg-to-png",
    title: "JPG to PNG Converter Online | FileWalaTool",
    description:
      "Convert JPG images to PNG online in your browser and download the converted image.",
    changeFrequency: "monthly",
    priority: 0.78,
  },
  {
    path: "/png-to-jpg",
    title: "PNG to JPG Converter Online | FileWalaTool",
    description:
      "Convert PNG images to JPG online in your browser and download the converted image.",
    changeFrequency: "monthly",
    priority: 0.78,
  },
  {
    path: "/image-to-pdf",
    title: "Image to PDF Converter Online | FileWalaTool",
    description:
      "Convert JPG, PNG, and WebP images into one PDF online. Combine images into a PDF file directly in your browser.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/batch-image-cropper",
    title: "Batch Image Cropper Online | Crop Multiple Images",
    description:
      "Crop multiple images online with a browser-based batch image cropping workflow.",
    changeFrequency: "monthly",
    priority: 0.76,
  },
  {
    path: "/split-pdf",
    title: "Split PDF Online | Extract PDF Pages",
    description:
      "Split a PDF online by extracting selected pages and downloading the result.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/compress-pdf",
    title: "Compress PDF Online | Reduce PDF Size",
    description:
      "Compress PDF files online and reduce file size for sharing or upload.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/rotate-pdf",
    title: "Rotate PDF Online | Rotate PDF Pages",
    description:
      "Rotate PDF pages online and download the corrected PDF file.",
    changeFrequency: "monthly",
    priority: 0.78,
  },
  {
    path: "/delete-pdf-pages",
    title: "Delete PDF Pages Online | Remove Pages from PDF",
    description:
      "Remove unwanted PDF pages online and download a clean PDF document.",
    changeFrequency: "monthly",
    priority: 0.78,
  },
  {
    path: "/watermark-pdf",
    title: "Watermark PDF Online | Add Text Watermark",
    description:
      "Add a text watermark to PDF files online and download the watermarked document.",
    changeFrequency: "monthly",
    priority: 0.76,
  },
  {
    path: "/protect-pdf",
    title: "Protect PDF Online | FileWalaTool",
    description:
      "Prepare protected PDF files online with a simple browser-based workflow.",
    changeFrequency: "monthly",
    priority: 0.74,
  },
  {
    path: "/pdf-to-image",
    title: "PDF to Image Online | Convert PDF Pages to Images",
    description:
      "Convert PDF pages into image files online and download page images from your browser.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/word-to-pdf",
    title: "Word to PDF Online | Convert DOCX to PDF",
    description:
      "Convert Word documents to PDF online with a browser-based document workflow.",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/about",
    title: "About Muhammad Sufiyan",
    description:
      "Learn about Muhammad Sufiyan, a Java Full Stack Developer focused on Java, Spring Boot, React, REST APIs, MySQL, and practical web applications.",
    changeFrequency: "monthly",
    priority: 0.72,
  },
  {
    path: "/contact",
    title: "Contact Muhammad Sufiyan",
    description:
      "Contact Muhammad Sufiyan about FileWalaTool, developer work, project feedback, bug reports, or practical web application ideas.",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/privacy",
    title: "Privacy Policy | FileWalaTool",
    description:
      "Read how FileWalaTool handles browser-based file processing, uploaded data, cookies, and contact requests.",
    changeFrequency: "yearly",
    priority: 0.4,
    lastModified: "2026-06-28",
  },
  {
    path: "/terms",
    title: "Terms of Use | FileWalaTool",
    description:
      "Read the terms that apply when using FileWalaTool’s image, PDF, conversion, and document tools.",
    changeFrequency: "yearly",
    priority: 0.4,
    lastModified: "2026-06-28",
  },
];

export const routeByPath = new Map(publicRoutes.map((route) => [route.path, route]));

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalizedPath === "/" ? "/" : normalizedPath}`;
}

export function createPageMetadata({
  path,
  title,
  description,
  image = siteConfig.ogImage,
}: {
  path: string;
  title: string;
  description: string;
  image?: string;
}): Metadata {
  const pageUrl = path === "/" ? siteConfig.url : absoluteUrl(path);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: "en_US",
      title,
      description,
      url: pageUrl,
      images: [
        {
          url: absoluteUrl(image),
          width: 1200,
          height: 630,
          alt: "FileWalaTool social preview showing online image, PDF, convert and document tools.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: absoluteUrl(image),
          alt: "FileWalaTool social preview showing online image, PDF, convert and document tools.",
        },
      ],
    },
  };
}

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": portfolioAbsoluteUrl("/#person"),
    name: portfolioConfig.ownerName,
    alternateName: portfolioConfig.alternateNames,
    jobTitle: portfolioConfig.role,
    url: portfolioAbsoluteUrl("/"),
    image: portfolioAbsoluteUrl(portfolioConfig.ogImage),
    address: {
      "@type": "PostalAddress",
      addressCountry: portfolioConfig.country,
    },
    sameAs: [portfolioConfig.githubUrl],
    knowsAbout: portfolioConfig.knowsAbout,
  };
}

export function profilePageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": portfolioAbsoluteUrl("/#profile"),
    name: `${portfolioConfig.ownerName} - ${portfolioConfig.role}`,
    url: portfolioAbsoluteUrl("/"),
    description: portfolioConfig.description,
    mainEntity: {
      "@id": portfolioAbsoluteUrl("/#person"),
    },
  };
}

export function metadataForPath(path: string): Metadata {
  const route = routeByPath.get(path);

  if (!route) {
    throw new Error(`Missing public route metadata for ${path}`);
  }

  return createPageMetadata({
    path: route.path,
    title: route.title,
    description: route.description,
  });
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webApplicationJsonLd({
  name,
  description,
  path,
  applicationCategory = "WebApplication",
}: {
  name: string;
  description: string;
  path: string;
  applicationCategory?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    applicationCategory,
    operatingSystem: "Any",
    url: absoluteUrl(path),
    description,
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: absoluteUrl("/"),
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.name,
    alternateName: siteConfig.organizationAlternateNames,
    url: absoluteUrl("/"),
    logo: absoluteUrl(siteConfig.logo),
    founder: {
      "@type": "Person",
      name: siteConfig.founderName,
      url: siteConfig.founderPortfolio,
      jobTitle: "Founder of FileWalaTool",
    },
    description: siteConfig.description,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteConfig.name,
    alternateName: siteConfig.alternateNames,
    url: absoluteUrl("/"),
    description: siteConfig.socialDescription,
  };
}

export function founderProfileJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `About ${siteConfig.founderName}`,
    url: absoluteUrl("/about"),
    mainEntity: {
      "@type": "Person",
      name: siteConfig.founderName,
      url: siteConfig.founderPortfolio,
      image: absoluteUrl("/founder-muhammad-sufiyan.webp"),
      jobTitle: "Founder of FileWalaTool",
      worksFor: {
        "@type": "Organization",
        name: siteConfig.name,
        url: absoluteUrl("/"),
      },
      description:
        "Muhammad Sufiyan is the founder of FileWalaTool. He built the platform to provide simple browser-based tools for image, PDF, and document tasks.",
    },
  };
}
