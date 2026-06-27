"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  BadgeCheck,
  Download,
  Loader2,
  Stamp,
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

type WatermarkPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

type WatermarkResult = {
  url: string;
  fileName: string;
  size: number;
  pageCount: number;
  watermarkedPages: number;
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

function clampNumber(value: string, min: number, max: number, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parsePageSelection(value: string, pageCount: number) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") {
    return Array.from({ length: pageCount }, (_, index) => index);
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
      pages.add(page - 1);
    }
  }

  const selectedPages = [...pages].sort((a, b) => a - b);
  if (selectedPages.length === 0) throw new Error("Choose at least one page.");
  return selectedPages;
}

function resolvePosition(position: WatermarkPosition, width: number, height: number, textWidth: number, fontSize: number) {
  const inset = 48;
  if (position === "top-left") return { x: inset, y: height - inset - fontSize };
  if (position === "top-right") return { x: width - inset - textWidth, y: height - inset - fontSize };
  if (position === "bottom-left") return { x: inset, y: inset };
  if (position === "bottom-right") return { x: width - inset - textWidth, y: inset };
  return { x: (width - textWidth) / 2, y: height / 2 };
}

async function loadPdf(file: File) {
  const bytes = await file.arrayBuffer();
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}

export function WatermarkPdfTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [pageSelection, setPageSelection] = useState("all");
  const [position, setPosition] = useState<WatermarkPosition>("center");
  const [angle, setAngle] = useState(-35);
  const [opacity, setOpacity] = useState(25);
  const [fontSize, setFontSize] = useState(44);
  const [result, setResult] = useState<WatermarkResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanName = useMemo(() => sanitizeFileName(selectedFile?.name ?? "document"), [selectedFile]);
  const canWatermark = selectedFile !== null && pageCount > 0 && watermarkText.trim().length > 0 && !isReading && !isWatermarking;

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
    setWatermarkText("CONFIDENTIAL");
    setPageSelection("all");
    setPosition("center");
    setAngle(-35);
    setOpacity(25);
    setFontSize(44);
    setIsDragging(false);
    setIsReading(false);
    setIsWatermarking(false);
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
        setPageSelection("all");
      } catch {
        setError("We could not read this PDF. Encrypted or damaged PDFs may not accept a watermark.");
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

  const applyWatermark = async () => {
    if (!selectedFile || !canWatermark) return;

    setError(null);
    setIsWatermarking(true);
    cleanupResult();

    try {
      const pdf = await loadPdf(selectedFile);
      const pages = pdf.getPages();
      const selectedPages = parsePageSelection(pageSelection, pages.length);
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);
      const safeText = watermarkText.trim();
      const safeFontSize = Math.max(12, Math.min(96, fontSize));
      const safeOpacity = Math.max(5, Math.min(90, opacity)) / 100;

      selectedPages.forEach((pageIndex) => {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(safeText, safeFontSize);
        const { x, y } = resolvePosition(position, width, height, textWidth, safeFontSize);

        page.drawText(safeText, {
          x,
          y,
          size: safeFontSize,
          font,
          color: rgb(0.72, 0.11, 0.11),
          opacity: safeOpacity,
          rotate: degrees(angle),
        });
      });

      const bytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = uint8ArrayToBlob(bytes);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        url,
        size: blob.size,
        pageCount: pdf.getPageCount(),
        watermarkedPages: selectedPages.length,
        fileName: `${cleanName}-watermarked.pdf`,
      });
    } catch (watermarkError) {
      setError(watermarkError instanceof Error ? watermarkError.message : "We could not watermark this PDF.");
    } finally {
      setIsWatermarking(false);
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
              <CardTitle className="text-base text-[#171717]">Upload PDF</CardTitle>
              <CardDescription className="text-xs leading-5">
                Choose one PDF and add a text watermark to all or selected pages.
              </CardDescription>
            </div>
            {result ? (
              <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                <BadgeCheck className="size-3.5" />
                Watermark added
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
                : "Files stay in your browser while the watermark is applied."}
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
                  <h3 className="text-sm font-semibold text-[#171717]">Watermark settings</h3>
                  <p className="text-xs text-muted-foreground">Customize text, pages, position, and appearance.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetAll}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="watermark-text" className="text-xs font-medium text-[#171717]">
                    Watermark text
                  </Label>
                  <Input
                    id="watermark-text"
                    value={watermarkText}
                    onChange={(event) => {
                      cleanupResult();
                      setWatermarkText(event.target.value);
                    }}
                    className="min-h-10"
                    maxLength={60}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="watermark-pages" className="text-xs font-medium text-[#171717]">
                    Pages
                  </Label>
                  <Input
                    id="watermark-pages"
                    value={pageSelection}
                    onChange={(event) => {
                      cleanupResult();
                      setPageSelection(event.target.value);
                    }}
                    placeholder="all or 1-3, 5"
                    className="min-h-10"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-5">
                {(["center", "top-left", "top-right", "bottom-left", "bottom-right"] as WatermarkPosition[]).map((nextPosition) => (
                  <Button
                    key={nextPosition}
                    type="button"
                    variant={position === nextPosition ? "default" : "outline"}
                    className="min-h-10 px-2 text-xs"
                    onClick={() => {
                      cleanupResult();
                      setPosition(nextPosition);
                    }}
                  >
                    {nextPosition.replace("-", " ")}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="watermark-angle" className="text-xs font-medium text-[#171717]">
                    Angle
                  </Label>
                  <Input
                    id="watermark-angle"
                    type="number"
                    value={angle}
                    onChange={(event) => {
                      cleanupResult();
                      setAngle(clampNumber(event.target.value, -90, 90, -35));
                    }}
                    className="min-h-10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="watermark-opacity" className="text-xs font-medium text-[#171717]">
                    Opacity %
                  </Label>
                  <Input
                    id="watermark-opacity"
                    type="number"
                    value={opacity}
                    onChange={(event) => {
                      cleanupResult();
                      setOpacity(clampNumber(event.target.value, 5, 90, 25));
                    }}
                    className="min-h-10"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="watermark-size" className="text-xs font-medium text-[#171717]">
                    Font size
                  </Label>
                  <Input
                    id="watermark-size"
                    type="number"
                    value={fontSize}
                    onChange={(event) => {
                      cleanupResult();
                      setFontSize(clampNumber(event.target.value, 12, 96, 44));
                    }}
                    className="min-h-10"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3.5">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-4 pb-2 pt-0">
            <CardTitle className="text-sm text-[#171717]">Watermark summary</CardTitle>
            <CardDescription className="text-xs">Review the PDF before downloading the watermarked file.</CardDescription>
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
                <p className="text-lg font-semibold text-[#171717]">{opacity}%</p>
                <p className="text-[11px] text-muted-foreground">Opacity</p>
              </div>
            </div>

            <Button type="button" className="min-h-11 w-full" disabled={!canWatermark} onClick={applyWatermark}>
              {isWatermarking ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding watermark...
                </>
              ) : (
                <>
                  <Stamp className="size-4" />
                  Add Watermark
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
                    <p className="text-sm font-semibold text-[#171717]">Watermarked PDF ready</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {result.watermarkedPages} {result.watermarkedPages === 1 ? "page" : "pages"} - {formatBytes(result.size)}
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
              Center position with a diagonal angle works well for draft or confidential marks.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Lower opacity keeps the document readable while still marking each page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
