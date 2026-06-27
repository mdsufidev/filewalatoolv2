"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  BadgeCheck,
  Download,
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
import { cn } from "@/lib/utils";

type WordSource = {
  file: File;
  text: string;
};

type ConversionResult = {
  url: string;
  fileName: string;
  size: number;
  pages: number;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 54;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;

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

function isDocx(file: File) {
  return (
    file.name.toLowerCase().endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function isTextLike(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".txt") || name.endsWith(".rtf") || file.type.startsWith("text/");
}

async function extractText(file: File) {
  if (isDocx(file)) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  if (isTextLike(file)) {
    return (await file.text()).trim();
  }

  throw new Error("Please choose a DOCX, TXT, or RTF file.");
}

function wrapText(text: string, maxWidth: number, measure: (value: string) => number) {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

export function WordToPdfTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const [source, setSource] = useState<WordSource | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanName = useMemo(() => sanitizeFileName(source?.file.name ?? "document"), [source]);
  const wordCount = useMemo(() => source?.text.split(/\s+/).filter(Boolean).length ?? 0, [source]);
  const canConvert = source !== null && source.text.length > 0 && !isReading && !isConverting;

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
    setSource(null);
    setIsDragging(false);
    setIsReading(false);
    setIsConverting(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupResult]);

  useEffect(() => {
    return () => cleanupResult();
  }, [cleanupResult]);

  const loadFile = useCallback(
    async (file: File) => {
      if (!isDocx(file) && !isTextLike(file)) {
        setError("Please choose a DOCX, TXT, or RTF file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("This document is larger than the 25 MB limit.");
        return;
      }

      setError(null);
      setIsReading(true);
      cleanupResult();

      try {
        const text = await extractText(file);
        if (!text) throw new Error("No readable text found.");
        setSource({ file, text });
      } catch {
        setError("We could not read this document. Try a DOCX or plain text file.");
        setSource(null);
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

  const convertToPdf = async () => {
    if (!source || !canConvert) return;

    setError(null);
    setIsConverting(true);
    cleanupResult();

    try {
      const pdf = await PDFDocument.create();
      const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
      const maxTextWidth = PAGE_WIDTH - MARGIN * 2;
      const lines = wrapText(source.text, maxTextWidth, (value) =>
        regularFont.widthOfTextAtSize(value, FONT_SIZE),
      );

      let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let y = PAGE_HEIGHT - MARGIN;
      let pages = 1;

      page.drawText(sanitizeFileName(source.file.name).replaceAll("-", " "), {
        x: MARGIN,
        y,
        size: 15,
        font: boldFont,
        color: rgb(0.09, 0.09, 0.09),
      });
      y -= LINE_HEIGHT * 1.8;

      for (const line of lines) {
        if (y < MARGIN) {
          page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          pages += 1;
          y = PAGE_HEIGHT - MARGIN;
        }
        if (line) {
          page.drawText(line, {
            x: MARGIN,
            y,
            size: FONT_SIZE,
            font: regularFont,
            color: rgb(0.09, 0.09, 0.09),
          });
        }
        y -= LINE_HEIGHT;
      }

      pdf.setTitle(source.file.name);
      pdf.setCreator("FileWalaTool");
      pdf.setProducer("FileWalaTool");

      const bytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = uint8ArrayToBlob(bytes);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        url,
        size: blob.size,
        pages,
        fileName: `${cleanName}.pdf`,
      });
    } catch {
      setError("We could not convert this document. Try another DOCX or TXT file.");
    } finally {
      setIsConverting(false);
    }
  };

  const downloadPdf = () => {
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
              <CardTitle className="text-base text-[#171717]">Upload document</CardTitle>
              <CardDescription className="text-xs leading-5">
                Choose a DOCX, TXT, or RTF file and convert readable text into a PDF.
              </CardDescription>
            </div>
            {result ? (
              <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                <BadgeCheck className="size-3.5" />
                Converted successfully
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 px-4 pb-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload Word document dropzone"
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
              accept=".docx,.txt,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/rtf"
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
              {isReading ? "Reading document..." : source ? source.file.name : "Drop a Word document here or click to upload"}
            </p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              {source
                ? `${wordCount} ${wordCount === 1 ? "word" : "words"} - ${formatBytes(source.file.size)}`
                : "DOCX formatting is simplified into clean readable PDF text."}
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {source ? (
            <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#171717]">Document preview</h3>
                  <p className="text-xs text-muted-foreground">Text that will be placed into the PDF.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetAll}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              </div>
              <div className="max-h-48 overflow-auto rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-xs leading-5 text-muted-foreground">
                {source.text.slice(0, 1800)}
                {source.text.length > 1800 ? "..." : ""}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3.5">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-4 pb-2 pt-0">
            <CardTitle className="text-sm text-[#171717]">Conversion summary</CardTitle>
            <CardDescription className="text-xs">Review the document before creating the PDF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{source ? 1 : 0}</p>
                <p className="text-[11px] text-muted-foreground">File</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{wordCount}</p>
                <p className="text-[11px] text-muted-foreground">Words</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="truncate text-lg font-semibold text-[#171717]">
                  {source ? formatBytes(source.file.size) : "0 B"}
                </p>
                <p className="text-[11px] text-muted-foreground">Size</p>
              </div>
            </div>

            <Button type="button" className="min-h-11 w-full" disabled={!canConvert} onClick={convertToPdf}>
              {isConverting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating PDF...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Convert to PDF
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
                    <p className="text-sm font-semibold text-[#171717]">PDF ready</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {result.pages} {result.pages === 1 ? "page" : "pages"} - {formatBytes(result.size)}
                    </p>
                  </div>
                </div>
                <Button type="button" className="mt-3 min-h-10 w-full" onClick={downloadPdf}>
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
              DOCX text is converted into a clean PDF layout. Complex Word styling, tables, and images may be simplified.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              For best results, use standard DOCX documents with selectable text.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
