"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, RefreshCw, RotateCcw, UploadCloud, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type OutputFormat = "jpg" | "webp" | "png";
type PreviewMode = "before" | "after";

type ResultState = {
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  quality: number;
};

type KbResizerToolProps = {
  title?: string;
  description?: string;
  settingsTitle?: string;
  settingsDescription?: string;
  defaultTargetKb?: number;
  targetPills?: number[];
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

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

function mimeFromOutput(format: OutputFormat) {
  if (format === "jpg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

function extensionFromMime(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}

function sanitizeFileName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "image";
}

function positiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  const qualityValue = mimeType === "image/jpeg" || mimeType === "image/webp" ? quality / 100 : undefined;
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, qualityValue));
}

export function KbResizerTool({
  title = "KB Resizer",
  description = "Resize images to a target KB file size online with FileWalaTool.",
  settingsTitle = "KB settings",
  settingsDescription = "Upload an image to set a target size.",
  defaultTargetKb = 100,
  targetPills = [20, 50, 100, 200],
}: KbResizerToolProps = {}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("before");
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [targetKb, setTargetKb] = useState(defaultTargetKb);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jpg");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canResize = selectedFile !== null && targetKb > 0 && !isProcessing;
  const visibleUrl = previewMode === "after" && result ? result.url : sourceUrl;
  const previewTitle = previewMode === "after" && result ? "Target KB preview" : "Original preview";
  const targetBytes = targetKb * 1024;
  const savings = useMemo(() => {
    if (!selectedFile || !result) return null;
    return Math.max(0, Math.round((1 - result.size / selectedFile.size) * 100));
  }, [result, selectedFile]);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const cleanupSourceUrl = useCallback(() => {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = null;
    }
  }, []);

  const cleanupResultUrl = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  const resetResult = useCallback(() => {
    cleanupResultUrl();
    setResult(null);
    setPreviewMode("before");
  }, [cleanupResultUrl]);

  const resetAll = useCallback(() => {
    cleanupSourceUrl();
    cleanupResultUrl();
    setSelectedFile(null);
    setSourceUrl(null);
    setResult(null);
    setPreviewMode("before");
    setOriginalWidth(0);
    setOriginalHeight(0);
    setTargetKb(defaultTargetKb);
    setOutputFormat("jpg");
    setIsProcessing(false);
    setIsDragging(false);
    setError(null);
    imageRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupResultUrl, cleanupSourceUrl, defaultTargetKb]);

  useEffect(() => {
    return () => {
      cleanupSourceUrl();
      cleanupResultUrl();
    };
  }, [cleanupResultUrl, cleanupSourceUrl]);

  const loadImageFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
        setError("Please choose a JPG, PNG, or WebP image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("This image is larger than the 25 MB limit.");
        return;
      }

      cleanupSourceUrl();
      cleanupResultUrl();
      setError(null);
      setResult(null);
      setPreviewMode("before");

      const nextSourceUrl = URL.createObjectURL(file);
      sourceUrlRef.current = nextSourceUrl;

      const image = new Image();
      image.onload = () => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (width <= 0 || height <= 0) {
          URL.revokeObjectURL(nextSourceUrl);
          sourceUrlRef.current = null;
          setError("We could not read this image. Please try another file.");
          return;
        }

        imageRef.current = image;
        setSelectedFile(file);
        setSourceUrl(nextSourceUrl);
        setOriginalWidth(width);
        setOriginalHeight(height);
        setTargetKb(defaultTargetKb);
        setOutputFormat(file.type === "image/webp" ? "webp" : "jpg");
      };
      image.onerror = () => {
        URL.revokeObjectURL(nextSourceUrl);
        sourceUrlRef.current = null;
        setError("We could not read this image. Please try another file.");
      };
      image.src = nextSourceUrl;
    },
    [cleanupResultUrl, cleanupSourceUrl, defaultTargetKb],
  );

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) loadImageFile(file);
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
    if (file) loadImageFile(file);
  };

  const resizeToKb = async () => {
    if (!selectedFile || !imageRef.current || originalWidth <= 0 || originalHeight <= 0) return;

    setError(null);
    setIsProcessing(true);
    cleanupResultUrl();
    setResult(null);

    try {
      const mimeType = mimeFromOutput(outputFormat);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      let scale = 1;
      let bestBlob: Blob | null = null;
      let bestWidth = originalWidth;
      let bestHeight = originalHeight;
      let bestQuality = 92;

      for (let pass = 0; pass < 8; pass += 1) {
        const width = Math.max(1, Math.round(originalWidth * scale));
        const height = Math.max(1, Math.round(originalHeight * scale));
        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(imageRef.current, 0, 0, width, height);

        if (mimeType === "image/png") {
          const blob = await canvasToBlob(canvas, mimeType, 100);
          if (!blob) throw new Error("Blob unavailable");
          bestBlob = blob;
          bestWidth = width;
          bestHeight = height;
          bestQuality = 100;
          if (blob.size <= targetBytes) break;
          scale *= Math.max(0.55, Math.sqrt(targetBytes / blob.size) * 0.92);
          continue;
        }

        let low = 10;
        let high = 92;
        let passBest: Blob | null = null;
        let passBestQuality = low;

        for (let step = 0; step < 7; step += 1) {
          const quality = Math.round((low + high) / 2);
          const blob = await canvasToBlob(canvas, mimeType, quality);
          if (!blob) throw new Error("Blob unavailable");

          if (blob.size <= targetBytes) {
            passBest = blob;
            passBestQuality = quality;
            low = quality + 1;
          } else {
            high = quality - 1;
          }
        }

        if (passBest) {
          bestBlob = passBest;
          bestWidth = width;
          bestHeight = height;
          bestQuality = passBestQuality;
          break;
        }

        const lowestBlob = await canvasToBlob(canvas, mimeType, 10);
        if (!lowestBlob) throw new Error("Blob unavailable");
        bestBlob = lowestBlob;
        bestWidth = width;
        bestHeight = height;
        bestQuality = 10;
        scale *= Math.max(0.55, Math.sqrt(targetBytes / lowestBlob.size) * 0.9);
      }

      if (!bestBlob) throw new Error("Blob unavailable");

      const nextResultUrl = URL.createObjectURL(bestBlob);
      resultUrlRef.current = nextResultUrl;
      setResult({
        url: nextResultUrl,
        width: bestWidth,
        height: bestHeight,
        size: bestBlob.size,
        mimeType,
        quality: bestQuality,
      });
      setPreviewMode("after");
    } catch {
      setError("We could not resize this image to the target KB. Please try another file or a larger target size.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!result || !selectedFile) return;

    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = `${sanitizeFileName(selectedFile.name)}-${targetKb}kb.${extensionFromMime(result.mimeType)}`;
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
              <CardTitle className="text-base text-[#171717]">
                {selectedFile ? previewTitle : title}
              </CardTitle>
              <CardDescription className="text-xs leading-5">
                {selectedFile ? "Preview and compare your image." : description}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {result ? (
                <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                  <BadgeCheck className="size-3.5" />
                  Target ready
                </Badge>
              ) : null}
              <div className="flex rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === "before" ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setPreviewMode("before")}
                  disabled={!selectedFile}
                >
                  Before
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === "after" ? "default" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => setPreviewMode("after")}
                  disabled={!result}
                >
                  After
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 px-4 pb-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload image dropzone"
            onClick={!selectedFile ? openFilePicker : undefined}
            onKeyDown={(event) => {
              if (!selectedFile && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                openFilePicker();
              }
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "group flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl px-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
              selectedFile
                ? "h-[clamp(230px,54vw,270px)] min-h-[230px] max-h-[270px] rounded-[14px] border border-[#E5E7EB] bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[#f8fafc] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] sm:h-[clamp(260px,36vh,300px)] sm:min-h-[260px] sm:max-h-[300px] lg:h-[clamp(300px,38vh,360px)] lg:min-h-[300px] lg:max-h-[360px]"
                : "min-h-[170px] border border-dashed border-[#D1D5DB] bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%),linear-gradient(-45deg,#f5f5f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f5_75%),linear-gradient(-45deg,transparent_75%,#f5f5f5_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] sm:min-h-[185px] lg:h-[230px] lg:min-h-0 lg:max-h-[230px] hover:border-primary/40 hover:bg-[#FFF1F2]",
              isDragging && !selectedFile && "border-primary bg-[#FFF1F2]",
            )}
          >
            {visibleUrl && selectedFile ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={visibleUrl}
                alt={previewMode === "after" ? "Target KB result preview" : `Preview of ${selectedFile.name}`}
                className="m-auto block h-auto max-h-[94%] w-auto max-w-[94%] object-contain"
              />
            ) : (
              <>
                <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-[#E5E7EB] transition-colors group-hover:bg-primary group-hover:text-white">
                  <UploadCloud className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-3 text-sm font-semibold text-[#171717]">Drop your image here</span>
                <span className="mt-0.5 text-xs text-muted-foreground">Supports JPG, PNG, WebP</span>
                <span className="mt-3 inline-flex h-[38px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors group-hover:bg-[#B91C1C]">
                  Choose image
                </span>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleFileInputChange}
          />

          {error ? (
            <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-[#B91C1C]">
              {error}
            </p>
          ) : null}

          {selectedFile ? (
            <div className="grid gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="text-xs leading-5 text-muted-foreground">
                <span className="inline-block max-w-full truncate align-bottom font-medium text-[#171717] sm:max-w-[22rem]">
                  {selectedFile.name}
                </span>{" "}
                - {originalWidth} x {originalHeight} px - {formatBytes(selectedFile.size)} - {formatFromMime(selectedFile.type)}
              </div>
              <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
                <Button type="button" variant="outline" className="min-h-11 px-2.5 text-xs lg:min-h-8" onClick={openFilePicker}>
                  <RefreshCw className="size-4" />
                  Replace
                </Button>
                <Button type="button" variant="ghost" className="min-h-11 px-2.5 text-xs text-[#B91C1C] lg:min-h-8" onClick={resetAll}>
                  <X className="size-4" />
                  Remove
                </Button>
              </div>
              {result ? (
                <div className="rounded-md border border-primary/15 bg-[#FFF1F2] px-2.5 py-1.5 text-xs leading-4 text-[#B91C1C] sm:col-span-2">
                  Output: {result.width} x {result.height} px - {formatFromMime(result.mimeType)} - {formatBytes(result.size)} - Quality {result.quality}
                  {savings !== null ? ` - ${savings}% smaller` : ""}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <aside className="min-w-0">
        <Card id="settings" className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-3.5 pb-0 pt-0">
            <CardTitle className="text-sm text-[#171717]">{settingsTitle}</CardTitle>
            <CardDescription className="text-[11px] leading-4">
              {selectedFile ? `Original: ${formatBytes(selectedFile.size)}` : settingsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-3.5 pb-3.5">
            <div className="space-y-0.5">
              <Label htmlFor="target-kb" className="text-xs">Target size (KB)</Label>
              <Input
                id="target-kb"
                type="number"
                min="1"
                value={targetKb || ""}
                className="h-10 text-sm lg:h-8"
                onChange={(event) => {
                  resetResult();
                  setTargetKb(positiveInteger(event.target.value));
                }}
                disabled={!selectedFile}
              />
              <p className="text-[11px] leading-4 text-muted-foreground">Target: {formatBytes(targetBytes)}</p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {targetPills.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={targetKb === value ? "default" : "outline"}
                  className="min-h-11 px-2 text-xs lg:min-h-8"
                  onClick={() => {
                    resetResult();
                    setTargetKb(value);
                  }}
                  disabled={!selectedFile}
                >
                  {value}
                </Button>
              ))}
            </div>

            <div className="space-y-0.5">
              <Label className="text-xs">Format</Label>
              <Select
                value={outputFormat}
                onValueChange={(value) => {
                  resetResult();
                  setOutputFormat(value as OutputFormat);
                }}
              >
                <SelectTrigger className="h-10 w-full text-sm lg:h-8">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {result ? (
              <div className="rounded-lg border border-primary/15 bg-[#FFF1F2] px-3 py-2 text-xs leading-5 text-[#B91C1C]">
                Final size: {formatBytes(result.size)}
                {result.size <= targetBytes ? " - within target" : " - closest result"}
              </div>
            ) : null}

            {isProcessing ? (
              <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-primary">
                Resizing to target KB...
              </p>
            ) : null}

            <div className="grid gap-1.5 bg-white pt-0.5 lg:sticky lg:bottom-3 lg:z-10">
              <Button
                type="button"
                className="min-h-11 bg-primary hover:bg-[#B91C1C] lg:min-h-9"
                onClick={result ? downloadImage : resizeToKb}
                disabled={result ? false : !canResize}
              >
                {result ? "Download Image" : "Resize to KB"}
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 px-2 lg:min-h-8"
                  onClick={() => {
                    resetResult();
                    setTargetKb(100);
                    setOutputFormat("jpg");
                  }}
                  disabled={!selectedFile}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
                <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetAll} disabled={!selectedFile}>
                  Resize another
                </Button>
              </div>
              {result ? (
                <Button type="button" variant="ghost" className="min-h-11 lg:min-h-8" onClick={resetResult}>
                  Change settings
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
