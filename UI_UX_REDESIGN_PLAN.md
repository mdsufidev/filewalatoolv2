# FileWalaTool — Human-Crafted UI/UX Redesign Master Plan
**Milestone:** UI/UX Redesign — Audit, Strategy & Architecture Phase (Planning Only)  
**Author:** Senior Product Designer, UI/UX Specialist, Frontend Architect, Accessibility Expert, and Technical SEO Auditor  
**Date:** October 25, 2026  
**Repository:** `mdsufidev/filewalatoolv2`  
**Target Domain:** `https://www.filewalatool.com`  
**Execution Mode:** STRICT PLANNING ONLY — Zero application source code modifications. Zero package installations.

---

## Table of Contents
1. [Section A: Executive Summary](#section-a-executive-summary)
2. [Section B: Existing Application Audit](#section-b-existing-application-audit)
3. [Section C: UI/UX Problem Inventory](#section-c-uiux-problem-inventory)
4. [Section D: Proposed Visual Direction](#section-d-proposed-visual-direction)
5. [Section E: Coherent Color System](#section-e-coherent-color-system)
6. [Section F: Typography and Spacing System](#section-f-typography-and-spacing-system)
7. [Section G: Component-by-Component Redesign Plan](#section-g-component-by-component-redesign-plan)
8. [Section H: Responsive Design Architecture](#section-h-responsive-design-architecture)
9. [Section I: Accessibility & Usability Plan (WCAG 2.2 AAA/AA)](#section-i-accessibility--usability-plan-wcag-22-aaaa)
10. [Section J: SEO & Functionality Protection Invariant Matrix](#section-j-seo--functionality-protection-invariant-matrix)
11. [Section K: Phased Implementation Plan](#section-k-phased-implementation-plan)
12. [Section L: Risk Register & Mitigation Strategy](#section-l-risk-register--mitigation-strategy)
13. [Section M: Before-and-After Measurable Acceptance Checklist](#section-m-before-and-after-measurable-acceptance-checklist)
14. [Section N: Baseline Metrics & Validation Strategy](#section-n-baseline-metrics--validation-strategy)
15. [Section 12: Mandatory Data Duplication and Content Consistency Audit](#section-12-mandatory-data-duplication-and-content-consistency-audit)

---

## Section A: Executive Summary

### 1. The Core Problem: The AI-Generated "Nested Boxes" Syndrome
Modern generative coding agents frequently generate web user interfaces suffering from what product designers call the **"Nested Boxes Syndrome"**. Instead of organizing information through natural page layout, typographic hierarchy, whitespace, and subtle visual dividers, the interface encapsulates every single thought, control, heading, and metric into an isolated card with rounded borders, heavy padding, and decorative pills.

In FileWalaTool, this has manifested across every major route:
- **Workspace Interfaces (e.g. `/pan-photo-resize`, `/compress-image`, `/merge-pdf`)**: A user uploading a document enters a container hierarchy up to **5 to 7 layers deep**:
  `Page Container (max-w-6xl)` $\rightarrow$ `Workspace Card (p-6 border rounded-lg)` $\rightarrow$ `Top Toolbar (p-4 border rounded-xl)` $\rightarrow$ `Viewport Grid Column` $\rightarrow$ `Viewport Container Card (p-4 border rounded-xl)` $\rightarrow$ `Canvas Wrapper Box (border rounded-lg)` $\rightarrow$ `Slider Adjustment Card (p-4 border rounded-xl)` $\rightarrow$ `Preset Button (border rounded-md)` $\rightarrow$ `Nested Badge Pill (border rounded text-[10px])`.
- **Educational Guides & Hubs (e.g. `/pdf-tools`, `/image-tools`)**: Every single FAQ question is wrapped in its own individual bordered card (`<details className="group rounded-lg border bg-white p-4">`), generating a disjointed stack of 5 or 6 floating rectangles instead of a sleek, unified accordion list.
- **Visual Clutter & Fatigue**: Interfaces are saturated with glowing status pills, redundant pill tags ("Zero Cloud Uploads", "Save 90%", "200 DPI", "JFIF APP0 standard"), repetitive guarantee badges, and dashboard-style widgets that mimic SaaS admin dashboards rather than focused, high-speed document tools.
- **Palette Inconsistency & Clashing**: The codebase currently exhibits an active collision between Tailwind CSS `slate-*` (a cool blue-tinted gray) and `zinc-*` (a cold neutral gray). Some cards render with `bg-slate-900 border-slate-800` right alongside child elements rendering `bg-zinc-950 border-zinc-800` and `text-zinc-600`.
- **Data Fragmentation**: Multiple hardcoded sub-tool catalogs exist across `Navbar.tsx`, `toolsData.ts`, `ImageToolsWrapper.tsx`, `PdfTools.tsx`, `DocumentTools.tsx`, and `FormatConverterSuite.tsx`. Search aliases are defined in `HomePage.tsx` but missing from `CommandPalette.tsx`.

### 2. The Intended Design Direction: Human-Crafted, Functional Swiss/Linear Utility
The goal of this redesign is to transform FileWalaTool into a world-class, human-crafted utility application that feels fast, intentional, trustworthy, and calm.

#### Guiding Principles
1. **Flat, Purposeful Hierarchy (Flatten the Boxes)**: Remove unnecessary visual containers. Replace nested cards with clean whitespace, sharp typography, subtle 1px dividers, and structured grid alignment. Cards are strictly reserved for self-contained, interactive objects (e.g., the primary workspace canvas, tool catalog selection cards, or dropzones).
2. **Harmonized Neutral Palette with Intentional Accent**: Eliminate the clash between `slate` and `zinc`. Standardize on a single, refined neutral scale (`Zinc`) paired with the authentic FileWala brand red (`#E11D2A`) for high-priority identity/accent, subtle interactive feedback states (`#0284c7`), and strict compliance indicators (`#10b981`).
3. **Calm, High-Readability Typography**: Retain the zero-CLS system font stack while establishing strict scale steps. Eliminate oversized dashboard widget headers and excessive uppercase micro-labels.
4. **Single Source of Truth (Zero Data Drift)**: Unify all navigation, search aliases, and category catalogs into `src/core/toolsData.ts` without disrupting canonical routes, prerendered SSR output, or SEO metadata.
5. **Absolute SEO & Functional Invariance**: Protect all 46 canonical routes, semantic `<h1>` through `<h3>` tags, JSON-LD schemas, and 100% client-side privacy architecture.

---

## Section B: Existing Application Audit

### 1. Framework and Styling Architecture
- **Framework**: React 19 (`react: ^19.0.1`, `react-dom: ^19.0.1`).
- **Build Tool**: Vite 8 (`vite: ^8.3.0`, `@vitejs/plugin-react: ^6.1.1`).
- **CSS Architecture**: Tailwind CSS v4 (`tailwindcss: ^4.3.3`, `@tailwindcss/vite: ^4.3.3`). Global configuration resides in `src/index.css` via `@import "tailwindcss";` and `@custom-variant dark (&:where(.dark, .dark *));`.
- **Rendering & Prerendering Model**: Hybrid client-side SPA with static pre-rendering via `scripts/prerender.mjs` and `src/entry-server.tsx` using `react-dom/server`'s `renderToString`.
- **Iconography**: Lucide React (`lucide-react: ^0.546.0`).
- **Animation**: Motion (`motion: ^12.23.24`).
- **Typography & Webfonts**: Zero external font files or Google Fonts loaded. Operates purely on the system sans-serif font stack (`-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;`).
- **Color Theme State**: Managed via `src/core/themeContext.tsx` toggling `html.dark` and `html.light` classes on `document.documentElement`.
  - Default Light Mode: `#ffffff` canvas, `#18181b` primary text.
  - Dark Mode: `#09090b` canvas, `#f4f4f5` primary text.

### 2. Routes Inspected and Catalog Breakdown
All 46 production routes from `public/sitemap.xml` and `src/core/urlRoutes.ts` were audited:
- **Root & Catalogs (2 routes)**:
  - `/` (Homepage / Master Utility Suite)
  - `/tools` (Comprehensive 44-tool catalog)
- **Category Hubs (4 routes)**:
  - `/image-tools` (19 tools)
  - `/pdf-tools` (8 tools)
  - `/convert-tools` (10 tools)
  - `/document-tools` (7 tools)
- **Government & Exam Photo/Signature Suite (7 routes)**:
  - `/pan-photo-resize`, `/signature-resize`, `/passport-photo`, `/passport-signature-resize`, `/upsc-photo-maker`, `/ssc-photo-signature`, `/kb-resizer`
- **Core Private PDF Suite (8 routes)**:
  - `/merge-pdf`, `/compress-pdf`, `/split-pdf`, `/rotate-pdf`, `/pdf-to-image`, `/image-to-pdf`, `/pdf-to-word`, `/pdf-to-text`
- **Core Image Utilities & Converters (19 routes)**:
  - `/compress-image`, `/image-resizer`, `/crop-image`, `/bg-remover`, `/watermark-image`, `/round-corners`, `/meme-generator`, `/color-palette`, `/image-to-base64`, `/batch-image-cropper`, `/filter-adjust`
  - `/jpg-to-png`, `/png-to-jpg`, `/heic-to-jpg`, `/png-to-webp`, `/webp-to-jpg`, `/jpg-to-webp`, `/avif-to-jpg`, `/svg-to-png`
- **Informational, Desktop & Legal Trust Suite (6 routes)**:
  - `/desktop`, `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`

### 3. Verified Shared Layout Components
- `src/components/layout/Navbar.tsx`: Sticky navigation header with category flyout mega-menus, search button trigger, language switcher, and mobile sheet.
- `src/components/layout/HeroSection.tsx`: Homepage banner with status pill, identity headline, and 3-point inline privacy guarantee bar.
- `src/components/layout/HomePage.tsx`: Main catalog view with category segment switcher, local search input, curated category sections, and Windows desktop promotional section.
- `src/components/layout/Footer.tsx`: 4-column footer containing brand identity, tool quick links, legal/trust pages, and client-side architecture summary.
- `src/components/tools/ToolCard.tsx`: Individual tool card component rendered in catalog grids.
- `src/components/tools/ToolGrid.tsx`: Grid wrapper rendering cards with responsive columns.
- `src/components/tools/ComplianceProgressBar.tsx`: 3-step progress stepper used across government form resizers.
- `src/components/ui/Button.tsx`: Base design system button component.
- `src/components/ui/Dropzone.tsx`: Drag-and-drop file upload target.
- `src/components/ui/Slider.tsx`: Custom range slider for quality and dimensional adjustments.
- `src/components/navigation/CommandPalette.tsx`: Global search modal (`Ctrl+K`).
- `src/components/seo/CategoryHubGuide.tsx`: Educational and workflow section rendered on category hubs.
- `src/components/seo/GovtToolsSeoGuide.tsx`: Specification matrix and guidance rendered on `/document-tools`.
- `src/components/tools/pdf/PdfToolGuideSection.tsx`: Educational guides and FAQ accordions for PDF tools.
- `src/components/tools/image/ImageToolGuideSection.tsx`: Educational guides and FAQ accordions for image tools.

---

## Section C: UI/UX Problem Inventory

The following table details verified issues across the application, categorized by severity, usability impact, and implementation risk:

| # | Page / Component | Verified Problem | Why It Hurts Usability / Visual Quality | Proposed Human-Crafted Fix | Severity | Implementation Risk |
|---|---|---|---|---|---|---|
| **ISS-01** | `PanPhotoResizer.tsx`, `GovCompressor.tsx`, `UpscPhotoMaker.tsx` | **5-Layer Nested Container Problem**: Tool workspace wraps top toolbar in a card, viewport in a card, transform controls in a card, live checklist in a card, and actions in a card, all inside an outer card. | Creates visual heaviness, wastes screen real estate on mobile/tablets, causes scroll fatigue, and feels like an unpolished admin template. | Remove the outer card and secondary wrapper boxes. Use a clean, two-column flat workspace where canvas sits directly on the page surface with controls grouped by subtle borders or whitespace. | **Critical** | Low (Scoped CSS & Layout only) |
| **ISS-02** | `CompressorTool.tsx`, `ResizerTool.tsx`, `MergePdfTool.tsx` | **Color Palette Clashing (Slate vs. Zinc)**: Elements arbitrarily mix `bg-slate-900`, `border-slate-800`, `text-slate-400` with `bg-zinc-900`, `border-zinc-800`, `text-zinc-600` inside the same container. | Slate possesses cool blue undertones while Zinc is neutral cold gray. Their juxtaposition looks like accidental copy-pasting from different templates. | Normalize 100% of gray utility classes to the `zinc-*` scale across all tools and components. | **High** | Very Low (Find-and-replace tokens) |
| **ISS-03** | `PdfToolGuideSection.tsx`, `ImageToolGuideSection.tsx` | **Card-Per-Question FAQ Syndrome**: Each FAQ item `<details>` is wrapped in an individual floating bordered card (`rounded-lg border p-4 bg-white`). | In a section with 5 FAQs, the user sees 5 separate boxes floating next to each other. This breaks reading rhythm and looks disjointed. | Convert FAQ sections into a single clean container with subtle horizontal dividers (`divide-y divide-zinc-200 dark:divide-zinc-800`), standard in Stripe/Linear documentation. | **Medium** | Low (No text change, SSR safe) |
| **ISS-04** | `Footer.tsx` | **Interactive Elements Rendered as `<button>` Without `href`**: Navigation links for `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`, `/desktop` are `<button type="button" onClick={...}>`. | Users cannot middle-click or right-click "Open in new tab", hurting browser navigation habits. Search crawlers do not see native `<a>` hyperlinking. | Render semantic `<a>` links with valid `href` attributes, using client-side event interception (`onClick={(e) => { if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); navigate(); }}}`). | **High** | Medium (Preserve SSR routing) |
| **ISS-05** | `HomePage.tsx` vs `CommandPalette.tsx` | **Search Inconsistency / Missing Aliases**: `HomePage.tsx` contains 400 lines of rich bilingual search aliases (e.g. "hastakshar", "pan card", "chhota"), while `CommandPalette.tsx` (`Ctrl+K`) searches only literal tool titles. | A user opening `Ctrl+K` and typing "pan card" or "20kb" gets 0 results, whereas searching on the homepage succeeds. Confusing and broken user expectation. | Extract `SEARCH_ALIASES` to `src/core/toolsData.ts` and import it into both `HomePage.tsx` and `CommandPalette.tsx`. | **High** | Low (Safe centralized data) |
| **ISS-06** | `ToolCard.tsx` | **Missing Semantic `<a>` Wrapper**: Tool cards in grids use `<div role="button" tabIndex={0} onClick={...}>` instead of semantic anchor tags. | Impairs accessibility, prevents browser context menu "Open link in new tab", and degrades internal link graph crawlability. | Wrap card in semantic `<a href={toolRoute}>` while retaining client-side navigation handlers. | **High** | Medium (Ensure prerendered HTML links match canonical routes) |
| **ISS-07** | `Navbar.tsx` | **Hardcoded Duplicate Tool Catalog with Miscategorization**: `Navbar.tsx` defines its own `IMAGE_SUBTOOLS` (20 items, incorrectly mixing in converters), `PDF_SUBTOOLS`, `CONVERT_SUBTOOLS`, and `DOCUMENT_SUBTOOLS` with separate badge text and hardcoded counts (`count: 20` vs `19` in `toolsData.ts`). | Violates DRY architecture, causes maintenance drift, and displays inconsistent tool counts between header and page body. | Derive navigation dropdowns directly from `ALL_TOOLS` in `src/core/toolsData.ts`. | **Medium** | Low (Internal component refactor) |
| **ISS-08** | Global Workspaces (`PanPhotoResizer.tsx`, `CompressorTool.tsx`) | **Pill Badge Saturation**: Excessive decorative pill tags clutter headers: "100% Client-Side Engine", "Zero Cloud Uploads", "Protean (NSDL) & UTIITSL", "Save 90%", "200 DPI", "JFIF APP0 standard". | Badge fatigue. When everything is highlighted as special, nothing stands out. Dilutes the primary action and distracts from the core task. | Restrict pill badges to essential compliance or status indicators. Convert secondary badges to clean metadata text (`text-xs text-zinc-500`). | **Medium** | Very Low |
| **ISS-09** | `ComplianceProgressBar.tsx` | **Visual Overload on Mobile**: 3-step compliance stepper occupies significant vertical height on mobile viewports with bulky step containers. | Pushes the actual image upload dropzone below the fold on mobile screens (iPhone SE / 375px width). | Streamline progress bar into a compact, single-row indicator with subtle numbered nodes and minimalist connecting lines. | **Medium** | Low |
| **ISS-10** | `Button.tsx` and custom tool buttons | **Inconsistent Corner Radii**: Some buttons use `rounded-md` (6px), others use `rounded-xl` (12px), `rounded-2xl` (16px), or `rounded-full` (9999px). | Lacks cohesive craft. The interface appears assembled from disparate third-party UI component libraries. | Standardize corner radius system: `rounded-md` (6px) for standard buttons, inputs, and small badges; `rounded-lg` (8px) for cards and primary workspaces; eliminate `rounded-2xl` and arbitrary `rounded-full` pills. | **Low** | Very Low |

---

## Section D: Proposed Visual Direction

### 1. Design Personality: Swiss Precision Meets Modern Linear Aesthetic
FileWalaTool is not a social media app, a crypto project, or an enterprise CRM dashboard. It is a **precision utility suite** used by Indian citizens, job applicants, students, cyber-café operators, and remote workers who want to format photos, compress PDFs, and convert files in 2 seconds without privacy anxiety.

The redesign will embody:
- **Calm Authority**: Clean, neutral surfaces that inspire immediate trust for sensitive government documents (PAN cards, Passports, SSC exam certificates).
- **Zero Decorative Slop**: No floating 3D spheres, no purple AI gradients, no pulsating decorative glow rings, and no pointless card nesting.
- **Content-First Workspace**: When a user enters `/pan-photo-resize`, the interactive viewport and alignment frame dominate the view. The controls feel like a physical precision instrument (like Leica or Braun hardware).

```
+-----------------------------------------------------------------------------------+
|  FileWalaTool    [Image Tools]  [PDF Tools]  [Govt Forms]  [Converters]   [Ctrl+K] |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  PAN Photo Resizer & DPI Formatter                                                |
|  Protean (NSDL) & UTIITSL Specifications · 200×230 px · 20–50 KB · 200 DPI        |
|                                                                                   |
|  +-------------------------------------+  +------------------------------------+  |
|  |  INTERACTIVE VIEWPORT               |  |  SPECIFICATIONS & CONTROLS         |  |
|  |                                     |  |                                    |  |
|  |       [Biometric Head Guide]        |  |  Portal Preset: [Protean 200x230]  |  |
|  |                                     |  |  Zoom:      [-----O----------]     |  |
|  |          (Passport Portrait)        |  |  Rotate:    [ 90° ] [ Flip H ]     |  |
|  |                                     |  |  DPI:       [ 200 DPI Embedded ]   |  |
|  |                                     |  |                                    |  |
|  |  [ + Zoom ] [ - Zoom ] [ Reset ]    |  |  Target Size: 20 KB – 50 KB        |  |
|  |                                     |  |  Current Size: 34.2 KB  ✓ Valid    |  |
|  +-------------------------------------+  |                                    |  |
|                                           |  [ Download 200 DPI JPEG (34 KB) ] |  |
|                                           +------------------------------------+  |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  Frequently Asked Questions                                                       |
|  > What are the exact photo dimensions required for PAN card applications?        |
|  > How does FileWala embed 200 DPI into the JPEG header?                          |
|  > Are my identity documents uploaded to any remote server?                       |
+-----------------------------------------------------------------------------------+
```

### 2. Principles of Container Reduction ("Flatten the Boxes")
1. **The Single-Surface Rule**: The page background (`#ffffff` light, `#09090b` dark) is the primary canvas. Controls and text rest directly on the surface unless physical separation is functionally required for containment (such as a canvas viewport or an isolated preview card).
2. **Dividers Over Boxes**: Use hairline 1px borders (`border-zinc-200 dark:border-zinc-800`) or generous whitespace (`gap-8`, `space-y-6`) rather than wrapping everything in an enclosed container with background tinting and shadows.
3. **Typography-Driven Hierarchy**: Contrast between `font-bold tracking-tight text-zinc-950` and `text-zinc-500 font-normal` creates visual structure without needing a card border to group them.

---

## Section E: Coherent Color System

### 1. Palette Philosophy: Neutral Cold Grays with Intentional Brand Red
The brand identity features the iconic FileWala red (`#E11D2A`). To ensure maximum readability, calm elegance, and professional trust, the color system is strictly partitioned:
- **Canvas & Surface**: Pure, high-contrast monochrome (`Zinc` scale).
- **Brand Accent (`#E11D2A`)**: Reserved strictly for the brand logotype, primary brand markers, and key focal interactions.
- **Action/Interactive Accent (`#0284c7` Sky 600 / `#0ea5e9` Sky 500)**: Used for interactive focus rings, active sliders, and primary utility highlights.
- **Compliance/Success (`#10b981` Emerald 500)**: Used exclusively to indicate government validation success (e.g. "Size: 34 KB — Portal Compliant ✓").

### 2. Exact Color Token Specification

| Token Name | Light Mode HEX | Dark Mode HEX | Intended Usage & Purpose | WCAG Contrast Ratio |
|---|---|---|---|---|
| `--color-canvas` | `#FFFFFF` | `#09090B` | Default page background | Base |
| `--color-surface` | `#FAFAFA` | `#121215` | Secondary panels, dropzones, workspace canvas backing | 1.1:1 vs canvas |
| `--color-surface-hover` | `#F4F4F5` | `#18181B` | Hover state for interactive cards and list items | Clean 150ms transition |
| `--color-surface-active` | `#E4E4E7` | `#27272A` | Active, pressed, or selected toggle state | Distinct tactile feel |
| `--color-border-subtle` | `#E4E4E7` | `#27272A` | Hairline dividers, card outlines, subtle separators | 1.2:1 (Non-text boundary) |
| `--color-border-strong` | `#D4D4D8` | `#3F3F46` | Input borders, interactive button borders, focus targets | 3.1:1 (UI component boundary) |
| `--color-text-primary` | `#09090B` | `#F4F4F5` | Primary headings, titles, active button text, file metrics | **19.8:1 (AAA Compliant)** |
| `--color-text-secondary` | `#52525B` | `#A1A1AA` | Body copy, descriptions, helper labels, instructions | **7.2:1 (AAA Compliant)** |
| `--color-text-muted` | `#71717A` | `#71717A` | Metadata, timestamps, shortcuts, disabled states | **4.6:1 (AA Compliant)** |
| `--color-brand` | `#E11D2A` | `#EF4444` | Logo accent, identity badges, critical highlights | Distinct brand accent |
| `--color-brand-hover` | `#C81420` | `#DC2626` | Hover state for brand-colored actions | 150ms darkening |
| `--color-interactive` | `#0284C7` | `#38BDF8` | Slider thumbs, range tracks, focus rings, links | **5.4:1 (AA Compliant)** |
| `--color-success` | `#059669` | `#10B981` | Validation passed, compliant file size, copy confirmed | **4.9:1 (AA Compliant)** |
| `--color-warning` | `#D97706` | `#F59E0B` | Near-threshold file size, quality degradation alert | **4.6:1 (AA Compliant)** |
| `--color-error` | `#DC2626` | `#F87171` | Invalid file format, size exceeded, upload failure | **5.1:1 (AA Compliant)** |

### 3. Elimination of Palette Clashing
All instances of Tailwind CSS `slate-*` classes (`bg-slate-50`, `bg-slate-800`, `bg-slate-900`, `text-slate-400`, `border-slate-800`, etc.) will be replaced with their exact corresponding `zinc-*` equivalents:
- `text-slate-400` $\rightarrow$ `text-zinc-400`
- `text-slate-600` $\rightarrow$ `text-zinc-600`
- `bg-slate-50` $\rightarrow$ `bg-zinc-50`
- `bg-slate-800` $\rightarrow$ `bg-zinc-800`
- `bg-slate-900` $\rightarrow$ `bg-zinc-900`
- `border-slate-800` $\rightarrow$ `border-zinc-800`
- `border-slate-200` $\rightarrow$ `border-zinc-200`

---

## Section F: Typography and Spacing System

### 1. Font Family & Rendering Strategy
- **Font Stack**: Zero external network requests. Continues using the native, zero-CLS system font stack:
  ```css
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  ```
- **Monospace Stack**: Used for pixel coordinates, file byte measurements, and DPI indicators:
  ```css
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  ```
- **Rendering Enhancements**: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility;`.

### 2. Typographic Scale

| Level | Size (Desktop) | Size (Mobile) | Line Height | Weight | Tracking | Usage |
|---|---|---|---|---|---|---|
| `H1` (Page Title) | `2.25rem` (36px) | `1.75rem` (28px) | `1.2` | Bold (700) | `-0.025em` | Main tool / page title |
| `H2` (Section Title)| `1.5rem` (24px) | `1.25rem` (20px) | `1.3` | Semibold (600) | `-0.02em` | Major sections, guides, FAQs |
| `H3` (Component Sub)| `1.125rem` (18px) | `1.0rem` (16px) | `1.4` | Semibold (600) | `-0.015em` | Card titles, controls grouping |
| `Body Large` | `1.0rem` (16px) | `0.9375rem` (15px)| `1.6` | Normal (400) | `normal` | Hero intro, featured copy |
| `Body Standard` | `0.875rem` (14px)| `0.875rem` (14px)| `1.5` | Normal (400) | `normal` | Workspace instructions, FAQs |
| `Microcopy/Meta`| `0.75rem` (12px) | `0.75rem` (12px) | `1.4` | Medium (500) | `+0.01em` | Badges, specifications, stats |
| `Code/Numeric` | `0.75rem` (12px) | `0.6875rem` (11px)| `1.3` | Mono (500) | `normal` | KB sizes, dimensions (px), DPI |

### 3. Spacing Scale & Layout Container System
- **Container Maximum Widths**:
  - Global Page Container: `max-w-7xl` (1280px) with `px-4 sm:px-6 lg:px-8`.
  - Focused Tool Workspace: `max-w-5xl` (1024px) or `max-w-6xl` (1152px) for dual-column split viewports.
  - Informational / Trust Pages: `max-w-4xl` (896px) for optimal typographic reading length (65–75 characters per line).
- **Rhythm & Spacing Units**:
  - Section Spacing: `py-12 sm:py-16` (eliminate excessive `py-24` padding).
  - Component Spacing: `space-y-6` (24px).
  - Control Row Spacing: `gap-3 sm:gap-4`.
- **Corner Radii Simplification**:
  - Inputs, Buttons, Small Badges: `rounded-md` (6px).
  - Workspaces, Canvases, Modals, Cards: `rounded-lg` (8px).
  - Eliminate all instances of `rounded-2xl` (16px) and `rounded-3xl` (24px).

---

## Section G: Component-by-Component Redesign Plan

### 1. Global Navigation (`Navbar.tsx`)
- **Current State**: Bulky sticky header with custom dropdown mega-menus that independently re-declare tools, icons, and badges. Redundant "Save 90%" badges in menus.
- **Redesign Plan**:
  - Make navigation bar sleeker (`h-14` instead of `h-16`).
  - Dropdowns consume directly from `src/core/toolsData.ts` using stable categories.
  - Clean 2D hover state (`hover:bg-zinc-100 dark:hover:bg-zinc-800/60`).
  - Search trigger displays a crisp `Ctrl+K` (or `⌘K`) pill with subtle 1px border.
  - Mobile sheet navigation is organized into clean accordion groups with smooth disclosure.

### 2. Hero Section (`HeroSection.tsx`)
- **Current State**: Stacks a status pill, brand image, H1 title, subtitle, and an inline 3-point guarantee bar. Contains clashing `dark:text-slate-400`.
- **Redesign Plan**:
  - Remove the floating pill tag. Incorporate the "100% Client-Side Engine" guarantee directly beneath the title in clean, high-contrast typography.
  - Fix color tokens to `zinc-*`.
  - Maintain the official SVG brand logo with crisp vector sharpness.

### 3. Tool Catalog & Grid (`HomePage.tsx`, `ToolGrid.tsx`, `ToolCard.tsx`)
- **Current State**: `ToolCard.tsx` uses `<div role="button">` without semantic `<a>` link tags. Category filter is an inline wrap of buttons with border badges.
- **Redesign Plan**:
  - Wrap each `ToolCard` in a semantic `<a href={toolRoute}>` with client-side routing support to preserve instant SPA navigation while granting crawlers full internal link depth.
  - Clean 2D flat card design: 1px border (`border-zinc-200 dark:border-zinc-800`), flat background, zero box-shadow. Subtle 150ms border highlight (`hover:border-zinc-400 dark:hover:border-zinc-600`) on hover.
  - Remove redundant micro-badges on cards where the title is already self-descriptive.

### 4. Focused Tool Workspaces (`PanPhotoResizer.tsx`, `GovCompressor.tsx`, `CompressorTool.tsx`)
- **Current State**: Deeply nested cards. Header card $\rightarrow$ Toolbar card $\rightarrow$ Viewport card $\rightarrow$ Controls card $\rightarrow$ Metric card.
- **Redesign Plan**:
  - **Flatten the Workspace**: Situate the interactive canvas and controls directly on the surface inside a clean 2-column layout (`lg:grid-cols-12`).
  - **Left Column (Canvas & Viewport, col-span-7)**: Minimalist frame with biometric framing guidelines. Viewport toolbar placed directly atop the canvas without an enclosing outer box.
  - **Right Column (Controls & Compliance, col-span-5)**: Stacked controls (Preset, Zoom slider, Rotation buttons) organized with subtle dividers.
  - **Compliance Indicator**: Replace 4 separate metric boxes with a single, elegant compliance status bar:
    ```
    [✓ Compliant] 200×230 px · 34.2 KB (Target: 20–50 KB) · 200 DPI Embedded
    ```

### 5. Document & PDF Workspaces (`MergePdfTool.tsx`, `PdfViewer.tsx`, `SplitPdfTool.tsx`)
- **Current State**: Success state generates a card containing 4 metric cards (`grid-cols-2 sm:grid-cols-4`) inside another card. Queue reordering buttons have multiple nested container borders.
- **Redesign Plan**:
  - Streamline PDF queue list into a sleek, sortable table or list with clean reorder handles (`ArrowUp`, `ArrowDown`, `Trash2`).
  - Success state displays a clean download banner with inline metrics instead of 4 separate metric boxes.

### 6. Educational Guides & FAQ Accordions (`PdfToolGuideSection.tsx`, `ImageToolGuideSection.tsx`, `GovtToolsSeoGuide.tsx`)
- **Current State**: Each FAQ question is wrapped in its own `<details>` card with border and background.
- **Redesign Plan**:
  - Unify all FAQs into a single accordion list with subtle `divide-y divide-zinc-200 dark:divide-zinc-800`.
  - Keep `<details open={isOpen}>` behavior completely intact to ensure 100% of FAQ text remains present in SSR prerendered HTML for search indexation.
  - Clean chevron rotation without spring oscillation.

### 7. Footer Component (`Footer.tsx`)
- **Current State**: Links render as `<button type="button">` without `href` attributes.
- **Redesign Plan**:
  - Convert all navigation items into semantic `<a>` tags with explicit `href` attributes (`href="/about"`, `href="/contact"`, `href="/privacy"`, `href="/image-tools"`, etc.).
  - Implement client-side navigation handler:
    ```tsx
    const handleLinkClick = (e: React.MouseEvent, path: string) => {
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
        e.preventDefault();
        onNavigatePage(path);
      }
    };
    ```
  - This preserves search engine crawlability and native browser behavior (middle-click to open in new tab) while maintaining instantaneous SPA transitions.

---

## Section H: Responsive Design Architecture

### 1. Viewport Breakpoint Matrix
The application is tested and optimized across six key responsive breakpoints:

| Breakpoint | Minimum Width | Target Devices | Layout Behavior |
|---|---|---|---|
| `xs` | `360px` | Small smartphones (Android budget phones, iPhone SE) | 1-column layout, full-width touch targets, collapsed toolbars, compact compliance indicators. |
| `sm` | `640px` | Standard smartphones (iPhone 14/15, Samsung Galaxy) | 1-column workspace, 2-column tool catalog grid, expanded preset buttons. |
| `md` | `768px` | Small tablets & portrait iPads | 2-column tool catalog grid, side-by-side comparison slider enabled, tablet navigation drawer. |
| `lg` | `1024px` | iPad Pro landscape, smaller laptops (13") | 2-column asymmetric workspace (col-span-7 viewport, col-span-5 controls), 3-column catalog grid. |
| `xl` | `1280px` | Standard desktop displays (1080p monitors) | 4-column tool catalog grid, maximum workspace comfort with simultaneous live preview. |
| `2xl` | `1536px` | Ultra-wide monitors, 4K displays | Centered `max-w-7xl` container preventing awkward over-stretching of tool workspaces. |

### 2. Touch Target & Mobile Usability Invariants
- Minimum touch target size for all buttons, sliders, and interactive inputs: **$44 \times 44\text{ px}$** (meeting WCAG 2.5.5 and Apple HIG standards).
- Range sliders for quality and dimensional adjustment must maintain generous thumb hitboxes ($24\text{px}$ diameter with invisible $48\text{px}$ touch envelope).
- Viewport canvases on mobile support native pinch-to-zoom and one-finger pan gestures without triggering document viewport rubber-banding.

---

## Section I: Accessibility & Usability Plan (WCAG 2.2 AAA/AA)

### 1. Contrast Ratios & Visual Perception
- All body text and instructions achieve **WCAG AAA** contrast: $\ge 7.0:1$ (Light: `#52525B` on `#FFFFFF` is $7.2:1$; Dark: `#A1A1AA` on `#09090B` is $8.1:1$).
- All primary headings achieve $\ge 14:1$.
- Non-text UI boundaries (inputs, active button borders) achieve $\ge 3.0:1$.

### 2. Keyboard Navigation & Focus Rings
- All interactive elements must maintain a high-visibility, 2px focus ring with 2px offset:
  ```css
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950
  ```
- Logical tab order strictly follows visual layout from top-left to bottom-right.
- Global skip link remains at the root of `App.tsx`: `<a href="#main-content" className="sr-only focus:not-sr-only ...">Skip to content</a>`.

### 3. ARIA Landmarks & Screen Reader Support
- Semantic HTML tags used throughout: `<header>`, `<nav aria-label="...">`, `<main id="main-content">`, `<section>`, `<article>`, `<aside>`, `<footer>`.
- Accordion sections use proper `<details>` and `<summary>` tags with accessible names.
- File upload dropzones provide explicit `aria-label="Upload document for processing"` and announce file selection via live region toasts.

### 4. Reduced Motion Invariants
- Respect user operating system preferences:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## Section J: SEO & Functionality Protection Invariant Matrix

The following table defines the non-negotiable boundaries that must remain completely intact during any visual refactoring:

| Invariant Category | What Must Remain Unchanged | Verification Command / Method | Risk of Regressing |
|---|---|---|---|
| **Canonical URLs & Paths** | All 46 canonical URLs in `urlRoutes.ts` and `sitemap.xml` must not be renamed, redirected, or altered. | `npm.cmd run verify:seo` (must exit 0 with 46/46 passed). | Severe |
| **Document Head & Metadata** | Title tags, meta descriptions, OpenGraph tags, and Twitter cards computed in `ToolJsonLdSeo.tsx`. | Prerender HTML inspection of `<title>` and `<meta name="description">`. | Severe |
| **Heading Hierarchy (H1-H6)** | Exact text content of all `<h1>` tags on all 46 routes. Semantic hierarchy (`h1` $\rightarrow$ `h2` $\rightarrow$ `h3`) without skipping levels. | `scripts/verify-all-routes.ts` enforces exact string matching for every route's `H1`. | Severe |
| **Structured Data (JSON-LD)** | Schema.org `@graph` definitions (SoftwareApplication, WebPage, FAQPage, HowTo) generated by `ToolJsonLdSeo.tsx`. | `npm.cmd run verify:seo` checks JSON-LD presence and valid syntax. | Severe |
| **Prerendered HTML Content** | All tool descriptions, step guides, pro tips, technical specs, and FAQ answers must be present in static HTML. | Verification script parses `dist/<route>/index.html` ensuring body character count > 25,000. | Severe |
| **100% Client-Side Architecture** | Zero file uploads to servers. All processing inside HTML5 Canvas, WebAssembly, `pdf-lib`, `pdfjs-dist`, `docx`, and `tesseract.js`. | Network tab inspection during file processing: zero outgoing POST/PUT requests for files. | Critical |
| **Interactive Event Handlers** | All canvas transforms, zoom, pan, rotation, flip, DPI embedding, compression solvers, and download triggers. | Manual smoke testing of representative tools (`PanPhotoResizer`, `MergePdfTool`). | High |

---

## Section K: Phased Implementation Plan

The redesign must be executed in small, reviewable, non-destructive batches:

### Batch 1: Design Tokens, Global Styles & Layout Shell
- **Scope**: `src/index.css`, `src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx`, `src/components/layout/HeroSection.tsx`, `src/components/ui/Button.tsx`.
- **Target Changes**:
  - Establish Zinc color variables and remove all `slate-*` classes from shell components.
  - Update `Button.tsx` variants with standardized `rounded-md` radius and WCAG AAA focus rings.
  - Convert `Footer.tsx` buttons to semantic `<a>` links with client-side SPA routing.
  - Simplify `HeroSection.tsx` and streamline `Navbar.tsx` height and mega-menus.
- **Invariants**: All 46 route resolutions, title tags, and canonical links.
- **Verification Gates**: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run verify:seo`.

### Batch 2: Catalog, Category Hubs & Tool Cards
- **Scope**: `src/components/layout/HomePage.tsx`, `src/components/tools/ToolCard.tsx`, `src/components/tools/ToolGrid.tsx`, `src/components/tools/ToolCategoryFilter.tsx`, `src/components/navigation/CommandPalette.tsx`.
- **Target Changes**:
  - Convert `ToolCard.tsx` to semantic `<a>` link wrappers.
  - Centralize `SEARCH_ALIASES` in `src/core/toolsData.ts` and wire into `CommandPalette.tsx`.
  - Flatten category active header cards and Swiss section dividers.
- **Invariants**: Tool IDs, category slugs, search filtering behavior, and prerendered catalog HTML.
- **Verification Gates**: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run verify:seo`.

### Batch 3: Government Form Resizers & Core Image Workspaces
- **Scope**: `PanPhotoResizer.tsx`, `GovCompressor.tsx`, `PassportPhotoResizer.tsx`, `UpscPhotoMaker.tsx`, `SscResizer.tsx`, `CompressorTool.tsx`, `ResizerTool.tsx`, `CropRotateTool.tsx`.
- **Target Changes**:
  - Flatten the 5-layer nested box hierarchy. Eliminate redundant outer wrapper cards.
  - Lay out interactive canvas and controls directly on the surface.
  - Unify progress bar into a compact, single-row indicator.
  - Replace multiple metric boxes with a single compliance status bar.
- **Invariants**: Zero changes to canvas pixel mathematics, DPI headers (JFIF APP0), target KB solvers, or download filenames.
- **Verification Gates**: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run verify:seo`, manual photo download validation.

### Batch 4: PDF Suite, Format Converters & Educational Guides
- **Scope**: `MergePdfTool.tsx`, `CompressPdfTool.tsx`, `SplitPdfTool.tsx`, `RotatePdfTool.tsx`, `PdfToImageTool.tsx`, `FormatConverterSuite.tsx`, `PdfToolGuideSection.tsx`, `ImageToolGuideSection.tsx`, `CategoryHubGuide.tsx`.
- **Target Changes**:
  - Simplify PDF success dashboard; remove nested metric cards.
  - Convert FAQ card lists into unified, elegant `divide-y` accordions.
  - Normalize converter controls and dropzones to the Zinc design system.
- **Invariants**: Complete FAQ answer text in prerendered HTML (`<details open={isOpen}>`), PDF merge/compress logic, DOCX/OCR processing.
- **Verification Gates**: `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run verify:seo`.

---

## Section L: Risk Register & Mitigation Strategy

| Risk ID | Potential Risk | Impact | Probability | Mitigation Strategy |
|---|---|---|---|---|
| **RSK-01** | Replacing `<button>` with `<a>` in `Footer` or `ToolCard` causes full browser page reloads instead of SPA transitions. | High | Medium | Implement standard SPA link handler that intercepts left-clicks without modifier keys (`e.preventDefault()`) and delegates to the internal router. |
| **RSK-02** | Modifying FAQ accordion styling causes answers to be omitted from prerendered HTML output. | Critical | Low | Retain `<details open={isOpen}>` structure. The prerender script parses SSR DOM where all answers remain rendered in the markup. |
| **RSK-03** | Removing wrapper containers breaks layout alignment on mobile devices or causes horizontal overflow. | High | Medium | Enforce `overflow-x-clip` on `html` and verify responsive layouts across 360px, 640px, 768px, 1024px, and 1280px. |
| **RSK-04** | Renaming or editing heading tags during styling changes triggers SEO verification failures. | Critical | Low | Strictly style headings using Tailwind CSS utility classes without altering the JSX heading tag (`h1`, `h2`, `h3`) or its exact string content. |
| **RSK-05** | Tailwind CSS v4 class name changes cause unstyled elements. | Medium | Low | Use only standard, verified Tailwind v4 utility classes. Run `npm.cmd run build` to verify CSS compilation without warnings. |

---

## Section M: Before-and-After Measurable Acceptance Checklist

| Evaluation Criterion | Current State (Baseline) | Target State (Redesigned) | Verification Method |
|---|---|---|---|
| **Container Depth in Tool Workspaces** | Up to 7 nested boxes (Page $\rightarrow$ Card $\rightarrow$ Toolbar $\rightarrow$ Col $\rightarrow$ Viewport $\rightarrow$ Canvas $\rightarrow$ Metric). | Maximum 2 levels (Page $\rightarrow$ Canvas & Controls). | DOM depth inspection in browser DevTools. |
| **Color System Coherence** | Mixed `slate-*` (cool blue) and `zinc-*` (neutral) classes across tools. | 100% unified `zinc-*` palette with single brand accent (`#E11D2A`). | Grep codebase for `slate-` classes (target: 0 in components). |
| **FAQ Visual Structure** | 5 isolated floating cards per FAQ section. | 1 clean, unified accordion list with hairline dividers. | Visual inspection on `/pdf-tools` and `/image-tools`. |
| **Footer Navigation Semantics** | `<button type="button">` without `href`. | Semantic `<a href="...">` with SPA event interception. | HTML inspection: all links have valid relative paths. |
| **Search Consistency** | `Ctrl+K` misses Hindi aliases; Homepage search has them. | Both interfaces query the identical centralized alias registry. | Search "hastakshar" in `CommandPalette`: returns Signature Resizer. |
| **Touch Target Compliance** | Some control buttons measure 32px height on mobile. | All mobile touch targets measure $\ge 44 \times 44\text{ px}$. | Chrome DevTools Lighthouse Accessibility Audit ($\ge 98$). |
| **SEO Verification Invariants** | 46/46 routes pass all verification checks. | 46/46 routes pass all verification checks with zero regressions. | `npm.cmd run verify:seo` exits with code 0. |

---

## Section N: Baseline Metrics & Validation Strategy

### 1. Current Verified Baseline (Run Date: October 25, 2026)
- **TypeScript Static Analysis (`npm.cmd run lint`)**:
  - Command: `tsc --noEmit`
  - Result: **0 errors. Exited with code 0.**
- **SEO & Canonical Route Audit (`npm.cmd run verify:seo`)**:
  - Command: `tsx scripts/verify-all-routes.ts`
  - Routes Audited: **46 / 46 URLs**
  - Canonical URL Matches: **46 / 46 (100% Passed)**
  - Exact H1 Matches: **46 / 46 (100% Passed)**
  - Unique Body Content: **46 / 46 (100% Passed)**
  - JSON-LD Schemas: **46 / 46 (100% Passed)**
  - Result: **Exited with code 0.**
- **SSR Prerendering & Production Build (`npm.cmd run build`)**:
  - Commands: `vite build`, `vite build --ssr`, `node scripts/prerender.mjs`
  - Status: Fully operational. Generates static prerendered HTML for all 46 routes in `dist/`.

### 2. Validation Commands for Implementation Phases
During any future implementation phase, every batch must pass the following sequence prior to acceptance:
```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run verify:seo
```

---

## Section 12: Mandatory Data Duplication and Content Consistency Audit

### 1. Architecture Context: 100% Client-Side Static Application
FileWalaTool operates entirely inside the client's web browser using React, Vite, HTML5 Canvas, WebAssembly, and static SSR prerendering.
> [!IMPORTANT]
> **Database Deduplication Not Applicable**: The application has **no backend SQL or NoSQL database** for tools, metadata, users, or files. Files are never stored on a server. The only external service is Google Firebase Firestore used exclusively for receiving optional contact inquiries (`contact_messages`), which contains no application tool data. Therefore, database/API deduplication is **not applicable**. The duplication in FileWalaTool exists entirely within **source code arrays, component configurations, and search dictionaries**.

### 2. Taxonomy of Duplication Identified
1. **Architecture Duplication (Multiple Hardcoded Tool Catalogs)**: The application maintains at least 6 separate tool catalog arrays with redundant names, icons, descriptions, and badge text.
2. **Data Inconsistency (Divergent Routes & SubTool IDs)**: In some arrays, legacy sub-route strings like `'document-tools/pan-photo-resizer'` are used instead of canonical routes like `'/pan-photo-resize'`.
3. **Feature Gap via Inconsistent Data Consumer (Search Aliases)**: Rich search aliases exist in `HomePage.tsx` but are completely absent from `CommandPalette.tsx`.
4. **Rendering Duplication (Redundant Pill Badges)**: Identical status claims ("100% Client-Side", "Zero Cloud Uploads") are rendered multiple times within the same vertical scroll viewport.

### 3. Detailed Duplication Findings Table

| Location / Identifier | Duplication Type | Evidence | Severity | Recommended Fix | SEO / Functional Risk |
|---|---|---|---|---|---|
| `src/components/layout/Navbar.tsx`<br>`IMAGE_SUBTOOLS`, `PDF_SUBTOOLS`, `CONVERT_SUBTOOLS`, `DOCUMENT_SUBTOOLS` | **Architecture Duplication & Data Inconsistency** | `Navbar.tsx` re-declares 45 subtool entries (lines 70–128). `IMAGE_SUBTOOLS` lists 20 tools (including format converters and image-to-pdf), while `toolsData.ts` lists 19 image tools. In hardcoded `NAV_CATEGORIES`, image count is set to 20 instead of 19. | **High** | Refactor `Navbar.tsx` to derive dropdown categories dynamically from `ALL_TOOLS` in `src/core/toolsData.ts`. | **Low**: Internal navigation only. Preserves route targets. |
| `src/components/tools/ImageToolsWrapper.tsx`<br>`IMAGE_TOOLS_LIST` | **Architecture Duplication** | Re-declares 11 image tools with redundant labels, Lucide icons, descriptions, and badges (lines 52–120). | **Medium** | Reference `ALL_TOOLS.filter(t => t.category === 'image-tools')` for metadata, keeping only component map local. | **Zero**: No route or content change. |
| `src/components/tools/PdfTools.tsx`<br>`PDF_TOOLS` | **Architecture Duplication** | Re-declares 8 PDF tools with redundant names, icons, descriptions, and keywords (lines 58–110). | **Medium** | Reference `ALL_TOOLS.filter(t => t.category === 'pdf-tools')` for metadata. | **Zero**: Component mapping remains unchanged. |
| `src/components/tools/FormatConverterSuite.tsx`<br>`CONVERTER_TOOLS` | **Architecture Duplication** | Re-declares 8 converter tools with redundant names, from/to labels, and descriptions (lines 49–115). | **Medium** | Maintain technical format specifications (`targetFormat`, `extension`) in an engine map; derive UI labels from `ALL_TOOLS`. | **Zero**: Converter engine logic unaffected. |
| `src/components/tools/DocumentTools.tsx`<br>`GOV_DOCUMENT_TOOLS` | **Data Inconsistency & Legacy Routes** | Re-declares 12 government tools with non-canonical route strings like `'document-tools/pan-photo-resizer'` (line 59) instead of canonical `'/pan-photo-resize'`. | **High** | Update route mappings in `GOV_DOCUMENT_TOOLS` to use canonical route helper `getToolRouteUrl()`. | **Medium**: Protects against broken internal links if this sub-component is activated. |
| `src/components/layout/HomePage.tsx`<br>`SEARCH_ALIASES` | **Data Inconsistency & Functional Gap** | 400 lines of search aliases defined locally in `HomePage.tsx` (lines 49–440). `CommandPalette.tsx` does not import `SEARCH_ALIASES`, causing `Ctrl+K` to fail for non-English queries like "hastakshar" or "pan card". | **High** | Move `SEARCH_ALIASES` to `src/core/toolsData.ts`. Import and consume in both `HomePage.tsx` and `CommandPalette.tsx`. | **Zero**: Significantly improves usability with zero SEO impact. |
| `src/core/toolsData.ts`<br>`CATEGORIES_CONFIG` vs `Navbar.tsx` `NAV_CATEGORIES` | **Architecture Duplication** | Category counts, names, and badges are duplicated. `Navbar.tsx` has `count: 20` for image-tools; `toolsData.ts` has `count: 19`. | **Medium** | Single source of truth: `NAV_CATEGORIES` references `CATEGORIES_CONFIG`. | **Zero**: Cosmetic consistency fix. |
| Multiple tool headers (`CompressorTool.tsx`, `MergePdfTool.tsx`, `HeroSection.tsx`) | **Rendering Duplication** | "100% Client-Side Engine · Zero Cloud Uploads" is rendered in the global hero, then repeated in the tool header, and repeated again in the guide banner. | **Low** | Keep the guarantee banner in the tool guide section; simplify top header to focused tool instructions. | **Zero**: Does not remove indexed guide content. |

### 4. Single Source of Truth Architecture Strategy
To eliminate duplication cleanly without introducing brittle abstractions or breaking existing imports:
1. **Canonical Tool Catalog (`src/core/toolsData.ts`)**:
   - `ALL_TOOLS`: The authoritative array of 44 tools with stable IDs, canonical categories, action sections, subTool IDs, icons, and badges.
   - `CATEGORIES_CONFIG`: The authoritative metadata for the 4 categories (`image-tools`, `pdf-tools`, `convert`, `document-tools`).
   - `SEARCH_ALIASES`: The centralized bilingual search dictionary exported from `toolsData.ts`.
2. **Canonical Route Resolution (`src/core/urlRoutes.ts`)**:
   - `TOOL_ROUTE_DEFINITIONS`: The single source of truth mapping route paths (`/pan-photo-resize`) to active tool state. All navigation elements (`Navbar`, `Footer`, `ToolCard`, `DocumentTools`) must resolve URLs through `getToolRouteUrl()`.
3. **Authoritative Guide Content (`src/core/*ToolsContent.ts`)**:
   - `pdfToolsContent.ts`, `imageToolsContent.ts`, `govToolsContent.ts`, `categoryHubsContent.ts` remain the single source of truth for educational steps, technical specs, and FAQ question-answer pairs. Both visual UI components (`PdfToolGuideSection`) and SEO JSON-LD generators (`ToolJsonLdSeo`) read directly from these modules.

### 5. Implementation Sequence for Deduplication
When approved for implementation in subsequent phases, deduplication must strictly follow this order:
1. **Step 1 (Safe Configuration Consolidation)**: Move `SEARCH_ALIASES` into `src/core/toolsData.ts`. Wire into `CommandPalette.tsx`. Validate with `npm.cmd run lint`.
2. **Step 2 (Shared Navigation Cleanup)**: Refactor `Navbar.tsx` to consume `ALL_TOOLS` and `CATEGORIES_CONFIG`. Verify tool counts match 44 total (19 image, 8 PDF, 10 converter, 7 govt).
3. **Step 3 (Legacy Route Normalization)**: Correct non-canonical route strings in `DocumentTools.tsx` to reference `urlRoutes.ts`.
4. **Step 4 (Validation)**: Run `npm.cmd run verify:seo` and confirm all 46 sitemap routes remain 100% compliant.

---

## Final Planning Confirmation
- **No application source files modified**: The repository working tree remains completely untouched except for this planning document (`UI_UX_REDESIGN_PLAN.md`).
- **No dependencies installed or modified**: `package.json` and `package-lock.json` are unchanged.
- **No implementation executed**: All audits, recommendations, and plans are documented for phased execution upon authorization.
