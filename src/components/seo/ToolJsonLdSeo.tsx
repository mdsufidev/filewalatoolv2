import React, { useEffect } from 'react';
import { ALL_TOOLS, CATEGORIES_CONFIG, ToolItem, ToolCategory } from '../../core/toolsData';
import { getFlagshipSeoForTool } from '../../core/flagshipSeoData';
import { getToolRouteUrl, getCategoryRouteUrl, getPageRouteUrl } from '../../core/urlRoutes';

export interface ToolJsonLdSeoProps {
  activeTool: { section: string; subToolId: string } | null;
  activePage: string | null;
  selectedCategory?: ToolCategory;
  isPrivacyModalOpen?: boolean;
  currentPath?: string;
}

const BASE_URL = 'https://www.filewalatool.com';

/**
 * Categorizes application category for Schema.org WebApplication
 */
function getApplicationCategory(section: string, subToolId: string): string {
  if (section === 'document-tools') return 'BusinessApplication';
  if (section === 'pdf-tools') return 'UtilitiesApplication';
  if (section === 'convert') return 'MultimediaApplication';
  return 'MultimediaApplication';
}

/**
 * Intelligent HowTo steps generator for structured data based on tool category and action
 */
function generateHowToSteps(toolName: string, category: string, subToolId: string) {
  if (category === 'document-tools') {
    return [
      {
        '@type': 'HowToStep',
        name: 'Upload Document / Photo',
        text: 'Select or drag your photo or signature scan into the designated workspace area.',
        position: 1,
      },
      {
        '@type': 'HowToStep',
        name: 'Select Government Preset',
        text: 'Choose your compliance target (PAN card 213x213px, Passport 35x45mm, SSC, or UPSC date stamp) and adjust target KB.',
        position: 2,
      },
      {
        '@type': 'HowToStep',
        name: 'Download Compliant File',
        text: 'Instant 100% in-browser processing formats your file under required KB limits ready for direct portal upload.',
        position: 3,
      },
    ];
  }

  if (category === 'pdf-tools') {
    return [
      {
        '@type': 'HowToStep',
        name: 'Add PDF Files',
        text: 'Drag & drop one or multiple PDF documents directly into the secure browser canvas.',
        position: 1,
      },
      {
        '@type': 'HowToStep',
        name: 'Configure Options',
        text: 'Reorder pages, select compression ratio, or choose target formats with instant client-side preview.',
        position: 2,
      },
      {
        '@type': 'HowToStep',
        name: 'Save Processed PDF',
        text: 'Download the finalized PDF document immediately to your device with zero server latency and total privacy.',
        position: 3,
      },
    ];
  }

  if (category === 'convert') {
    return [
      {
        '@type': 'HowToStep',
        name: 'Upload Source File',
        text: 'Upload any image or document format (PNG, JPEG, WebP, HEIC, AVIF, SVG, or PDF).',
        position: 1,
      },
      {
        '@type': 'HowToStep',
        name: 'Choose Output Settings',
        text: 'Select desired target format, quality percentage, and transparency retention settings.',
        position: 2,
      },
      {
        '@type': 'HowToStep',
        name: 'Instant In-Browser Conversion',
        text: 'Save the converted file directly to your downloads folder without cloud processing.',
        position: 3,
      },
    ];
  }

  // Default Image Tools
  return [
    {
      '@type': 'HowToStep',
      name: 'Select Image',
      text: 'Drop or browse any PNG, JPEG, WebP, or AVIF image from your phone, tablet, or PC.',
      position: 1,
    },
    {
      '@type': 'HowToStep',
      name: 'Adjust Parameters',
      text: 'Use live sliders to set exact target KB, scale percentages, aspect ratios, or quality values.',
      position: 2,
    },
    {
      '@type': 'HowToStep',
      name: 'Export Sharpened Output',
      text: 'Download the optimized image with real-time before/after comparison and zero loss of clarity.',
      position: 3,
    },
  ];
}

