import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { resolveRouteFromUrl } from './core/urlRoutes';
import { computeSeoMetadata } from './components/seo/ToolJsonLdSeo';
import { ImageToolsWrapper } from './components/tools/ImageToolsWrapper';
import { PdfTools } from './components/tools/PdfTools';
import { FormatConverterSuite } from './components/tools/FormatConverterSuite';
import { DocumentTools } from './components/tools/DocumentTools';
import { AboutUs } from './components/pages/AboutUs';
import { Disclaimer } from './components/pages/Disclaimer';
import { TermsAndConditions } from './components/pages/TermsAndConditions';
import { ContactUs } from './components/pages/ContactUs';
import { DesktopAppPage } from './components/pages/DesktopAppPage';
import { PrivacyPolicy } from './components/pages/PrivacyPolicy';
import { PrivacyModal } from './components/layout/PrivacyModal';

export interface RenderResult {
  html: string;
  title: string;
  description: string;
  canonical: string;
  categoryName: string;
  jsonLd: {
    '@context': string;
    '@graph': any[];
  } | null;
}

export function render(url: string): RenderResult {
  const resolved = resolveRouteFromUrl(url);
  const metadata = computeSeoMetadata(
    resolved.activeTool,
    resolved.activePage,
    resolved.selectedCategory,
    {
      isPrivacyModalOpen: resolved.isPrivacyModalOpen,
      currentPath: resolved.currentPath || url,
    }
  );

  const appHtml = renderToString(
    <App
      initialPath={url}
      toolComponents={{
        ImageToolsWrapper,
        PdfTools,
        FormatConverterSuite,
        DocumentTools,
        AboutUs,
        Disclaimer,
        TermsAndConditions,
        ContactUs,
        DesktopAppPage,
        PrivacyPolicy,
        PrivacyModal,
      }}
    />
  );

  const jsonLd =
    metadata.jsonLdGraph.length > 0
      ? {
          '@context': 'https://schema.org',
          '@graph': metadata.jsonLdGraph,
        }
      : null;

  return {
    html: appHtml,
    title: metadata.title,
    description: metadata.description,
    canonical: metadata.canonical,
    categoryName: metadata.categoryName,
    jsonLd,
  };
}
