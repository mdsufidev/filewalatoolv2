"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  BadgeCheck,
  Download,
  FileImage,
  Images,
  Loader2,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type OutputFormat = "png" | "jpg";
type RenderScale = 1 | 1.5 | 2;

type ImageResult = {
  id: string;
  pageNumber: number;
  url: string;
  fileName: string;
  size: number;
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_RENDER_PAGES = 50;

async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjsLib;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeFileName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "document";
}

function parsePageSelection(value: string, pageCount: number) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Use pages like all, 1-3, 5, 8-10.");

    const start = Number.parseInt(match[1], 10);
    const end = match[2] ? Number.parseInt(match[2], 10) : start;

    if (start < 1 || end < 1 || start > pageCount || end > pageCount || start > end) {
      throw new Error(`Pages must be between 1 and ${pageCount}.`);
    }

    for (let page = start; page <= end; page += 1) {
      pages.add(page);
    }
  }

  const selectedPages = [...pages].sort((a, b) => a - b);
  if (selectedPages.length === 0) throw new Error("Choose at least one page.");
  if (selectedPages.length > MAX_RENDER_PAGES) {
    throw new Error(`Please render ${MAX_RENDER_PAGES} pages or fewer at once.`);
  }
  return selectedPages;
}

function canvasToBlob(canvas: HTMLCanvasElement, format: OutputFormat) {
  return new Promise<Blob>((resolve, reject) => {
    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas export failed"));
      },
      mimeType,
      format === "jpg" ? 0.92 : undefined,
    );
  });
}

