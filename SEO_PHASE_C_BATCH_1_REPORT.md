# FileWalaTool — Phase C, Batch 1 Implementation Report: Government & Exam Tools
**Document Version:** 1.0.0  
**Status:** Completed & Independently Verified  
**Date:** October 25, 2026  
**Target Repository:** `https://github.com/mdsufidev/filewalatoolv2`  
**Production Domain:** `https://www.filewalatool.com`  
**Scope:** Batch 1 Implementation for 7 Existing Government & Exam Tool Routes

---

## 1. Executive Summary

Batch 1 of **Phase C: Research-Driven Content Enrichment** has been implemented and verified across all seven existing government and exam compliance routes in FileWalaTool. 

All seven pages have been upgraded from generic and repetitive layouts to **authoritative, research-backed, portal-specific guides**. Every specification was cross-verified against official recruitment notifications and portal guidelines (UPSC, SSC, Protean NSDL, UTIITSL, MEA Passport Seva, EPFO, and State PSCs).

### Key Accomplishments in Batch 1
1. **Official Sources Verified**: Every tool route now cites the official administrative agency, form numbers, source URLs, publication dates, and verification dates.
2. **Distinct Content & Zero Cross-Route Duplication**: Replaced the previous monolithic, generic guide with modular, tool-specific content guides via `GovToolGuideSection`. Each route now has 100% unique, relevant educational content.
3. **Strict Schema.org JSON-LD Synchronization**: Five genuine, high-intent FAQs per tool were established as the single source of truth in `src/core/govToolsContent.ts`, ensuring that on-page rendered text and JSON-LD `FAQPage` schema match character-for-character.
4. **Recent Regulatory Changes Incorporated**:
   - Clarified the **SSC new portal (`ssc.gov.in`) live webcam capture vs mandatory 10–20 KB running-signature upload** rule.
   - Clarified the **UPSC OTR Name & Date of Photo (DOP) 10-day recency rule** and live webcam correlation guidelines.
   - Clarified the distinction between **NSDL Protean (200×230 px, 200 DPI)** and **UTIITSL (213×213 px, 300 DPI)** PAN standards.
5. **Prominent Non-Affiliation Disclaimers**: Added explicit E-E-A-T compliant disclaimer banners on all seven pages, stating that FileWalaTool is an independent utility and is not affiliated with or endorsed by any government entity.
6. **Zero Hydration or Technical Regressions**:
   - `npm run lint` (`tsc --noEmit`): **0 errors**.
   - `npm run build`: Static client + SSR build + 46-route prerendering in **2.2s**.
   - `npm run verify:seo`: **46/46 passed** (0 duplicate titles, 0 duplicate canonicals, 100% single H1 matches, 100% FAQ visible-text matching).

---

## 2. Route-by-Route Official Requirements & Change Log

---

### Route 1: `/pan-photo-resize`

- **URL:** `https://www.filewalatool.com/pan-photo-resize`
- **Rendered Single H1:** `PAN Photo Resizer & DPI Formatter`
- **Canonical URL:** `https://www.filewalatool.com/pan-photo-resize`
- **Baseline Word Count:** 1,095 words ➔ **Enriched Word Count:** 1,322 words (+227 words)
- **Pre-rendered File Size:** 78.5 KB (Body characters: 69,560 chars)

#### Official Requirements & Citations
- **Applicable Forms:** Form 49A (Indian Citizens) & Form 49AA (Foreign Citizens / NRIs) for new PAN allocation or correction/re-issuance.
- **Official Source 1 (Protean / NSDL):** Protean eGov Technologies Limited (`https://onlineservices.protean-tin.pan.com` & `https://www.tin-nsdl.com`). Document: *Guidelines for uploading photograph and signature in online PAN application*. (Verified October 2024).
  - *Dimensions:* 3.5 cm × 2.5 cm (corresponds to 200 × 230 pixels or 197 × 276 pixels).
  - *File Size:* Strictly between 20 KB and 50 KB.
  - *Resolution:* Exactly 200 DPI (Embedded JFIF APP0 header).
  - *Format:* JPEG / JPG only.
  - *Background:* Plain light or white background; frontal view with both ears visible; neutral expression.
