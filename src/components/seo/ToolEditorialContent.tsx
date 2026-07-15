"use client";

import { usePathname } from "next/navigation";

type Editorial = {
  name: string;
  action: string;
  input: string;
  output: string;
  useCases: string;
  controls: string;
  tip: string;
  limitation: string;
};

const editorials: Record<string, Editorial> = {
  "/compress-image": { name: "Image Compressor", action: "reduce image file size", input: "JPG, PNG, or WebP images", output: "a smaller image", useCases: "website uploads, email attachments, online forms, and faster page loading", controls: "quality and output settings", tip: "Start with a quality level around 75–85 for photographs. Text-heavy screenshots may need a higher setting, while PNG is usually better for sharp graphics and transparency.", limitation: "Very aggressive compression can soften fine detail, so compare the preview before downloading." },
  "/crop-image": { name: "Image Cropper", action: "remove unwanted outer areas and improve composition", input: "JPG, PNG, or WebP images", output: "a precisely cropped image", useCases: "profile pictures, product photos, documents, banners, and social posts", controls: "crop box, aspect ratio, position, and output settings", tip: "Choose the final aspect ratio before positioning the subject. Keeping important details away from the edges prevents them from being cut off by circular avatars or responsive layouts.", limitation: "Cropping permanently removes pixels outside the selected area, so retain the original file as a backup." },
  "/merge-pdf": { name: "Merge PDF", action: "combine several PDF documents in the required order", input: "two or more PDF files", output: "one organized PDF", useCases: "applications, reports, invoices, portfolios, and scanned records", controls: "file order and document selection", tip: "Rename source files with numbers such as 01, 02, and 03 before uploading. This makes long document sets easier to arrange and reduces the chance of submitting pages in the wrong order.", limitation: "Merging does not automatically correct page orientation or reduce file size; use the relevant PDF tool afterward if needed." },
  "/pan-photo-resize": { name: "PAN Photo Resizer", action: "prepare a portrait for a PAN application", input: "a clear portrait image", output: "a cropped and resized JPG", useCases: "Protean and UTIITSL PAN application workflows", controls: "portal preset, crop position, dimensions, and quality", tip: "Use an evenly lit, front-facing photo with a plain background and keep the full face visible. Always compare the downloaded dimensions and size with the latest instructions on the application portal.", limitation: "Portal specifications can change, and this tool does not guarantee acceptance by a government or third-party website." },
  "/signature-resize": { name: "Signature Resizer", action: "crop and resize a signature image", input: "a scanned or photographed signature", output: "a clean upload-ready JPG", useCases: "PAN forms, examinations, recruitment portals, and digital applications", controls: "crop area, dimensions, background, and quality", tip: "Sign with dark ink on unruled white paper and photograph it in even light. Crop close enough to remove empty space, but leave a small margin so the signature does not touch the boundary.", limitation: "Check the destination portal’s current pixel and KB requirements before submitting the result." },
  "/passport-photo": { name: "Passport Photo Maker", action: "crop and size a formal portrait", input: "a clear front-facing photo", output: "a digital or print-ready passport photo", useCases: "identity forms, applications, resumes, and photo sheets", controls: "preset, crop, alignment, dimensions, and print layout", tip: "Keep the camera at eye level, use a plain evenly lit background, and avoid shadows across the face. Official biometric rules vary, so verify head size and background requirements with the issuing authority.", limitation: "Creating the correct dimensions alone does not guarantee that an authority will accept a photo." },
  "/resume-builder": { name: "Resume Builder", action: "create a structured professional resume", input: "your education, experience, skills, and contact details", output: "a clean printable resume", useCases: "job applications, internships, freelance profiles, and career updates", controls: "sections, content, ordering, template, and preview", tip: "Write achievement bullets with an action, a task, and a measurable result. Tailor keywords to the job description, but only include technologies and responsibilities you can discuss confidently.", limitation: "A template improves presentation, but strong, accurate, role-specific content determines the resume’s effectiveness." },
  "/kb-resizer": { name: "KB Image Resizer", action: "bring an image close to a target file size", input: "JPG, PNG, or WebP images", output: "a size-optimized image", useCases: "application portals, document uploads, email, and storage limits", controls: "target KB, dimensions, quality, and format", tip: "Reduce pixel dimensions before forcing quality very low. A sensibly sized image at moderate quality generally looks better than a very large image compressed aggressively to the same KB target.", limitation: "Exact byte size can vary because every image contains different detail and compression behaves non-linearly." },
  "/image-to-20kb": { name: "Image to 20KB", action: "compress a photo toward a 20 KB target", input: "JPG, PNG, or WebP images", output: "a very small optimized image", useCases: "strict application forms and low-size document uploads", controls: "target size, dimensions, quality, and format", tip: "For a 20 KB limit, crop unused background first and reduce dimensions to the portal’s actual display size. JPG usually handles photographs more efficiently than PNG at this target.", limitation: "Highly detailed images may need visible quality reduction, and the exact result can be slightly above or below 20 KB." },
  "/image-to-50kb": { name: "Image to 50KB", action: "compress a photo toward a 50 KB target", input: "JPG, PNG, or WebP images", output: "a compact optimized image", useCases: "online applications, profile uploads, and document portals", controls: "target size, dimensions, quality, and format", tip: "Match the required pixel dimensions first, then adjust compression. Removing excess background often saves more bytes while preserving facial or document detail.", limitation: "A precise 50 KB result cannot be guaranteed for every source because image complexity and encoding overhead differ." },
  "/jpg-to-png": { name: "JPG to PNG Converter", action: "change a JPG image into PNG format", input: "JPG or JPEG images", output: "a PNG image", useCases: "editing workflows, compatibility, screenshots, and lossless re-saving", controls: "file selection and conversion", tip: "Converting JPG to PNG prevents additional JPEG loss during later saves, but it cannot restore detail already removed by JPG compression. The PNG file may also be larger.", limitation: "A JPG has no true transparency, so conversion alone cannot automatically create a transparent background." },
  "/png-to-jpg": { name: "PNG to JPG Converter", action: "change a PNG image into JPG format", input: "PNG images", output: "a broadly compatible JPG", useCases: "photo uploads, email, websites, and systems that reject PNG", controls: "background and quality settings", tip: "JPG does not support transparency. Select a suitable background—usually white—before converting transparent artwork, and inspect fine text or logos for compression artifacts.", limitation: "Photographic PNG files often shrink well, but flat graphics may remain clearer in their original PNG format." },
  "/image-to-pdf": { name: "Image to PDF Converter", action: "combine images into a PDF document", input: "JPG, PNG, or WebP images", output: "one downloadable PDF", useCases: "scanned notes, receipts, assignments, photo records, and application documents", controls: "image order, page size, orientation, and margins", tip: "Rotate and crop each image before conversion, then arrange pages in reading order. Consistent orientation and moderate margins make scanned documents easier to print and review.", limitation: "Placing images in a PDF does not perform OCR, so text inside the pictures may not be searchable or selectable." },
  "/batch-image-cropper": { name: "Batch Image Cropper", action: "crop multiple images in one session", input: "a group of supported images", output: "a set of consistently cropped files", useCases: "product catalogs, profile sets, listings, thumbnails, and content production", controls: "crop region, aspect ratio, and per-image positioning", tip: "Use one aspect ratio across the batch, but check the subject position in every image. A shared ratio creates consistency without forcing identical framing on differently composed photos.", limitation: "Source images with very different dimensions may require individual adjustments for the best composition." },
  "/split-pdf": { name: "Split PDF", action: "extract selected pages from a PDF", input: "a PDF document", output: "a smaller PDF containing chosen pages", useCases: "sharing chapters, separating forms, submitting selected records, and removing irrelevant sections", controls: "page selection and extraction order", tip: "Confirm page numbers using the preview rather than relying only on printed page labels; cover sheets and front matter often make the PDF page index different from the number shown on the document.", limitation: "Splitting changes the page set but does not edit text, remove sensitive content printed on retained pages, or compress the file." },
  "/compress-pdf": { name: "PDF Compressor", action: "reduce the storage size of a PDF", input: "a PDF document", output: "a smaller PDF", useCases: "email attachments, application portals, mobile sharing, and cloud storage", controls: "compression level and result comparison", tip: "Use moderate compression for documents containing small text, diagrams, or signatures. Strong compression is more suitable for image-heavy files when the portal’s size limit matters more than print quality.", limitation: "Already optimized or text-only PDFs may shrink very little, while scanned PDFs can show a larger visual quality change." },
  "/rotate-pdf": { name: "Rotate PDF", action: "correct the orientation of PDF pages", input: "a PDF with sideways or upside-down pages", output: "a correctly oriented PDF", useCases: "scans, reports, forms, ebooks, and mixed-orientation documents", controls: "individual page selection and rotation angle", tip: "Review every page thumbnail before exporting. Duplex scanners can rotate only the reverse side, so applying one global rotation may correct some pages while making others wrong.", limitation: "Rotation changes page orientation; it does not deskew tilted scans or rotate content independently of the page canvas." },
  "/delete-pdf-pages": { name: "Delete PDF Pages", action: "remove unwanted pages from a PDF", input: "a multi-page PDF", output: "a cleaned PDF with retained pages", useCases: "removing blanks, duplicate scans, outdated sections, or confidential attachments", controls: "page preview and keep/remove selection", tip: "Save the original separately and review the first and last retained pages after deletion. Removing a page can affect references, bookmarks, page numbering, or signatures elsewhere in a document.", limitation: "Deleting a page is permanent in the downloaded copy and does not redact sensitive text that remains on other pages." },
  "/watermark-pdf": { name: "Watermark PDF", action: "place a text watermark across PDF pages", input: "a PDF and watermark text", output: "a marked PDF", useCases: "drafts, review copies, ownership labels, status notices, and internal documents", controls: "text, opacity, rotation, size, and page coverage", tip: "Use enough contrast to remain visible but low enough opacity to keep underlying text readable. A diagonal watermark is harder to crop away than a small footer label.", limitation: "A watermark discourages casual reuse but is not digital rights management and may be removable with specialist PDF software." },
  "/protect-pdf": { name: "Protect PDF", action: "apply password-based protection to a PDF", input: "a PDF document and a strong password", output: "an encrypted PDF", useCases: "private records, invoices, reports, and documents sent through shared channels", controls: "password and protection settings", tip: "Use a long, unique passphrase and send it through a different channel from the PDF. Keep an unprotected backup in a secure location because a forgotten password may make the file inaccessible.", limitation: "Password protection reduces unauthorized opening but cannot control screenshots or copying after an authorized person unlocks the document." },
  "/pdf-to-image": { name: "PDF to Image Converter", action: "render PDF pages as image files", input: "a PDF document", output: "individual PNG or JPG page images", useCases: "presentations, previews, social sharing, thumbnails, and systems that do not accept PDF", controls: "page range, image format, and render quality", tip: "Choose PNG for pages with small text, line art, or diagrams; choose JPG for photographic pages when a smaller download matters. Higher render scale improves clarity but increases memory use and file size.", limitation: "Rendered text becomes pixels and is no longer selectable or searchable in the exported image." },
  "/word-to-pdf": { name: "Word to PDF Converter", action: "turn a Word document into a portable PDF", input: "a supported DOCX document", output: "a PDF for sharing or printing", useCases: "resumes, letters, assignments, reports, and records", controls: "document selection, preview, and export", tip: "Use standard fonts, simple tables, and explicit page breaks in the source document. Complex floating objects or uncommon fonts can render differently outside Microsoft Word, so review every PDF page.", limitation: "Browser conversion may not reproduce advanced Word layouts, macros, tracked changes, or embedded objects exactly." },
};