export function PdfToImageTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultUrlsRef = useRef<string[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageSelection, setPageSelection] = useState("all");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [renderScale, setRenderScale] = useState<RenderScale>(1.5);
  const [results, setResults] = useState<ImageResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanName = useMemo(() => sanitizeFileName(selectedFile?.name ?? "document"), [selectedFile]);
  const canRender = selectedFile !== null && pageCount > 0 && !isReading && !isRendering;

  const cleanupResults = useCallback(() => {
    resultUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    resultUrlsRef.current = [];
    setResults([]);
  }, []);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const resetAll = useCallback(() => {
    cleanupResults();
    setSelectedFile(null);
    setPageCount(0);
    setPageSelection("all");
    setOutputFormat("png");
    setRenderScale(1.5);
    setIsDragging(false);
    setIsReading(false);
    setIsRendering(false);
    setIsZipping(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupResults]);

  useEffect(() => {
    return () => cleanupResults();
  }, [cleanupResults]);

  const loadFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please choose a PDF file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("This PDF is larger than the 100 MB limit.");
        return;
      }

      setError(null);
      setIsReading(true);
      cleanupResults();

      try {
        const pdfjsLib = await getPdfJs();
        const data = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        setSelectedFile(file);
        setPageCount(pdf.numPages);
        setPageSelection("all");
        await pdf.cleanup();
      } catch {
        setError("We could not read this PDF. Encrypted or damaged PDFs may not render.");
        setSelectedFile(null);
        setPageCount(0);
      } finally {
        setIsReading(false);
      }
    },
    [cleanupResults],
  );

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadFile(file);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget === event.target) setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const renderImages = async () => {
    if (!selectedFile || !canRender) return;

    setError(null);
    setIsRendering(true);
    cleanupResults();

    try {
      const pages = parsePageSelection(pageSelection, pageCount);
      const pdfjsLib = await getPdfJs();
      const data = new Uint8Array(await selectedFile.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const nextResults: ImageResult[] = [];

      for (const pageNumber of pages) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("Canvas unavailable");

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const blob = await canvasToBlob(canvas, outputFormat);
        const url = URL.createObjectURL(blob);
        resultUrlsRef.current.push(url);
        nextResults.push({
          id: createId(),
          pageNumber,
          url,
          size: blob.size,
          fileName: `${cleanName}-page-${pageNumber}.${outputFormat}`,
        });
        page.cleanup();
      }

      await pdf.cleanup();
      setResults(nextResults);
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : "We could not render this PDF.");
    } finally {
      setIsRendering(false);
    }
  };

  const downloadResult = (result: ImageResult) => {
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = result.fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const downloadZip = async () => {
    if (results.length === 0) return;

    setError(null);
    setIsZipping(true);

    try {
      const zip = new JSZip();
      for (const result of results) {
        const response = await fetch(result.url);
        zip.file(result.fileName, await response.blob());
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = zipUrl;
      anchor.download = `${cleanName}-images.zip`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(zipUrl);
    } catch {
      setError("We could not create the ZIP file. Please try downloading images individually.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.9fr)]">
      <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
        <CardHeader className="gap-1.5 px-4 pb-1 pt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base text-[#171717]">Upload PDF</CardTitle>
              <CardDescription className="text-xs leading-5">
                Choose a PDF and render pages into PNG or JPG images.
              </CardDescription>
            </div>
            {results.length > 0 ? (
              <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                <BadgeCheck className="size-3.5" />
                Images ready
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 px-4 pb-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload PDF dropzone"
            onClick={openFilePicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFilePicker();
              }
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "group flex min-h-[190px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%),linear-gradient(-45deg,#f5f5f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f5_75%),linear-gradient(-45deg,transparent_75%,#f5f5f5_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] px-4 text-center transition-colors hover:border-primary/40 hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 lg:h-[230px] lg:min-h-0",
              isDragging && "border-primary bg-[#FFF1F2]",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-[#E5E7EB] transition-colors group-hover:bg-primary group-hover:text-white">
              {isReading ? (
                <Loader2 className="size-6 animate-spin" aria-hidden="true" />
              ) : (
                <UploadCloud className="size-6" aria-hidden="true" />
              )}
            </span>
            <p className="mt-3 text-sm font-semibold text-[#171717]">
              {isReading ? "Reading PDF..." : selectedFile ? selectedFile.name : "Drop a PDF here or click to upload"}
            </p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              {selectedFile
                ? `${pageCount} ${pageCount === 1 ? "page" : "pages"} - ${formatBytes(selectedFile.size)}`
                : "Files stay in your browser while pages are rendered."}
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {selectedFile ? (
            <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#171717]">Image settings</h3>
                  <p className="text-xs text-muted-foreground">Choose pages, format, and render quality.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetAll}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pdf-image-pages" className="text-xs font-medium text-[#171717]">
                  Pages
                </Label>
                <Input
                  id="pdf-image-pages"
                  value={pageSelection}
                  onChange={(event) => {
                    cleanupResults();
                    setPageSelection(event.target.value);
                  }}
                  placeholder="all or 1-3, 5"
                  className="min-h-10"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Use all or ranges like 1-3, 5. Render up to {MAX_RENDER_PAGES} pages at once.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={outputFormat === "png" ? "default" : "outline"}
                  className="min-h-10"
                  onClick={() => {
                    cleanupResults();
                    setOutputFormat("png");
                  }}
                >
                  <Images className="size-4" />
                  PNG
                </Button>
                <Button
                  type="button"
                  variant={outputFormat === "jpg" ? "default" : "outline"}
                  className="min-h-10"
                  onClick={() => {
                    cleanupResults();
                    setOutputFormat("jpg");
                  }}
                >
                  <FileImage className="size-4" />
                  JPG
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {([1, 1.5, 2] as RenderScale[]).map((scale) => (
                  <Button
                    key={scale}
                    type="button"
                    variant={renderScale === scale ? "default" : "outline"}
                    className="min-h-10"
                    onClick={() => {
                      cleanupResults();
                      setRenderScale(scale);
                    }}
                  >
                    {scale === 1 ? "Standard" : scale === 1.5 ? "High" : "Sharp"}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3.5">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-4 pb-2 pt-0">
            <CardTitle className="text-sm text-[#171717]">Conversion summary</CardTitle>
            <CardDescription className="text-xs">Render PDF pages as image files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{pageCount}</p>
                <p className="text-[11px] text-muted-foreground">Pages</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{results.length}</p>
                <p className="text-[11px] text-muted-foreground">Images</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="truncate text-lg font-semibold uppercase text-[#171717]">{outputFormat}</p>
                <p className="text-[11px] text-muted-foreground">Format</p>
              </div>
            </div>

            <Button type="button" className="min-h-11 w-full" disabled={!canRender} onClick={renderImages}>
              {isRendering ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Rendering pages...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Convert to Images
                </>
              )}
            </Button>

            {results.length > 0 ? (
              <div className="rounded-xl border border-primary/20 bg-[#FFF1F2] p-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#171717]">Images ready</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {results.length} {results.length === 1 ? "image" : "images"} created
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {results.map((result) => (
                    <Button
                      key={result.id}
                      type="button"
                      variant="outline"
                      className="min-h-10 justify-between bg-white px-3"
                      onClick={() => downloadResult(result)}
                    >
                      <span className="min-w-0 truncate text-left">Page {result.pageNumber}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        {formatBytes(result.size)}
                        <Download className="size-3.5" />
                      </span>
                    </Button>
                  ))}
                </div>
                {results.length > 1 ? (
                  <Button type="button" className="mt-3 min-h-10 w-full" onClick={downloadZip} disabled={isZipping}>
                    {isZipping ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Creating ZIP...
                      </>
                    ) : (
                      <>
                        <Download className="size-4" />
                        Download ZIP
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="space-y-2 p-4">
            <h3 className="text-sm font-semibold text-[#171717]">Tips</h3>
            <p className="text-xs leading-5 text-muted-foreground">
              Use JPG for smaller files and PNG when you need sharper text or transparent-style graphics.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Large page ranges at high quality can take longer to render in the browser.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
