"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  BadgeCheck,
  Download,
  FileText,
  Loader2,
  Minimize2,
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
import { cn } from "@/lib/utils";

type CompressionLevel = "balanced" | "maximum";

type CompressResult = {
  url: string;
  fileName: string;
  size: number;
  originalSize: number;
  pageCount: number;
};

const MAX_FILE_SIZE = 120 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function sanitizeFileName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "document";
}

function uint8ArrayToBlob(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "application/pdf" });
}

async function loadPdf(file: File) {
  const bytes = await file.arrayBuffer();
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

function savingsPercent(originalSize: number, compressedSize: number) {
  if (originalSize <= 0 || compressedSize >= originalSize) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
}

export function CompressPdfTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>("balanced");
  const [result, setResult] = useState<CompressResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanName = useMemo(() => sanitizeFileName(selectedFile?.name ?? "document"), [selectedFile]);
  const canCompress = selectedFile !== null && pageCount > 0 && !isReading && !isCompressing;
  const savedPercent = result ? savingsPercent(result.originalSize, result.size) : 0;
  const savedBytes = result ? Math.max(0, result.originalSize - result.size) : 0;

  const cleanupResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setResult(null);
  }, []);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const resetAll = useCallback(() => {
    cleanupResult();
    setSelectedFile(null);
    setPageCount(0);
    setCompressionLevel("balanced");
    setIsDragging(false);
    setIsReading(false);
    setIsCompressing(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupResult]);

  useEffect(() => {
    return () => cleanupResult();
  }, [cleanupResult]);

  const loadFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please choose a PDF file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("This PDF is larger than the 120 MB limit.");
        return;
      }

      setError(null);
      setIsReading(true);
      cleanupResult();

      try {
        const pdf = await loadPdf(file);
        const pages = pdf.getPageCount();
        if (pages < 1) throw new Error("Empty PDF");
        setSelectedFile(file);
        setPageCount(pages);
      } catch {
        setError("We could not read this PDF. Encrypted or damaged PDFs may not compress.");
        setSelectedFile(null);
        setPageCount(0);
      } finally {
        setIsReading(false);
      }
    },
    [cleanupResult],
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

  const compressPdf = async () => {
    if (!selectedFile || !canCompress) return;

    setError(null);
    setIsCompressing(true);
    cleanupResult();

    try {
      const pdf = await loadPdf(selectedFile);
      if (compressionLevel === "maximum") {
        pdf.setTitle("");
        pdf.setAuthor("");
        pdf.setSubject("");
        pdf.setKeywords([]);
        pdf.setProducer("FileWalaTool");
        pdf.setCreator("FileWalaTool");
      }

      const compressedBytes = await pdf.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: compressionLevel === "maximum" ? 100 : 50,
      });
      const blob = uint8ArrayToBlob(compressedBytes);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        url,
        size: blob.size,
        originalSize: selectedFile.size,
        pageCount: pdf.getPageCount(),
        fileName: `${cleanName}-compressed.pdf`,
      });
    } catch {
      setError("We could not compress this PDF. Try another file or unlock the PDF first.");
    } finally {
      setIsCompressing(false);
    }
  };

  const downloadCompressedPdf = () => {
    if (!result) return;

    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = result.fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.9fr)]">
      <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
        <CardHeader className="gap-1.5 px-4 pb-1 pt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base text-[#171717]">Upload PDF</CardTitle>
              <CardDescription className="text-xs leading-5">
                Choose one PDF and rebuild it into a smaller optimized file.
              </CardDescription>
            </div>
            {result ? (
              <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                <BadgeCheck className="size-3.5" />
                Compressed successfully
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
                : "Files stay in your browser while they are optimized."}
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
                  <h3 className="text-sm font-semibold text-[#171717]">Compression settings</h3>
                  <p className="text-xs text-muted-foreground">Choose how aggressively to optimize the PDF structure.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetAll}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={compressionLevel === "balanced" ? "default" : "outline"}
                  className="min-h-10"
                  onClick={() => {
                    cleanupResult();
                    setCompressionLevel("balanced");
                  }}
                >
                  <Minimize2 className="size-4" />
                  Balanced
                </Button>
                <Button
                  type="button"
                  variant={compressionLevel === "maximum" ? "default" : "outline"}
                  className="min-h-10"
                  onClick={() => {
                    cleanupResult();
                    setCompressionLevel("maximum");
                  }}
                >
                  <FileText className="size-4" />
                  Maximum
                </Button>
              </div>

              <p className="rounded-lg bg-[#FAFAFA] px-3 py-2 text-xs leading-5 text-muted-foreground">
                This browser tool optimizes PDF structure and metadata. PDFs made mostly of scanned images may not shrink much.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3.5">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-4 pb-2 pt-0">
            <CardTitle className="text-sm text-[#171717]">Compression summary</CardTitle>
            <CardDescription className="text-xs">Review the PDF before downloading the optimized file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{pageCount}</p>
                <p className="text-[11px] text-muted-foreground">Pages</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="truncate text-lg font-semibold text-[#171717]">
                  {selectedFile ? formatBytes(selectedFile.size) : "0 B"}
                </p>
                <p className="text-[11px] text-muted-foreground">Original</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="truncate text-lg font-semibold text-[#171717]">
                  {result ? formatBytes(result.size) : "0 B"}
                </p>
                <p className="text-[11px] text-muted-foreground">Output</p>
              </div>
            </div>

            <Button type="button" className="min-h-11 w-full" disabled={!canCompress} onClick={compressPdf}>
              {isCompressing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Compressing PDF...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Compress PDF
                </>
              )}
            </Button>

            {result ? (
              <div className="rounded-xl border border-primary/20 bg-[#FFF1F2] p-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary">
                    <BadgeCheck className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#171717]">Compressed PDF ready</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {savedPercent > 0
                        ? `Saved ${savedPercent}% (${formatBytes(savedBytes)})`
                        : "Output is optimized, but this file did not shrink further."}
                    </p>
                  </div>
                </div>
                <Button type="button" className="mt-3 min-h-10 w-full" onClick={downloadCompressedPdf}>
                  <Download className="size-4" />
                  Download PDF
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardContent className="space-y-2 p-4">
            <h3 className="text-sm font-semibold text-[#171717]">Tips</h3>
            <p className="text-xs leading-5 text-muted-foreground">
              Text-heavy PDFs usually compress better than scanned image PDFs in a browser-only workflow.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Password-protected PDFs may need to be unlocked before they can be compressed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