/**
 * Intelligent AEO (Answer Engine Optimization) & GEO Q&A generator
 */
function generateToolFaqs(tool: ToolItem, fullUrl: string) {
  const isGov = tool.category === 'document-tools';
  const isPdf = tool.category === 'pdf-tools';

  const faqs = [
    {
      question: `Are my files uploaded to any online server when using ${tool.name}?`,
      answer: `No. ${tool.name} operates 100% client-side inside your local web browser using HTML5 Canvas, WebAssembly, and local JavaScript memory. Your files are never uploaded to any remote server, database, or third-party cloud.`,
    },
    {
      question: `How does ${tool.name} work in the browser?`,
      answer: `${tool.name} processes file binary streams directly on your device CPU/GPU. This guarantees instantaneous processing speeds, zero upload wait times, and absolute privacy for sensitive personal documents.`,
    },
    {
      question: `Is ${tool.name} free to use on mobile and desktop?`,
      answer: `Yes, ${tool.name} is completely free with no usage limits, no signup requirements, and no watermarks across desktop, tablet, and mobile browsers.`,
    },
  ];

  if (isGov) {
    faqs.push({
      question: `Is the output from ${tool.name} accepted on Indian government portals?`,
      answer: `Yes. ${tool.name} is strictly calibrated to meet official portal upload specifications (including Protean NSDL, UTIITSL, Passport Seva, UPSC, SSC, and EPFO) for exact pixel dimensions, aspect ratios, DPI standards, and file sizes under 20KB-50KB.`,
    });
  } else if (isPdf) {
    faqs.push({
      question: `Can I process multi-page confidential PDFs with ${tool.name}?`,
      answer: `Yes. Because processing runs entirely offline in client memory using WebAssembly, sensitive legal contracts, bank statements, and tax returns remain 100% private on your machine.`,
    });
  }

  return faqs;
}

/**
 * Computes pure SEO metadata, canonical URL, and Schema.org JSON-LD graph.
 * Pure function: runnable on both client and build-time Node.js SSR prerendering.
 */
