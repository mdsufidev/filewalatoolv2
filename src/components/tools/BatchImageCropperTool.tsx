"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Crop, Download, Layers, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type AspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
type OutputFormat = "original" | "jpg" | "png" | "webp";

type BatchItem = {
  id: string;
  file: File;
  sourceUrl: string;
  originalWidth: number;
  originalHeight: number;
  resultUrl: string | null;
  resultWidth: number;
  resultHeight: number;
  resultMimeType: string | null;
  resultSize: number | null;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function formatFromMime(type: string) {
  if (type === "image/jpeg") return "JPG";
  if (type === "image/png") return "PNG";
  if (type === "image/webp") return "WebP";
  return "Image";
}

function extensionFromMime(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "png";
}

function mimeFromOutput(format: OutputFormat, originalMime: string) {
  if (format === "original") return originalMime;
  if (format === "jpg") return "image/jpeg";
  if (format === "png") return "image/png";
  return "image/webp";
}

function sanitizeFileName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "image";
}

function ratioValue(value: AspectRatio) {
  if (value === "1:1") return 1;
  if (value === "4:3") return 4 / 3;
  if (value === "3:4") return 3 / 4;
  if (value === "16:9") return 16 / 9;
  if (value === "9:16") return 9 / 16;
  return null;
}