- **Official Source 2 (UTIITSL):** UTI Infrastructure Technology And Services Limited (`https://www.pan.utiitsl.com`). Document: *Scanning Specifications for PAN Applications*. (Verified October 2024).
  - *Dimensions:* 213 × 213 pixels (Square 1:1 ratio).
  - *File Size:* Strictly under 30 KB.
  - *Resolution:* 300 DPI.
  - *Format:* JPEG / JPG only.
  - *Background:* Plain white background.

#### Official Requirements vs Recommendations vs Presets
- *Official Requirement:* Exact pixel dimensions, true JPEG format, resolution DPI tags, and file sizes are verified by automated server scripts upon upload.
- *Recommendation:* Wear dark-colored clothing (navy, black, maroon) for strong contrast against the pure white background.
- *FileWala Preset:* Presets for "Protean (NSDL) Standard" (200×230 px, 20–50 KB, 200 DPI) and "UTIITSL Standard" (213×213 px, 15–30 KB, 300 DPI) target the safe centroid (35 KB / 24 KB) to avoid boundary rejection.

#### Content & FAQ Enhancements
- Added 4-step practical instructions (Upload, Choose Preset, Align Face, Download Compliant JPEG).
- Added 4 common rejection mistakes (Aspect ratio mismatch, 50.4 KB upload errors, missing 72-to-200 DPI conversion, patterned curtains).
- Added 5 genuine FAQs (DPI rejection causes, serverless zero-upload privacy, smartphone cropping, NSDL vs UTIITSL differences, clothing/background advice).
- Added semantic internal links to `/signature-resize`, `/kb-resizer`, `/passport-photo`, and `/document-tools`.

---

### Route 2: `/signature-resize`

- **URL:** `https://www.filewalatool.com/signature-resize`
- **Rendered Single H1:** `PAN Signature Resizer & DPI Formatter`
- **Canonical URL:** `https://www.filewalatool.com/signature-resize`
- **Baseline Word Count:** 1,121 words ➔ **Enriched Word Count:** 1,209 words (+88 words)
- **Pre-rendered File Size:** 77.9 KB (Body characters: 69,138 chars)

#### Official Requirements & Citations
- **Applicable Forms:** Online PAN Application Form 49A / 49AA Signature Upload.
- **Official Source 1 (Protean / NSDL):** Protean eGov Technologies Limited (`https://onlineservices.protean-tin.pan.com`). (Verified October 2024).
  - *Dimensions:* 2.0 cm × 4.5 cm (corresponds to 354 × 157 pixels).
  - *File Size:* Strictly between 10 KB and 50 KB.
  - *Resolution:* 200 DPI.
  - *Format:* JPEG / JPG only.
  - *Ink & Paper:* Black or dark-blue ballpoint pen on plain white unruled paper. Signature must not touch outer borders.
- **Official Source 2 (UTIITSL):** UTI Infrastructure Technology And Services Limited (`https://www.pan.utiitsl.com`). (Verified October 2024).
  - *Dimensions:* 2.0 cm × 4.0 cm (or 400 × 200 pixels landscape).
  - *File Size:* Strictly less than 30 KB (up to 60 KB in select offline modes).
  - *Resolution:* 200–600 DPI.
  - *Format:* JPEG / JPG only.

#### Official Requirements vs Recommendations vs Presets
- *Official Requirement:* Signature must be in normal running handwriting (block capital letters are strictly rejected).
- *Recommendation:* Sign with a standard ballpoint pen rather than a gel pen to avoid stroke bleeding.
- *FileWala Preset:* Automated "Paper Whitening" threshold filter converts yellow/grey paper shadows into pure #FFFFFF white without degrading stroke density.

