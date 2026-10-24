import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using official CDN fallback matching version
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

/**
 * Extracts raw text from a PDF file client-side.
 */
export async function extractTextFromPdf(file: File): Promise<{ fullText: string; pageCount: number; pages: { pageNum: number; text: string }[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pagesData: { pageNum: number; text: string }[] = [];
  let combined = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pagesData.push({ pageNum: i, text: pageText });
    combined += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return {
    fullText: combined.trim(),
    pageCount: numPages,
    pages: pagesData,
  };
}

/**
 * Renders all pages of a PDF to high-resolution JPEG Blobs client-side.
 */
export async function convertPdfToJpg(
  file: File,
  scale = 2.0,
  quality = 0.92,
  onProgress?: (current: number, total: number) => void
): Promise<{ pageNum: number; blob: Blob; url: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const results: { pageNum: number; blob: Blob; url: string }[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Fill white background for JPG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render page
    const renderContext = {
      canvasContext: ctx,
      viewport,
      canvas,
    };
    await page.render(renderContext as any).promise;

    // Convert to JPG blob
    const blob: Blob = await new Promise((res, rej) => {
      canvas.toBlob(
        (b) => (b ? res(b) : rej(new Error(`Failed to render page ${i}`))),
        'image/jpeg',
        quality
      );
    });

    const url = URL.createObjectURL(blob);
    results.push({ pageNum: i, blob, url });

    if (onProgress) {
      onProgress(i, numPages);
    }
  }

  return results;
}