function centerCropRect(width: number, height: number, ratio: AspectRatio) {
  const numericRatio = ratioValue(ratio);
  if (!numericRatio) {
    return { x: 0, y: 0, width, height };
  }

  let cropWidth = width;
  let cropHeight = Math.round(cropWidth / numericRatio);
  if (cropHeight > height) {
    cropHeight = height;
    cropWidth = Math.round(cropHeight * numericRatio);
  }

  cropWidth = clamp(cropWidth, 1, width);
  cropHeight = clamp(cropHeight, 1, height);

  return {
    x: Math.round((width - cropWidth) / 2),
    y: Math.round((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}

async function loadImageMeta(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    const loaded = new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = reject;
    });
    image.src = url;
    return await loaded;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function BatchImageCropperTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceUrlsRef = useRef<string[]>([]);
  const resultUrlsRef = useRef<string[]>([]);

  const [items, setItems] = useState<BatchItem[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState(92);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasItems = items.length > 0;
  const canProcess = hasItems && !isProcessing;

  const cleanupUrls = useCallback(() => {
    sourceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    resultUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    sourceUrlsRef.current = [];
    resultUrlsRef.current = [];
  }, []);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const resetAll = useCallback(() => {
    cleanupUrls();
    setItems([]);
    setAspectRatio("1:1");
    setOutputFormat("original");
    setQuality(92);
    setIsProcessing(false);
    setIsDragging(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupUrls]);

  useEffect(() => {
    return () => cleanupUrls();
  }, [cleanupUrls]);

  const loadFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter((file) => {
        if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) return false;
        if (file.size > MAX_FILE_SIZE) return false;
        return true;
      });

      if (!validFiles.length) {
        setError("Please choose JPG, PNG, or WebP images up to 25 MB each.");
        return;
      }

      setError(null);
      cleanupUrls();
      setItems([]);

      const nextItems: BatchItem[] = [];
      for (const file of validFiles) {
        const sourceUrl = URL.createObjectURL(file);
        sourceUrlsRef.current.push(sourceUrl);
        const meta = await loadImageMeta(file);
        nextItems.push({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          sourceUrl,
          originalWidth: meta.width,
          originalHeight: meta.height,
          resultUrl: null,
          resultWidth: 0,
          resultHeight: 0,
          resultMimeType: null,
          resultSize: null,
        });
      }

      setItems(nextItems);
    },
    [cleanupUrls],
  );

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) void loadFiles(files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length) void loadFiles(files);
  };

  const processBatch = useCallback(async () => {
    if (!items.length) return;

    setIsProcessing(true);
    setError(null);

    try {
      const processed = await Promise.all(
        items.map(async (item) => {
          const image = new Image();
          const loaded = new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = reject;
          });
          image.src = item.sourceUrl;
          await loaded;

          const crop = centerCropRect(image.naturalWidth, image.naturalHeight, aspectRatio);
          const canvas = document.createElement("canvas");
          canvas.width = crop.width;
          canvas.height = crop.height;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Could not create canvas context.");

          context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

          const mimeType = mimeFromOutput(outputFormat, item.file.type);
          const blob = await new Promise<Blob | null>((resolve) => {
            if (mimeType === "image/jpeg" || mimeType === "image/webp") {
              canvas.toBlob(resolve, mimeType, clamp(quality / 100, 0.1, 1));
              return;
            }
            canvas.toBlob(resolve, mimeType);
          });

          if (!blob) throw new Error("Could not export cropped image.");

          const resultUrl = URL.createObjectURL(blob);
          resultUrlsRef.current.push(resultUrl);

          return {
            ...item,
            resultUrl,
            resultWidth: crop.width,
            resultHeight: crop.height,
            resultMimeType: mimeType,
            resultSize: blob.size,
          };
        }),
      );

      setItems(processed);
    } catch {
      setError("We could not crop one or more files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [aspectRatio, items, outputFormat, quality]);

  const downloadItem = useCallback((item: BatchItem) => {
    if (!item.resultUrl || !item.resultMimeType) return;

    const anchor = document.createElement("a");
    anchor.href = item.resultUrl;
    anchor.download = `${sanitizeFileName(item.file.name)}-cropped.${extensionFromMime(item.resultMimeType)}`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, []);

  const processedCount = useMemo(() => items.filter((item) => item.resultUrl).length, [items]);

  return (
    <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.9fr)]">
      <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
        <CardHeader className="gap-1.5 px-4 pb-1 pt-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base text-[#171717]">
                {hasItems ? "Batch crop workspace" : "Upload images"}
              </CardTitle>
              <CardDescription className="text-xs leading-5">
                {hasItems ? "Crop the same way across multiple files." : "Choose JPG, PNG, or WebP images up to 25 MB each."}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {hasItems ? (
                <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                  <Layers className="size-3.5" />
                  {items.length} files
                </Badge>
              ) : null}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5 px-4 pb-4">
          {!hasItems ? (
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload batch crop images"
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.currentTarget === event.target) setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={cn(
                "group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[14px] border border-dashed px-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                isDragging ? "border-primary bg-[#FFF1F2]" : "border-[#D1D5DB] bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%),linear-gradient(-45deg,#f5f5f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f5_75%),linear-gradient(-45deg,transparent_75%,#f5f5f5_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] hover:border-primary/40 hover:bg-[#FFF1F2]",
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-[#E5E7EB] transition-colors group-hover:bg-primary group-hover:text-white">
                <UploadCloud className="size-5" aria-hidden="true" />
              </span>
              <span className="mt-3 text-sm font-semibold text-[#171717]">Drop images here</span>
              <span className="mt-0.5 text-xs text-muted-foreground">Supports multiple JPG, PNG, WebP files</span>
              <span className="mt-3 inline-flex h-[38px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors group-hover:bg-[#B91C1C]">
                Choose images
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2">
                <div className="text-xs leading-5 text-muted-foreground">
                  {processedCount > 0 ? `${processedCount} of ${items.length} files ready` : `${items.length} files loaded`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" className="min-h-9 px-2.5 text-xs" onClick={openFilePicker}>
                    <RefreshCw className="size-4" />
                    Add more
                  </Button>
                  <Button type="button" variant="ghost" className="min-h-9 px-2.5 text-xs text-[#B91C1C]" onClick={resetAll}>
                    <Trash2 className="size-4" />
                    Clear all
                  </Button>
                </div>
              </div>

              <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-[#E5E7EB] bg-white p-3 shadow-none">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#171717]">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.originalWidth} x {item.originalHeight} px · {formatBytes(item.file.size)} · {formatFromMime(item.file.type)}
                        </p>
                      </div>
                      {item.resultUrl ? (
                        <Badge className="h-6 bg-[#FFF1F2] text-[11px] text-primary hover:bg-[#FFF1F2]">
                          <BadgeCheck className="size-3.5" />
                          Cropped
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="h-6 border-[#E5E7EB] text-[11px] text-muted-foreground">
                          Original
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 overflow-hidden rounded-[12px] border border-[#E5E7EB] bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.resultUrl ?? item.sourceUrl}
                        alt={item.file.name}
                        className="block h-[150px] w-full object-contain"
                        draggable={false}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {item.resultUrl
                          ? `${item.resultWidth} x ${item.resultHeight} px · ${item.resultMimeType ? formatFromMime(item.resultMimeType) : ""} · ${item.resultSize ? formatBytes(item.resultSize) : ""}`
                          : "Ready to crop"}
                      </span>
                      <div className="flex shrink-0 gap-1.5">
                        {item.resultUrl ? (
                          <Button type="button" variant="outline" className="min-h-9 px-2.5 text-xs" onClick={() => downloadItem(item)}>
                            <Download className="size-4" />
                            Download
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          className="min-h-9 px-2.5 text-xs text-[#B91C1C]"
                          onClick={() => {
                            if (item.sourceUrl) URL.revokeObjectURL(item.sourceUrl);
                            if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
                            setItems((current) => current.filter((entry) => entry.id !== item.id));
                          }}
                        >
                          <X className="size-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={handleFileInputChange}
          />

          {error ? <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-[#B91C1C]">{error}</p> : null}
        </CardContent>
      </Card>

      <aside className="min-w-0">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-3.5 pb-0 pt-0">
            <CardTitle className="text-sm text-[#171717]">Batch crop settings</CardTitle>
            <CardDescription className="text-[11px] leading-4">
              Apply the same crop ratio to every uploaded image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-3.5 pb-3.5">
            <div className="space-y-0.5">
              <Label className="text-xs">Aspect ratio</Label>
              <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value as AspectRatio)} disabled={!hasItems}>
                <SelectTrigger className="h-10 w-full text-sm lg:h-8">
                  <SelectValue placeholder="Select ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free / original</SelectItem>
                  <SelectItem value="1:1">Square 1:1</SelectItem>
                  <SelectItem value="4:3">Classic 4:3</SelectItem>
                  <SelectItem value="3:4">Portrait 3:4</SelectItem>
                  <SelectItem value="16:9">Wide 16:9</SelectItem>
                  <SelectItem value="9:16">Story 9:16</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Format</Label>
              <Select
                value={outputFormat}
                onValueChange={(value) => {
                  setOutputFormat(value as OutputFormat);
                }}
                disabled={!hasItems}
              >
                <SelectTrigger className="h-10 w-full text-sm lg:h-8">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Keep original</SelectItem>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(outputFormat === "jpg" || outputFormat === "webp") && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="batch-quality" className="text-xs">
                    Quality
                  </Label>
                  <span className="text-xs text-muted-foreground">{quality}</span>
                </div>
                <input
                  id="batch-quality"
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(event) => setQuality(Number.parseInt(event.target.value, 10))}
                  className="h-2 w-full cursor-pointer accent-primary"
                  disabled={!hasItems}
                />
              </div>
            )}

            <div className="grid gap-1.5 pt-0.5 lg:sticky lg:bottom-3 lg:z-10">
              <Button
                type="button"
                className="min-h-11 bg-primary hover:bg-[#B91C1C] lg:min-h-9"
                onClick={processBatch}
                disabled={!canProcess}
              >
                <Crop className="size-4" />
                {isProcessing ? "Cropping..." : "Crop Batch"}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetAll} disabled={!hasItems}>
                Reset
              </Button>
            </div>

            {hasItems ? (
              <p className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-xs leading-5 text-muted-foreground">
                Batch crop applies one ratio to every uploaded image. Each file keeps its own download.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
