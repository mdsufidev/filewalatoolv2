# FileWala Tool (filewalatool.com)

> **100% Client-Side & Private Document, Image, and PDF Suite for Indian Government & Competitive Exams.**

Official Website: [https://www.filewalatool.com](https://www.filewalatool.com)  
Author: **Mohammad Sufiyan** ([@mdsufidev](https://github.com/mdsufidev))

---

## 🌟 Overview

**FileWala Tool** is a minimalist, privacy-first web utility platform crafted specifically for students, job applicants, and cyber café operators across India. 

All file operations (compression, resizing, conversion, cropping, OCR, and PDF manipulation) occur **100% in-memory inside the client browser**. No photos, signatures, or documents are ever uploaded to an external server or stored in any cloud database.

---

## ⚡ Core Capabilities

### 1. Govt & Exam Portal Form Presets
* **UPSC Photo Maker**: Add official candidate Name & Date of Photo (DOP) stamp compliant with latest UPSC/IAS/NDA guidelines.
* **SSC Photo & Signature Resizer**: Instant 20–50 KB photo and 10–20 KB signature formatting.
* **PAN Card Resizer**: Protean NSDL & UTIITSL compliance (213×213 px, 200 DPI, under 50 KB).
* **Passport Seva Photo**: Official 35×45 mm (350×450 px) photo and 400×200 px signature presets.
* **Govt Document Compressor**: Reduce marksheets, caste/income certificates, and Aadhaar cards under 100 KB / 200 KB without blurriness.

### 2. High-Performance PDF Suite
* **Merge PDF**: Client-side multi-file concatenation via `pdf-lib`.
* **Split & Extract Pages**: Isolate page ranges into standalone PDFs.
* **Compress PDF**: High-ratio vector and text preservation under 1 MB.
* **PDF to Word / OCR**: Local text and DOCX extraction using WebAssembly.
* **PDF to Image & Image to PDF**: Full resolution export with zero cloud latency.

### 3. Image Processing & Format Converters
* **Image Compressor & Resizer**: Exact pixel dimension and target KB adjustments.
* **Format Converter**: Support for WebP, HEIC (iPhone), AVIF, SVG, PNG, and JPG.
* **Background Remover & Image Enhancers**: High-fidelity local edge detection.

---

## 🖥️ FileWala Desktop for Windows (v1.0.0)

FileWala also provides a native Windows 64-bit desktop application for heavy offline workloads:
* **AI Picture Enhancer [Hybrid Pro]**: Ultra-Fast Preview V3 neural model.
* **4x Ultra HD Upscaling**: Facial skin pore, eye pupil, and texture restoration.
* **U2Net Offline BG Remover**: GPU-accelerated background cutout.
* **Hardware Acceleration**: Automatic NVIDIA CUDA / Tensor & multi-core CPU detection.
* **Direct Download**: [Download Setup .EXE](https://filewalatool.com/download/v1.0.0/FileWala-TOOL-Setup-1.0.0.exe) (80.4 MB)

---

## 🛠️ Technology Stack

* **Framework**: React 19 + TypeScript
* **Bundler & Dev Server**: Vite 8
* **Styling**: Tailwind CSS (Minimalist 2D Swiss/Linear aesthetic)
* **Local Processing Engines**:
  * HTML5 Canvas 2D Engine
  * `pdf-lib` + `pdfjs-dist` (WebAssembly PDF runtime)
  * `tesseract.js` (Client-side OCR)
  * `heic2any` (Apple image decoding)
* **Authentication & User Profiles**: Firebase Auth

---

## 🚀 Getting Started

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

3. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Production Build:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Privacy Guarantee

* **Zero Server Uploads**: Processing uses Web Workers and Blob URLs strictly inside your device RAM.
* **Automatic Memory GC**: Files are garbage-collected immediately upon download or navigation.
* **DPDP Act Compliant**: Designed to respect Indian Digital Personal Data Protection standards.

---

## 👨‍💻 Author & Credits

Handcrafted by **Mohammad Sufiyan** ([@mdsufidev](https://github.com/mdsufidev)).
* **Location**: Kushinagar, Uttar Pradesh, India
* **LinkedIn**: [linkedin.com/in/mdsufidev](https://linkedin.com/in/mdsufidev)
* **Instagram**: [instagram.com/mdsufidev](https://instagram.com/mdsufidev)
* **GitHub**: [github.com/mdsufidev](https://github.com/mdsufidev)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
