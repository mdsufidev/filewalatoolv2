"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import {
  BadgeCheck,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Scissors,
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

type SplitMode = "ranges" | "pages";

type SplitResult = {
  id: string;
  url: string;
  fileName: string;
  size: number;
  pages: string;
};

const MAX_FILE_SIZE = 100 * 1024 * 1024;

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

function uint8ArrayToBlob(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "application/pdf" });
}

function parseRanges(value: string, pageCount: number) {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) throw new Error("Enter at least one page or range.");

  return parts.map((part) => {
    const match = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Use ranges like 1-3, 5, 8-10.");

    const start = Number.parseInt(match[1], 10);
    const end = match[2] ? Number.parseInt(match[2], 10) : start;

    if (start < 1 || end < 1 || start > pageCount || end > pageCount || start > end) {
      throw new Error(`Pages must be between 1 and ${pageCount}.`);
    }

    const indices = Array.from({ length: end - start + 1 }, (_, index) => start + index - 1);
    return {
      label: start === end ? `${start}` : `${start}-${end}`,
      indices,
    };
  });
}

async function loadPdf(file: File) {
  const bytes = await file.arrayBuffer();
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export function SplitPdfTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultUrlsRef = useRef<string[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [splitMode, setSplitMode] = useState<SplitMode>("ranges");
  const [rangeValue, setRangeValue] = useState("1");
  const [results, setResults] = useState<SplitResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSplit = selectedFile !== null && pageCount > 0 && !isReading && !isSplitting;
  const cleanName = useMemo(() => sanitizeFileName(selectedFile?.name ?? "document"), [selectedFile]);

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
    setSplitMode("ranges");
    setRangeValue("1");
    setIsDragging(false);
    setIsReading(false);
    setIsSplitting(false);
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
        const pdf = await loadPdf(file);
        const pages = pdf.getPageCount();
        if (pages < 1) throw new Error("Empty PDF");
        setSelectedFile(file);
        setPageCount(pages);
        setRangeValue(pages > 1 ? `1-${Math.min(2, pages)}` : "1");
        setSplitMode("ranges");
      } catch {
        setError("We could not read this PDF. Encrypted or damaged PDFs may not split.");
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

  const splitPdf = async () => {
    if (!selectedFile || !canSplit) return;

    setError(null);
    setIsSplitting(true);
    cleanupResults();

    try {
      const sourcePdf = await loadPdf(selectedFile);
      const groups =
        splitMode === "pages"
          ? Array.from({ length: pageCount }, (_, index) => ({ label: `${index + 1}`, indices: [index] }))
          : parseRanges(rangeValue, pageCount);

      const nextResults: SplitResult[] = [];

      for (const group of groups) {
        const outputPdf = await PDFDocument.create();
        const copiedPages = await outputPdf.copyPages(sourcePdf, group.indices);
        copiedPages.forEach((page) => outputPdf.addPage(page));
        const bytes = await outputPdf.save();
        const blob = uint8ArrayToBlob(bytes);
        const url = URL.createObjectURL(blob);
        resultUrlsRef.current.push(url);
        nextResults.push({
          id: createId(),
          url,
          size: blob.size,
          pages: group.label,
          fileName: `${cleanName}-pages-${group.label}.pdf`,
        });
      }

      setResults(nextResults);
    } catch (splitError) {
      setError(splitError instanceof Error ? splitError.message : "We could not split this PDF.");
    } finally {
      setIsSplitting(false);
    }
  };

  const downloadResult = (result: SplitResult) => {
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = result.fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const downloadAllAsZip = async () => {
    if (results.length === 0) return;

    setError(null);
    setIsZipping(true);

    try {
      const zip = new JSZip();

      for (const result of results) {
        const response = await fetch(result.url);
        const blob = await response.blob();
        zip.file(result.fileName, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = zipUrl;
      anchor.download = `${cleanName}-split-pages.zip`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(zipUrl);
    } catch {
      setError("We could not create the ZIP file. Please try downloading the PDFs individually.");
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
                Choose one PDF, then split it by page ranges or into individual pages.
              </CardDescription>
            </div>
            {results.length > 0 ? (
              <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                <BadgeCheck className="size-3.5" />
                Split successfully
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
                : "Files stay in your browser while they are split."}
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
                  <h3 className="text-sm font-semibold text-[#171717]">Split settings</h3>
                  <p className="text-xs text-muted-foreground">Choose exactly how the output PDFs are created.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetAll}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={splitMode === "ranges" ? "default" : "outline"}
                  className="min-h-10"
                  onClick={() => {
                    cleanupResults();
                    setSplitMode("ranges");
                  }}
                >
                  <Scissors className="size-4" />
                  Split by ranges
                </Button>
                <Button
                  type="button"
                  variant={splitMode === "pages" ? "default" : "outline"}
                  className="min-h-10"
                  onClick={() => {
                    cleanupResults();
                    setSplitMode("pages");
                  }}
                >
                  <FileText className="size-4" />
                  Every page
                </Button>
              </div>

              {splitMode === "ranges" ? (
                <div className="grid gap-2">
                  <Label htmlFor="split-ranges" className="text-xs font-medium text-[#171717]">
                    Pages or ranges
                  </Label>
                  <Input
                    id="split-ranges"
                    value={rangeValue}
                    onChange={(event) => {
                      cleanupResults();
                      setRangeValue(event.target.value);
                    }}
                    placeholder="Example: 1-3, 5, 8-10"
                    className="min-h-10"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Use commas for multiple outputs. Example: 1-2, 3-5 creates two PDFs.
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-[#FAFAFA] px-3 py-2 text-xs leading-5 text-muted-foreground">
                  This will create {pageCount} separate PDF {pageCount === 1 ? "file" : "files"}, one for each page.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3.5">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-4 pb-2 pt-0">
            <CardTitle className="text-sm text-[#171717]">Split summary</CardTitle>
            <CardDescription className="text-xs">Review the PDF before creating output files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{selectedFile ? 1 : 0}</p>
                <p className="text-[11px] text-muted-foreground">File</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{pageCount}</p>
                <p className="text-[11px] text-muted-foreground">Pages</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="truncate text-lg font-semibold text-[#171717]">
                  {selectedFile ? formatBytes(selectedFile.size) : "0 B"}
                </p>
                <p className="text-[11px] text-muted-foreground">Size</p>
              </div>
            </div>

            <Button type="button" className="min-h-11 w-full" disabled={!canSplit} onClick={splitPdf}>
              {isSplitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Splitting PDF...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Split PDF
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
                    <p className="text-sm font-semibold text-[#171717]">Split files ready</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {results.length} {results.length === 1 ? "PDF" : "PDFs"} created
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
                      <span className="min-w-0 truncate text-left">Pages {result.pages}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        {formatBytes(result.size)}
                        <Download className="size-3.5" />
                      </span>
                    </Button>
                  ))}
                </div>
                {results.length > 1 ? (
                  <Button type="button" className="mt-3 min-h-10 w-full" onClick={downloadAllAsZip} disabled={isZipping}>
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
              Use ranges like 1-3, 5, 8-10 to create separate PDFs from specific page groups.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Password-protected PDFs may need to be unlocked before they can be split.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