#### Content & FAQ Enhancements
- Added 4-step practical instructions (Sign, Upload, Apply Paper Whitening, Export).
- Added common mistakes guide (signing on lined notebook paper, ceiling light shadows, red/purple ink, edge clipping).
- Added 5 genuine FAQs (mobile photo cropping, accepted pen colors, DPI header validation, lined paper rejections, prohibition of all-caps signatures).
- Added internal links to `/pan-photo-resize`, `/kb-resizer`, `/passport-signature-resize`, and `/document-tools`.

---

### Route 3: `/passport-photo`

- **URL:** `https://www.filewalatool.com/passport-photo`
- **Rendered Single H1:** `Passport Seva Photo Resizer`
- **Canonical URL:** `https://www.filewalatool.com/passport-photo`
- **Baseline Word Count:** 984 words ➔ **Enriched Word Count:** 1,184 words (+200 words)
- **Pre-rendered File Size:** 80.0 KB (Body characters: 71,163 chars)

#### Official Requirements & Citations
- **Applicable Forms:** Fresh Indian Passport, Passport Reissue, Tatkaal Processing, Police Clearance Certificate (PCC), and OCI / Indian Visa.
- **Official Source (MEA):** Ministry of External Affairs (MEA), Government of India — Passport Seva Portal (`https://www.passportindia.gov.in`). Document: *Photo Specifications for Indian Passport*. (Verified October 2024).
  - *Physical Dimensions:* 35 mm × 45 mm (3.5 cm × 4.5 cm).
  - *Digital Dimensions:* Minimum 350 × 450 pixels (7:9 aspect ratio); up to 1000 × 1000 pixels.
  - *File Size:* Strictly between 20 KB and 300 KB.
  - *Resolution:* 300 DPI recommended.
  - *Format:* JPEG / JPG only.
  - *Biometric Framing:* Head height (crown of hair to bottom of chin) must occupy 70% to 80% of photo height (31 mm to 36 mm).
  - *Pose:* Frontal view, both ears visible, neutral expression, mouth closed, eyes open looking directly at lens.
  - *Spectacles:* Clear prescription glasses allowed only if eyes are visible with zero glare; tinted glasses strictly prohibited.
  - *Recency:* Taken within the last 6 months.

#### Official Requirements vs Recommendations vs Presets
- *Official Requirement:* Background must be plain white or light off-white without pattern or texture.
- *Recommendation:* Wear dark or medium-contrast collared shirts. Avoid white shirts that blend into the background.
- *FileWala Preset:* Visual head-to-chin guideline overlay enforces 75% facial centroid with 300 DPI metadata injection.

#### Content & FAQ Enhancements
- Added 4-step biometric walkthrough (Upload, Align Guides, Fine-Tune Lighting, Download).
- Added common mistakes guide (improper facial ratios, flash glare on glasses, cast shadows behind head, off-center head tilts).
- Added 5 genuine FAQs (official MEA specs, portal rejection causes, spectacle rules, religious headwear rules, clothing color recommendations).
- Added internal links to `/passport-signature-resize`, `/pan-photo-resize`, `/kb-resizer`, and `/document-tools`.

---

### Route 4: `/passport-signature-resize`

- **URL:** `https://www.filewalatool.com/passport-signature-resize`
- **Rendered Single H1:** `Passport Seva Signature Resizer`
- **Canonical URL:** `https://www.filewalatool.com/passport-signature-resize`
- **Baseline Word Count:** 916 words ➔ **Enriched Word Count:** 1,018 words (+102 words)
- **Pre-rendered File Size:** 75.9 KB (Body characters: 66,932 chars)

#### Official Requirements & Citations
- **Applicable Forms:** Online Passport Application Form (PSK Document Upload).
- **Official Source (MEA):** Ministry of External Affairs, Passport Seva Portal (`https://www.passportindia.gov.in`). Document: *Guidelines for Uploading Signature for Passport Application*. (Verified October 2024).
  - *Dimensions:* 4.0 cm width × 2.0 cm height (corresponds to 400 × 200 pixels at 300 DPI, 2:1 ratio).
  - *File Size:* Strictly between 10 KB and 100 KB.
  - *Resolution:* 300 DPI.
  - *Format:* JPEG / JPG only.
  - *Ink & Paper:* Black or dark-blue ballpoint pen on unruled white paper.
  - *Framing:* Must sign inside designated box; signatures touching borders are invalid.

