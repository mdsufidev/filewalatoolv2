<p align="center">
  <a href="https://www.filewalatool.com" target="_blank" rel="noopener noreferrer">
    <img src="public/logo.png" alt="FileWala Tool Logo" width="140" />
  </a>
  <h1 align="center">FileWala Tool</h1>
  <p align="center">
    <strong>100% Client-Side, Zero-Cloud Document, Image & PDF Suite for Indian Government & Competitive Exams</strong>
  </p>
  <p align="center">
    <a href="https://www.filewalatool.com"><img src="https://img.shields.io/badge/Website-filewalatool.com-red?style=flat-square" alt="Website" /></a>
    <a href="https://github.com/mdsufidev/filewalatoolv2/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" /></a>
    <img src="https://img.shields.io/badge/React-19.0.1-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-7.0.2-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/TailwindCSS-v4.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Privacy-100%25%20In--Browser%20RAM-success?style=flat-square" alt="100% Client Side" />
    <img src="https://img.shields.io/badge/SEO%20Routes-46%20Prerendered-orange?style=flat-square" alt="Prerendered Routes" />
  </p>
</p>

---

## 🌟 Overview

**FileWala Tool** ([filewalatool.com](https://www.filewalatool.com)) is a fast, minimalist, privacy-first web utility suite built specifically for Indian students, government exam candidates, job applicants, and cyber café operators.

Online application portals across India (UPSC, SSC, NTA NEET/JEE, State PSCs, PAN card, Passport Seva, EPFO, and Banking) enforce strict pixel dimensions, file size limits (e.g., 20 KB–50 KB, under 100 KB), and mandatory candidate name/date-of-photo stamps. 

Traditional online tools upload sensitive personal documents, photographs, and signatures to third-party cloud servers. **FileWala Tool solves this permanently: 100% of all processing occurs inside the user's browser RAM via Web Workers, WebAssembly, and Canvas 2D**. No file is ever transmitted to a server.

---

## ⚡ Core Tool Suites (40+ Built-in Utilities)

### 🏛️ 1. Indian Government & Exam Compliance Suite
* **PAN Card Photo & Signature Resizer**: Protean NSDL & UTIITSL compliance (213×213 px photo, 200 DPI, under 50 KB; 354×157 px signature).
* **Passport Seva Photo & Signature**: Official MEA guidelines (35×45 mm / 350×450 px photo under 200 KB; clear ink signature 400×200 px).
* **UPSC Photo Maker (with Date Stamp)**: Automatic Name and Date of Photo (DOP) stamp generator matching modern UPSC/IAS/NDA notifications.
* **SSC Photo & Signature Resizer**: Strict SSC CGL, CHSL, MTS & GD presets (20 KB–50 KB photo, 10 KB–20 KB signature).
* **Govt Document & Marksheet Compressor**: Reduce 10th/12th marksheet scans, caste/domicile certificates, and Aadhaar PDFs under 100 KB, 200 KB, or 500 KB while retaining crisp legible text.
* **Target KB Resizer**: Precision slider to hit exact kilobyte targets without trial and error.

### 📄 2. Client-Side PDF Suite
* **Merge PDF**: Concatenate multiple PDF documents directly in local RAM using `pdf-lib`.
* **Split PDF**: Extract custom page ranges or isolate individual pages into clean separate PDFs.
* **Compress PDF**: High-ratio vector and raster compression preserving document fidelity.
* **Rotate PDF**: Reorient individual or all pages (90°, 180°, 270°) with instant live preview.
* **PDF to Image**: Render high-DPI JPG or PNG pages directly in browser memory.
* **Image to PDF**: Combine multiple photos, ID cards, and receipts into a single standardized PDF.
* **PDF to Word / DOCX**: Extract structured text into editable Microsoft Word documents locally.
* **PDF to Text (OCR)**: In-browser optical character recognition via `tesseract.js`.

### 🖼️ 3. Image Studio & Creative Utilities
* **Image Resizer**: Exact custom width × height resizing with aspect-ratio locking and DPI controls.
* **Image Compressor to KB**: Fast dual-engine compression targeting exact file weights.
* **Background Remover**: Local boundary segmentation and edge cutout.
* **Face Enhancer**: Contrast and clarity restoration for passport-style portrait photos.
* **Crop Image & Batch Cropper**: Freeform and preset aspect-ratio (1:1, 4:3, 16:9, 3:4) cropping.
* **Watermark Image**: Add custom copyright text or transparent logo stamps with opacity controls.
* **Color Palette Extractor**: Extract 6 dominant harmonic anchors and HEX/RGB swatches from any graphic.
* **Round Corners**: Apply smooth border radius and export transparent PNGs.
* **Meme Generator**: Top and bottom caption typography engine with instant image export.
* **Image to Base64**: Instant Data URL encoder and decoder for web developers.
* **Filter & Adjust**: Real-time brightness, contrast, saturation, and temperature adjustments.

### 🔄 4. Universal Format Converter Suite
* **JPG ⇄ PNG**: Transparent and high-compression bidirectional conversion.
* **HEIC to JPG**: Decode high-efficiency Apple iPhone photos locally using `heic2any`.
* **PNG / JPG ⇄ WebP**: Modern next-gen web image encoding with 70%+ byte savings.
* **AVIF to JPG**: Next-generation AVIF raster conversion.
* **SVG to PNG**: High-resolution rasterization of vector SVG files.

---

## 🔒 Security & Privacy Architecture

```
User Device (Browser RAM)
┌────────────────────────────────────────────────────────┐
│  Selected File (Photo / Signature / PDF)               │
│                     │                                  │
│                     ▼                                  │
│  [ Web Worker / HTML5 Canvas 2D / WebAssembly Engine ]  │
│                     │                                  │
│                     ▼                                  │
│  Processed Compliant Blob (Blob URL)                   │
│                     │                                  │
│                     ▼                                  │
│  Immediate Download ➔ Memory Cleared (GC)              │
└────────────────────────────────────────────────────────┘
          🚫 ZERO NETWORK UPLOADS TO CLOUD SERVERS 🚫
```

* **Zero Server Storage**: Files never leave your computer or phone. Network monitoring confirms 0 bytes of document payloads are transmitted over HTTP/S.
* **Immediate Garbage Collection**: Memory blobs are revoked upon download completion or page navigation.
* **DPDP Act 2023 Compliant**: Built strictly with privacy-by-design principles adhering to the Indian Digital Personal Data Protection standards.
* **No Authentication Lock**: All core tools are 100% free with unlimited usage and zero forced account creation.

---

## 🖥️ FileWala Desktop for Windows (v1.0.0)

<p align="center">
  <a href="https://www.filewalatool.com/download/v1.0.0/FileWala-TOOL-Setup-1.0.0.exe" target="_blank" rel="noopener noreferrer">
    <img src="public/og-image.png" alt="FileWala Desktop & AI Studio" width="100%" style="border-radius: 8px; border: 1px solid #e2e8f0;" />
  </a>
</p>

<p align="center">
  <a href="https://www.filewalatool.com/download/v1.0.0/FileWala-TOOL-Setup-1.0.0.exe">
    <img src="https://img.shields.io/badge/Download_Setup-.EXE_(80.4_MB)-dc2626?style=for-the-badge&logo=windows&logoColor=white" alt="Download FileWala Desktop .EXE" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OS-Windows%2010%20%2F%2011%20(64--bit)-0078D6?style=flat-square&logo=windows" alt="Windows 10/11" />
  <img src="https://img.shields.io/badge/Release-v1.0.0%20Stable-10B981?style=flat-square" alt="Version 1.0.0" />
  <img src="https://img.shields.io/badge/Architecture-x64%20Native-6366F1?style=flat-square" alt="x64 Native" />
  <img src="https://img.shields.io/badge/AI%20Inference-100%25%20Offline-success?style=flat-square" alt="100% Offline" />
  <img src="https://img.shields.io/badge/Acceleration-NVIDIA%20CUDA%20%2F%20CPU-76B900?style=flat-square&logo=nvidia" alt="NVIDIA CUDA" />
</p>

For high-throughput, offline batch processing across **cyber cafés, CSC digital service centers, photography studios, and enrollment offices**, FileWala provides a dedicated Windows 64-bit desktop workstation application:

| Native Capability | Offline Neural Engine | Operational Benefit |
| :--- | :--- | :--- |
| **🧠 AI Picture Enhancer [Hybrid Pro]** | Ultra-Fast Preview V3 Neural Model | Real-time facial clarity restoration and edge denoising without cloud calls |
| **🔍 4x Ultra HD Upscaling** | Deep Texture & Pixel Synthesizer | Reconstructs skin pores, iris details, and fine marksheet typography from low-res scans |
| **✂️ U2Net Offline BG Remover** | GPU-Accelerated Salient Matting | Sub-second foreground isolation with zero internet connection required |
| **⚡ Hardware Acceleration** | Automatic CUDA, Tensor & Multi-Core Detection | Automatically switches between dedicated NVIDIA GPU and AVX2 CPU threads for maximum throughput |

#### 📥 Download & Specifications
* **Direct Installer**: [Download FileWala-TOOL-Setup-1.0.0.exe (80.4 MB)](https://www.filewalatool.com/download/v1.0.0/FileWala-TOOL-Setup-1.0.0.exe)
* **System Requirements**: Windows 10 / 11 (64-bit), 4 GB RAM (8 GB recommended), Optional NVIDIA GPU (CUDA-compatible) for accelerated neural inference.
* **100% Air-Gapped Security**: Operates completely offline with zero telemetry, zero external network queries, and zero cloud dependencies.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [TypeScript 7](https://www.typescriptlang.org/) |
| **Bundler & Build Tool** | [Vite 8](https://vite.dev/) with Rolldown-backed optimization |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) (2D Flat Swiss/Linear aesthetic) |
| **Iconography** | [Lucide React](https://lucide.dev/) |
| **PDF Processing** | `pdf-lib` + `pdfjs-dist` (WebAssembly PDF engine) |
| **Document Export** | `docx` + `jszip` |
| **OCR & Image Decoding** | `tesseract.js` + `heic2any` |
| **Static Pre-rendering** | Node.js SSR pipeline generating 46 standalone SEO-optimized routes |
| **Bilingual Support** | Instant toggle between English (`en-IN`) and Hindi (`hi-IN`) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18+ or 20+ recommended)
* `npm` or `pnpm`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mdsufidev/filewalatoolv2.git
   cd filewalatoolv2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Available Scripts

* **`npm run dev`**: Starts local Vite development server with HMR on port 3000.
* **`npm run build`**: Runs client build, SSR bundle, and static prerendering script for all 46 sitemap routes.
* **`npm run verify:seo`**: Runs independent compliance audit verifying that all 46 URLs contain unique titles, matching canonicals, proper H1s, and Schema.org JSON-LD structured data.
* **`npm run lint`**: Strict TypeScript type checking (`tsc --noEmit`).
* **`npm run clean`**: Cleans temporary `dist/` and server artifacts.

---

## 👨‍💻 Handcrafted By

Crafted with dedication for Indian students, applicants, and creators by:

**Mohammad Sufiyan** ([@mdsufidev](https://github.com/mdsufidev))  
*Location*: Kushinagar, Uttar Pradesh, India  
* GitHub: [@mdsufidev](https://github.com/mdsufidev)
* LinkedIn: [Mohammad Sufiyan](https://linkedin.com/in/mdsufidev)
* Reddit Community: [r/filewalatool](https://www.reddit.com/r/filewalatool/)
* Instagram: [@mdsufidev](https://instagram.com/mdsufidev)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for personal, commercial, and educational use.