export function computeSeoMetadata(
  activeTool: { section: string; subToolId: string } | null,
  activePage: string | null,
  selectedCategory: ToolCategory = 'all',
  options?: { isPrivacyModalOpen?: boolean; currentPath?: string }
): {
  title: string;
  description: string;
  canonical: string;
  categoryName: string;
  jsonLdGraph: any[];
} {
  const normPath = options?.currentPath?.replace(/^\//, '').replace(/\/$/, '') || '';
  const isToolsRoute = normPath === 'tools' || normPath === 'all-tools';
  const isPrivacyRoute = Boolean(options?.isPrivacyModalOpen) || normPath === 'privacy' || normPath === 'privacy-policy';

  let title = 'FileWala Tool - Indian Government Document & Photo Resizer Suite';
  let description =
    '100% Client-Side Indian Government Document Resizer. Precision photo and signature compliance for PAN (Protean/UTIITSL), Passport Seva (350x450px), UPSC & SSC (with Date Stamp), EPFO & Banking forms under 20KB-300KB.';
  let canonical = BASE_URL;
  let categoryName = 'All Tools';
  let isGovTool = false;
  let jsonLdGraph: any[] = [];

  const buildAbsoluteUrl = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
  };

  if (activePage) {
    // Standalone informational pages
    const pageUrl = buildAbsoluteUrl(getPageRouteUrl(activePage));
    canonical = pageUrl;

    if (activePage === 'about') {
      title = 'About FileWala & Mohammad Sufiyan (@mdsufidev) | Privacy-First File Tools';
      description =
        'Discover the story behind FileWalaTool, built by Mohammad Sufiyan (@mdsufidev) from Kushinagar. 100% client-side privacy architecture with zero cloud storage.';
    } else if (activePage === 'disclaimer') {
      title = 'Disclaimer | FileWala Tool - Indian Document Utility Suite';
      description =
        'Official non-affiliation disclaimer and compliance terms of use for FileWala client-side tools and government portal utilities.';
    } else if (activePage === 'terms') {
      title = 'Terms & Conditions | FileWala Tool';
      description =
        'Terms of service, fair use, and client-side processing agreements for FileWala document tools.';
    } else if (activePage === 'contact') {
      title = 'Contact Mohammad Sufiyan (@mdsufidev) | FileWala Support';
      description =
        'Get in touch with the creator of FileWalaTool for inquiries, feature requests, partnership, and feedback.';
    } else if (activePage === 'privacy') {
      title = 'Privacy Policy & Zero-Upload Security Architecture | FileWala Tool';
      description =
        'FileWala operates 100% in your local browser RAM with zero server uploads, no cloud data storage, and complete client-side document security.';
    }

    jsonLdGraph = [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: ['en-IN', 'hi-IN', 'en'],
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${BASE_URL}/#website`,
          name: 'FileWala Tool',
          url: BASE_URL,
        },
      },
    ];
  } else if (!activeTool && isPrivacyRoute) {
    canonical = buildAbsoluteUrl('/privacy');
    title = 'Privacy Policy & Zero-Upload Security Architecture | FileWala Tool';
    description =
      'FileWala operates 100% in your local browser RAM with zero server uploads, no cloud data storage, and complete client-side document security.';
    categoryName = 'Privacy';
    jsonLdGraph = [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: ['en-IN', 'hi-IN', 'en'],
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${BASE_URL}/#website`,
          name: 'FileWala Tool',
          url: BASE_URL,
        },
      },
    ];
  } else if (!activeTool && isToolsRoute) {
    canonical = buildAbsoluteUrl('/tools');
    title = 'All Free Online File Tools & Document Utilities | FileWala';
    description =
      'Browse the complete collection of 44 free in-browser file tools, image compressors, PDF converters, and government photo resizers on FileWala.';
    categoryName = 'All Tools';
    jsonLdGraph = [
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: ['en-IN', 'hi-IN', 'en'],
        isPartOf: {
          '@type': 'WebSite',
          '@id': `${BASE_URL}/#website`,
          name: 'FileWala Tool',
          url: BASE_URL,
        },
      },
    ];
  } else if (activeTool) {
    // Find matching ToolItem from ALL_TOOLS registry
    const matchedTool = ALL_TOOLS.find(
      (t) => t.subToolId === activeTool.subToolId || t.id === activeTool.subToolId
    );

    // Check for Flagship SEO config
    const flagship = getFlagshipSeoForTool(activeTool.section, activeTool.subToolId);

    const routePath = getToolRouteUrl(activeTool.section, activeTool.subToolId);
    canonical = buildAbsoluteUrl(routePath);

    const toolCategory = matchedTool?.category || (activeTool.section as ToolCategory);
    isGovTool = toolCategory === 'document-tools' || activeTool.subToolId.includes('pan') || activeTool.subToolId.includes('passport') || activeTool.subToolId.includes('ssc') || activeTool.subToolId.includes('upsc');

    const toolDisplayName = flagship?.toolName || matchedTool?.name || activeTool.subToolId
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const toolDescription = flagship?.description || matchedTool?.description || `Free in-browser ${toolDisplayName} tool with zero server uploads. Fast, private, and secure document processing.`;

    // Set optimized Title & Description for Search Engines & AEO
    if (flagship) {
      title = flagship.title;
      description = flagship.description;
    } else if (isGovTool) {
      title = `${toolDisplayName} – Indian Govt Portal Compliant | FileWala`;
      description = `${toolDescription} 100% compliant with Protean NSDL, UTIITSL, Passport Seva, and SSC portal standards with zero server uploads.`;
    } else {
      title = `${toolDisplayName} Online Free – 100% Client-Side | FileWala`;
      description = `${toolDescription} Fast, browser-based, and zero server upload tool by FileWala.`;
    }

    // Category display name
    const catMeta = CATEGORIES_CONFIG.find((c) => c.id === toolCategory);
    categoryName = catMeta?.name || 'File Utilities';

    // 1. WebApplication Schema
    const webAppEntity: any = {
      '@type': 'WebApplication',
      '@id': `${canonical}#app`,
      name: `FileWala ${toolDisplayName}`,
      url: canonical,
      applicationCategory: getApplicationCategory(activeTool.section, activeTool.subToolId),
      operatingSystem: 'All (Modern Web Browser)',
      browserRequirements: 'Requires JavaScript and HTML5 Canvas. Runs 100% client-side without cloud upload.',
      softwareVersion: '2.1.0',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: isGovTool ? 'INR' : 'USD',
      },
      author: {
        '@type': 'Person',
        name: 'Mohammad Sufiyan (@mdsufidev)',
        url: `${BASE_URL}/about`,
      },
      description: toolDescription,
      featureList: [
        '100% Client-Side Privacy (Zero Server Upload)',
        'Hardware-Accelerated HTML5 Canvas & WebAssembly Processing',
        'Instant Local File Downloads Without Data Storage',
        'Mobile, Tablet, and Desktop Fully Responsive Layout',
        isGovTool ? 'Compliant with Indian Government Upload Rules (Protean, UTIITSL, Passport Seva)' : 'High Fidelity Image & Document Optimization',
      ],
    };

    // 2. HowTo Schema (Step-by-Step Instructions for Google Rich Results & AEO)
    const howToEntity = {
      '@type': 'HowTo',
      '@id': `${canonical}#howto`,
      name: `How to Use ${toolDisplayName}`,
      description: `Step-by-step instructions for using ${toolDisplayName} online securely with zero server uploads.`,
      step: generateHowToSteps(toolDisplayName, toolCategory, activeTool.subToolId),
    };

    // 3. FAQPage Schema (Only emit if tool has verified visible on-page FAQs to strictly comply with Google Search Central guidelines)
    const faqList = flagship?.faqs && flagship.faqs.length > 0 ? flagship.faqs : null;

    const faqEntity = faqList
      ? {
          '@type': 'FAQPage',
          '@id': `${canonical}#faq`,
          mainEntity: faqList.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        }
      : null;

    // 4. BreadcrumbList Schema (Hierarchical Navigation)
    const categoryUrl = buildAbsoluteUrl(getCategoryRouteUrl(toolCategory));
    const breadcrumbEntity = {
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${BASE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: categoryName,
          item: categoryUrl,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: toolDisplayName,
          item: canonical,
        },
      ],
    };

    // 5. Speakable Specification Schema (AEO Voice Search & Generative Summaries)
    const speakableEntity = {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '.tool-description', '.aeo-direct-answer'],
      },
    };

    jsonLdGraph = [
      webAppEntity,
      howToEntity,
      ...(faqEntity ? [faqEntity] : []),
      breadcrumbEntity,
      speakableEntity,
    ];
  } else {
    // Home / Category Overview
    const catUrl = buildAbsoluteUrl(getCategoryRouteUrl(selectedCategory));
    canonical = catUrl;

    if (selectedCategory && selectedCategory !== 'all') {
      const flagshipCat = getFlagshipSeoForTool(selectedCategory, selectedCategory);
      const catMeta = CATEGORIES_CONFIG.find((c) => c.id === selectedCategory);
      if (flagshipCat) {
        title = flagshipCat.title;
        description = flagshipCat.description;
        jsonLdGraph = [
          ...(flagshipCat.schema?.['@graph'] || []),
          {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            name: 'FileWala Tool',
            url: BASE_URL,
            description,
            inLanguage: ['en-IN', 'hi-IN', 'en'],
          },
        ];
      } else if (catMeta) {
        title = `${catMeta.name} – Free Client-Side Utilities | FileWala`;
        description = `${catMeta.description} 100% private in-browser tools with zero server uploads.`;
        jsonLdGraph = [
          {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            name: 'FileWala Tool',
            url: BASE_URL,
            description,
            inLanguage: ['en-IN', 'hi-IN', 'en'],
          },
        ];
      }
    } else {
      jsonLdGraph = [
        {
          '@type': 'Organization',
          '@id': `${BASE_URL}/#organization`,
          name: 'FileWala Tool',
          url: `${BASE_URL}/`,
          logo: `${BASE_URL}/logo.png`,
          founder: {
            '@type': 'Person',
            name: 'Mohammad Sufiyan',
            alternateName: 'mdsufidev',
            url: `${BASE_URL}/about`,
          },
          sameAs: [
            'https://www.reddit.com/r/filewalatool/',
            'https://github.com/mdsufidev',
            'https://linkedin.com/in/mdsufidev',
            'https://instagram.com/mdsufidev',
          ],
        },
        {
          '@type': 'WebSite',
          '@id': `${BASE_URL}/#website`,
          name: 'FileWala Tool',
          url: `${BASE_URL}/`,
          description,
          inLanguage: ['en-IN', 'hi-IN', 'en'],
          sameAs: [
            'https://www.reddit.com/r/filewalatool/',
            'https://github.com/mdsufidev',
            'https://linkedin.com/in/mdsufidev',
            'https://instagram.com/mdsufidev',
          ],
          potentialAction: {
            '@type': 'SearchAction',
            target: `${BASE_URL}/?search={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ];
    }
  }

  return { title, description, canonical, categoryName, jsonLdGraph };
}

/**
 * ToolJsonLdSeo Component
 * Dynamically injects Schema.org JSON-LD structured data (@graph),
 * Answer Engine Optimization (AEO) direct answers for AI search (Google AI Overviews, Perplexity, ChatGPT),
 * and Generative Engine Optimization (GEO) with geotagging and regional authority markers.
 */
export const ToolJsonLdSeo: React.FC<ToolJsonLdSeoProps> = ({
  activeTool,
  activePage,
  selectedCategory = 'all',
  isPrivacyModalOpen,
  currentPath,
}) => {
  useEffect(() => {
    const { title, description, canonical, jsonLdGraph } = computeSeoMetadata(
      activeTool,
      activePage,
      selectedCategory,
      { isPrivacyModalOpen, currentPath }
    );

    // 2. Synchronize Document Title
    document.title = title;

    // 3. Helper to Create or Update Meta Tag
    const setMetaTag = (attribute: string, value: string, content: string) => {
      let meta = document.querySelector(`meta[${attribute}="${value}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, value);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Standard Meta & OpenGraph Tags
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonical);
    setMetaTag('property', 'og:site_name', 'FileWala Tool');
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:url', canonical);

    // GEO / Geotargeting & Regional Authority Metadata
    setMetaTag('name', 'geo.region', 'IN-DL');
    setMetaTag('name', 'geo.placename', 'India');
    setMetaTag('name', 'geo.position', '20.5937;78.9629');
    setMetaTag('name', 'ICBM', '20.5937, 78.9629');

    // 4. Synchronize Canonical & Hreflang Link Tags
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical);

    const updateHreflang = (lang: string, href: string) => {
      const link = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`) as HTMLLinkElement | null;
      if (link) {
        link.setAttribute('href', href);
      }
    };
    updateHreflang('en-IN', canonical);
    updateHreflang('en', canonical);
    updateHreflang('x-default', canonical);
    updateHreflang('hi-IN', canonical.includes('?') ? `${canonical}&lang=hi` : `${canonical}?lang=hi`);

    // 5. Update or Inject Dynamic JSON-LD Structured Data Script
    const scriptId = 'filewala-dynamic-seo-jsonld';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (jsonLdGraph.length > 0) {
      const fullJsonLd = {
        '@context': 'https://schema.org',
        '@graph': jsonLdGraph,
      };

      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = scriptId;
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(fullJsonLd, null, 2);
    } else {
      if (scriptTag) {
        scriptTag.remove();
      }
    }
  }, [activeTool, activePage, selectedCategory, isPrivacyModalOpen, currentPath]);

  return null;
};