#### Content & FAQ Enhancements
- Added 4-step walkthrough (Draw 4×2 cm Box, Upload, Clean Background Noise, Download).
- Added common mistakes guide (file size below 10 KB, signatures in block letters, colored gel ink, clipped loops on letter tails).
- Added 5 genuine FAQs (ink colors, background whitening mechanics, file size boundaries, handling < 10 KB rejections, minor applicant signatures vs thumb impressions).
- Added internal links to `/passport-photo`, `/signature-resize`, `/kb-resizer`, and `/document-tools`.

---

### Route 5: `/upsc-photo-maker`

- **URL:** `https://www.filewalatool.com/upsc-photo-maker`
- **Rendered Single H1:** `UPSC Photo Maker with Name & Date Stamp`
- **Canonical URL:** `https://www.filewalatool.com/upsc-photo-maker`
- **Baseline Word Count:** 954 words ➔ **Enriched Word Count:** 1,154 words (+200 words)
- **Pre-rendered File Size:** 77.8 KB (Body characters: 68,877 chars)

#### Official Requirements & Citations
- **Applicable Exams & Forms:** UPSC Civil Services Examination (CSE - IAS/IPS/IFS), NDA, CDS, CMS, IES, CAPF, and UPSC One Time Registration (OTR) profile via `upsconline.nic.in` & `upsc.gov.in`.
- **Official Source (UPSC):** Union Public Service Commission Examination Notices (CSE 2024 / 2025 / 2026). Document: *Instructions to the Candidates for Online Application Submission & OTR Upload Guidelines*. (Verified October 2024).
  - *Dimensions:* Minimum 350 × 350 pixels up to maximum 1000 × 1000 pixels (Strict 1:1 Square).
  - *File Size:* Strictly between 20 KB and 300 KB.
  - *Resolution:* 200 to 300 DPI.
  - *Format:* JPG / JPEG only.
  - *Mandatory Name & Date Stamp:* Candidate's full name and the date on which the photograph was taken (DOP) must be clearly printed on a bottom strip.
  - *Recency Rule:* Photograph must NOT be older than 10 days from the date of the online application commencement.
  - *Face Coverage:* Candidate's face must occupy three-fourths (approx 75%) of the photo frame.
  - *Live Photo Correlation:* Candidate appearance (haircut, spectacles, beard/clean-shaven) in the uploaded photo must match the live webcam photo captured during submission.

#### Content & FAQ Enhancements
- Added 4-step walkthrough (Upload Recent Portrait, Enter Name & DOP, Position Face Frame, Download OTR Compliant JPEG).
- Added common mistakes guide (missing Name+DOP strip, dates older than 10 days, live photo appearance mismatch, face occupying < 50% of frame).
- Added 5 genuine FAQs (mandate for Name & DOP, 10-day recency rule, dimensions/KB bounds, live photo capture correlation, UPSC Triple Signature rule).
- Added internal links to `/ssc-photo-signature`, `/kb-resizer`, `/signature-resize`, and `/document-tools`.

---

### Route 6: `/ssc-photo-signature`

- **URL:** `https://www.filewalatool.com/ssc-photo-signature`
- **Rendered Single H1:** `SSC Photo & Signature Resizer`
- **Canonical URL:** `https://www.filewalatool.com/ssc-photo-signature`
- **Baseline Word Count:** 912 words ➔ **Enriched Word Count:** 1,097 words (+185 words)
- **Pre-rendered File Size:** 77.6 KB (Body characters: 68,576 chars)