export function ToolEditorialContent() {
  const path = usePathname();
  const item = editorials[path];

  if (!item) return null;

  return (
    <section className="border-t bg-white" aria-labelledby="tool-guide-heading">
      <article className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">FileWalaTool Guide</p>
          <h2 id="tool-guide-heading" className="mt-2 text-2xl font-semibold text-[#171717] sm:text-3xl">
            {item.name}: a practical guide
          </h2>
        </header>

        <div className="mt-8 space-y-9 text-sm leading-7 text-muted-foreground sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-[#171717]">What is {item.name}?</h2>
            <p className="mt-3">
              {item.name} is a free online utility designed to {item.action}. It accepts {item.input} and produces {item.output} without requiring specialist desktop software. This is useful for {item.useCases}. File management often becomes difficult when a website, office workflow, or recipient expects a particular format, size, or layout. A focused tool removes unnecessary steps and lets you prepare the file from the same browser you already use.
            </p>
            <p className="mt-3">
              FileWalaTool keeps the workflow understandable for occasional users while still providing the controls needed for careful results. You can review the available options before creating the final file, keep your original untouched, and download the new version to your own device. That combination makes the tool suitable for quick daily tasks as well as repeat professional work.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#171717]">How to use {item.name}</h2>
            <ol className="mt-3 grid gap-3">
              <li><strong className="text-[#171717]">1. Select the source file.</strong> Open the tool and choose {item.input} from your device. Use a clear, complete original whenever possible because the quality of the source directly affects the result.</li>
              <li><strong className="text-[#171717]">2. Review the file.</strong> Confirm that the correct document or image has loaded. If a preview is available, check orientation, page order, boundaries, and visible content before continuing.</li>
              <li><strong className="text-[#171717]">3. Adjust the options.</strong> Set the relevant {item.controls}. Choose values based on the destination’s stated requirements instead of guessing, especially for application portals or print work.</li>
              <li><strong className="text-[#171717]">4. Process and inspect.</strong> Start the operation and wait for the browser to prepare {item.output}. Review the preview or reported size, and revise the settings if the first result is not suitable.</li>
              <li><strong className="text-[#171717]">5. Download safely.</strong> Save the finished file, open it once, and verify important pages or details before sharing it. Keep the original until the new version has been accepted by its destination.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#171717]">Why choose FileWalaTool?</h2>
            <p className="mt-3">
              FileWalaTool is built around speed, privacy, and accessibility. Processing happens locally in your browser for this tool, so your selected files are not uploaded to our server for conversion. That browser-first design greatly reduces privacy exposure and also avoids the upload-and-wait cycle common to server-based services. We prioritize privacy, but you should still use a trusted device and close shared-browser sessions after handling confidential material.
            </p>
            <p className="mt-3">
              No account, email address, or signup is required. You can open the page, complete the task, and download the result immediately. The interface works on modern desktop and mobile browsers and presents only settings relevant to the job. There are no artificial steps between the input and output, and your original file remains on your device unless you choose to share it elsewhere. This makes FileWalaTool a practical choice when you need a fast result without installing software or handing a private file to an unknown processing queue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#171717]">Expert tip and technical insight</h2>
            <p className="mt-3">{item.tip}</p>
            <p className="mt-3">
              A processed file should always be judged at its final destination: open the download, zoom in where accuracy matters, and confirm its dimensions or file size using the receiving system’s rules. {item.limitation}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#171717]">Frequently asked questions</h2>
            <div className="mt-4 grid gap-5">
              <div><h3 className="font-semibold text-[#171717]">Is {item.name} free to use?</h3><p className="mt-1">Yes. You can use this tool without creating an account or paying for the basic workflow shown on the page.</p></div>
              <div><h3 className="font-semibold text-[#171717]">Are my files uploaded to FileWalaTool?</h3><p className="mt-1">No. This tool processes the selected file locally in your browser. The file is not sent to our server for the operation.</p></div>
              <div><h3 className="font-semibold text-[#171717]">Will my original file be changed?</h3><p className="mt-1">No. The result is created as a separate download. Your original stays unchanged on your device.</p></div>
              <div><h3 className="font-semibold text-[#171717]">Why can results vary between files?</h3><p className="mt-1">Source dimensions, content complexity, format features, and browser resources all influence processing. Review the downloaded result before relying on it for an important submission.</p></div>
            </div>
          </section>
        </div>
      </article>
    </section>
  );
}
