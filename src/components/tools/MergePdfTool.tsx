"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
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

type PdfEntry = {
  id: string;
  file: File;
  pages: number;
};

type MergeResult = {
  url: string;
  size: number;
  fileName: string;
  pageCount: number;
};

const MAX_FILE_SIZE = 75 * 1024 * 1024;
const MAX_TOTAL_SIZE = 250 * 1024 * 1024;

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
  return withoutExtension.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "merged";
}

async function readPdf(file: File) {
  const bytes = await file.arrayBuffer();
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export function MergePdfTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const [files, setFiles] = useState<PdfEntry[]>([]);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSize = useMemo(() => files.reduce((sum, item) => sum + item.file.size, 0), [files]);
  const totalPages = useMemo(() => files.reduce((sum, item) => sum + item.pages, 0), [files]);
  const canMerge = files.length >= 2 && !isReading && !isMerging;

  const cleanupResultUrl = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  const resetResult = useCallback(() => {
    cleanupResultUrl();
    setResult(null);
  }, [cleanupResultUrl]);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const resetAll = useCallback(() => {
    cleanupResultUrl();
    setFiles([]);
    setResult(null);
    setError(null);
    setIsDragging(false);
    setIsReading(false);
    setIsMerging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupResultUrl]);

  useEffect(() => {
    return () => cleanupResultUrl();
  }, [cleanupResultUrl]);

  const addFiles = useCallback(
    async (incomingFiles: FileList | File[]) => {
      const nextFiles = Array.from(incomingFiles);
      if (nextFiles.length === 0) return;

      setError(null);
      setIsReading(true);
      resetResult();

      try {
        const currentTotal = files.reduce((sum, item) => sum + item.file.size, 0);
        const incomingTotal = nextFiles.reduce((sum, file) => sum + file.size, 0);
        if (currentTotal + incomingTotal > MAX_TOTAL_SIZE) {
          setError("Total PDF size should stay under 250 MB.");
          return;
        }

        const entries: PdfEntry[] = [];
        for (const file of nextFiles) {
          if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
            setError("Please choose PDF files only.");
            continue;
          }
          if (file.size > MAX_FILE_SIZE) {
            setError(`${file.name} is larger than the 75 MB per-file limit.`);
            continue;
          }

          try {
            const pdf = await readPdf(file);
            entries.push({
              id: createId(),
              file,
              pages: pdf.getPageCount(),
            });
          } catch {
            setError("One PDF could not be read. Encrypted or damaged PDFs may not merge.");
          }
        }

        if (entries.length > 0) {
          setFiles((current) => [...current, ...entries]);
        }
      } finally {
        setIsReading(false);
      }
    },
    [files, resetResult],
  );

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void addFiles(event.target.files);
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
    void addFiles(event.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    resetResult();
    setFiles((current) => current.filter((item) => item.id !== id));
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= files.length) return;

    resetResult();
    setFiles((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const mergeFiles = async () => {
    if (!canMerge) return;

    setError(null);
    setIsMerging(true);
    resetResult();

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const sourcePdf = await readPdf(item.file);
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const mergedBuffer = new ArrayBuffer(mergedBytes.byteLength);
      new Uint8Array(mergedBuffer).set(mergedBytes);
      const blob = new Blob([mergedBuffer], { type: "application/pdf" });
      const nextResultUrl = URL.createObjectURL(blob);
      resultUrlRef.current = nextResultUrl;

      setResult({
        url: nextResultUrl,
        size: blob.size,
        fileName: `${sanitizeFileName(files[0]?.file.name ?? "merged")}-merged.pdf`,
        pageCount: mergedPdf.getPageCount(),
      });
    } catch {
      setError("We could not merge these PDFs. Try removing encrypted or damaged files.");
    } finally {
      setIsMerging(false);
    }
  };

  const downloadMergedPdf = () => {
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
              <CardTitle className="text-base text-[#171717]">Upload PDF files</CardTitle>
              <CardDescription className="text-xs leading-5">
                Add two or more PDFs, arrange the order, and merge them into one document.
              </CardDescription>
            </div>
            {result ? (
              <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                <BadgeCheck className="size-3.5" />
                Merged successfully
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 px-4 pb-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload PDF files dropzone"
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
              multiple
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
              {isReading ? "Reading PDF files..." : "Drop PDF files here or click to upload"}
            </p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              Supports multiple PDFs. Files stay in your browser while they are merged.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {files.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#171717]">Merge order</h3>
                  <p className="text-xs text-muted-foreground">Top to bottom becomes first to last in the PDF.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetAll}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              </div>

              <div className="grid gap-2">
                {files.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex min-h-[68px] items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 shadow-sm"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F2] text-primary">
                      <FileText className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#171717]">{item.file.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.pages} {item.pages === 1 ? "page" : "pages"} - {formatBytes(item.file.size)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Move ${item.file.name} up`}
                        disabled={index === 0}
                        onClick={() => moveFile(index, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Move ${item.file.name} down`}
                        disabled={index === files.length - 1}
                        onClick={() => moveFile(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${item.file.name}`}
                        onClick={() => removeFile(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3.5">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-4 pb-2 pt-0">
            <CardTitle className="text-sm text-[#171717]">Merge summary</CardTitle>
            <CardDescription className="text-xs">Review files before creating the final PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{files.length}</p>
                <p className="text-[11px] text-muted-foreground">Files</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{totalPages}</p>
                <p className="text-[11px] text-muted-foreground">Pages</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="truncate text-lg font-semibold text-[#171717]">{formatBytes(totalSize)}</p>
                <p className="text-[11px] text-muted-foreground">Size</p>
              </div>
            </div>

            <Button type="button" className="min-h-11 w-full" disabled={!canMerge} onClick={mergeFiles}>
              {isMerging ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Merging PDFs...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Merge PDF
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
                    <p className="text-sm font-semibold text-[#171717]">Merged PDF ready</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {result.pageCount} pages - {formatBytes(result.size)}
                    </p>
                  </div>
                </div>
                <Button type="button" className="mt-3 min-h-10 w-full" onClick={downloadMergedPdf}>
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
              Add PDFs in the exact order you want, or use the arrow buttons to reorder them before merging.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Password-protected PDFs may need to be unlocked before they can be merged.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