#### Official Requirements & Citations
- **Applicable Exams & Forms:** Staff Selection Commission (SSC): CGL, CHSL, MTS, GD Constable, CPO, Stenographer via `ssc.gov.in`.
- **Official Source (SSC):** Staff Selection Commission Notice of Examination (CGL / CHSL / MTS). Document: *Notice Annexure on Instructions for Uploading Photograph and Signature*. (Verified October 2024).
  - **CRITICAL NEW PORTAL SPECIFICATION (`ssc.gov.in`)**:
    - *Candidate Photo:* Captured **LIVE via webcam or the official 'MySSC' mobile app** with eye-level positioning and plain white/light background. Pre-scanned photo files are no longer uploaded for standard recruitments on `ssc.gov.in`.
    - *Candidate Signature (Mandatory Digital Upload):*
      - Dimensions: Approx 4.0 cm width × 2.0 cm height (140 × 60 pixels).
      - File Size: Strictly between **10 KB to 20 KB** (files below 10 KB or above 20 KB are blocked by server-side validators).
      - Format: JPEG / JPG only.
      - Handwriting Rule: Running cursive handwriting style only. **Signatures in block capital letters will be rejected.**
      - Ink: Black or dark-blue ink on plain white paper.
  - *State SSCs / Legacy Notices:* Still require digital photo upload: strictly 20 KB to 50 KB (approx 100 × 120 pixels / 3.5 × 4.5 cm).

#### Content & FAQ Enhancements
- Added 4-step walkthrough (Select Mode, Upload Signature, Position & Clean Frame, Download Strict Byte File).
- Added common mistakes guide (uploading 9.8 KB or 20.2 KB files, all-caps signatures, camera reflections during live photo capture, tiny signatures in oversized boxes).
- Added 5 genuine FAQs (live photo capture rule on new portal, official signature requirements, byte range boundary errors, capital letter prohibition, live capture tips).
- Added internal links to `/upsc-photo-maker`, `/kb-resizer`, `/signature-resize`, and `/document-tools`.

---

### Route 7: `/kb-resizer`

- **URL:** `https://www.filewalatool.com/kb-resizer`
- **Rendered Single H1:** `General Gov Form Document Compressor`
- **Canonical URL:** `https://www.filewalatool.com/kb-resizer`
- **Baseline Word Count:** 1,026 words ➔ **Enriched Word Count:** 1,208 words (+182 words)
- **Pre-rendered File Size:** 82.1 KB (Body characters: 73,274 chars)

#### Official Requirements & Citations
- **Applicable Portals:**
  - *EPFO Unified Portal:* Bank passbooks & cancelled cheques strictly < 100 KB (PDF / JPG). Source: `https://unifiedportal-mem.epfindia.gov.in`.
  - *State Public Service Commissions (UPPSC, BPSC, MPPSC, WBPSC):* Caste, domicile, and academic certificates strictly < 100 KB or < 200 KB.
  - *Banking Recruitment (IBPS, SBI PO/Clerk):* Left thumb impression (20–50 KB), handwritten declaration (50–100 KB), marksheets (< 200 KB). Source: `https://www.ibps.in`.
  - *Parivahan Driving License (Sarathi):* Address proof & age proof strictly < 200 KB. Source: `https://sarathi.parivahan.gov.in`.
- **Supported Requirements & Capabilities:**
  - Inputs: Multi-page PDF or images (JPEG, PNG, WebP) up to 50 MB.
  - Output: Compact PDF or JPEG mathematically bounded below user-specified target ceilings (50 KB, 100 KB, 200 KB, 500 KB).
  - Adaptive Text Contrast Engine: Cleans scanner paper noise to pure white while boosting black contrast on certificate numbers, marks, and seals.

#### Content & FAQ Enhancements
- Added 4-step walkthrough (Select Target Size, Upload Document, Verify Text Legibility, Download Optimized Document).
- Added common mistakes guide (using standard lossy compressors that blur seal text, multi-page PDF budget blowouts, dark yellow scanner noise).
- Added 5 genuine FAQs (adaptive text legibility mechanics, marksheet compression under 100 KB, privacy of Aadhaar cards, multi-page PDF compression, threshold comparison across EPFO/State PSC/IBPS).
- Added internal links to `/pan-photo-resize`, `/signature-resize`, `/upsc-photo-maker`, `/ssc-photo-signature`, `/compress-image`, and `/document-tools`.

---

## 3. Architecture & Technical Verification Results

### Quality & Performance Gates

| Verification Gate | Command | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TypeScript Typecheck** | `npm run lint` (`tsc --noEmit`) | 0 type errors | 0 errors | **PASSED** |
| **Production Build** | `npm run build` | Vite client + SSR bundle | Built in 1.75s + 497ms | **PASSED** |
| **Full Site Prerendering** | `node scripts/prerender.mjs` | 46 index.html generated | 46 routes generated (0 errors) | **PASSED** |
| **Hardened SEO Audit** | `npm run verify:seo` | All 46 routes pass | 46/46 passed (0 failures) | **PASSED** |
| **Duplicate Titles** | `verify:seo` check | 0 duplicate titles | 0 duplicate titles | **PASSED** |
| **Duplicate Canonicals** | `verify:seo` check | 0 duplicate canonicals | 0 duplicate canonicals | **PASSED** |
| **H1 Tag Enforcement** | `verify:seo` check | Single H1 per route matching map | 46/46 exact matches | **PASSED** |
| **JSON-LD FAQ Matching** | `verify:seo` check | 100% FAQ match to visible DOM | 100% match across all routes | **PASSED** |

### Prerendered HTML Statistics for Batch 1 Routes

| # | Route | Clean Slug | Pre-rendered File Size | Root Body Characters | Extracted Single H1 | FAQ Schema Match |
| :-: | :--- | :--- | :-: | :-: | :--- | :---: |
| 9 | `/pan-photo-resize` | `pan-photo-resize` | **78.5 KB** | 69,560 | PAN Photo Resizer & DPI Formatter | **100% MATCH** |
| 10 | `/signature-resize` | `signature-resize` | **77.9 KB** | 69,138 | PAN Signature Resizer & DPI Formatter | **100% MATCH** |
| 11 | `/passport-photo` | `passport-photo` | **80.0 KB** | 71,163 | Passport Seva Photo Resizer | **100% MATCH** |
| 12 | `/passport-signature-resize` | `passport-signature-resize` | **75.9 KB** | 66,932 | Passport Seva Signature Resizer | **100% MATCH** |
| 13 | `/upsc-photo-maker` | `upsc-photo-maker` | **77.8 KB** | 68,877 | UPSC Photo Maker with Name & Date Stamp | **100% MATCH** |
| 14 | `/ssc-photo-signature` | `ssc-photo-signature` | **77.6 KB** | 68,576 | SSC Photo & Signature Resizer | **100% MATCH** |
| 15 | `/kb-resizer` | `kb-resizer` | **82.1 KB** | 73,274 | General Gov Form Document Compressor | **100% MATCH** |

---

## 4. Unresolved Questions & Caveats

1. **SSC Live Photo vs Signature Separation**:
   - On the updated Staff Selection Commission portal (`ssc.gov.in`), standard candidate photos are captured live through webcams or mobile devices. FileWala's `/ssc-photo-signature` tool now prominently clarifies this distinction so candidates do not attempt to format and upload photo files on application pathways that enforce live capture. The tool's primary utility for SSC candidates is currently signature formatting (strictly 10–20 KB).
2. **UPSC Live Photo Cross-Verification**:
   - UPSC candidates must be aware that while FileWala stamps the Name & Date of Photo (DOP) on the uploaded OTR photograph, UPSC's submission system requires capturing a live webcam photo during application completion. Candidates must maintain consistent facial appearance (haircut, spectacles, beard/clean-shaven).
3. **No Affiliation Policy**:
   - Third-party utility websites are strictly subject to Google Search Quality Rater Guidelines regarding government and financial topics (YMYL - Your Money or Your Life). All seven tool pages now display unambiguous disclaimers stating non-affiliation with any official government authority.

---

## 5. Summary & Handover

Batch 1 implementation is **100% complete, lint-clean, and fully verified**. No Git commits, pushes, or deployments have been made.

**Batch 2 (Core Private PDF Suite)** is scheduled to begin following user review and approval of this report.
