"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, RefreshCw, RotateCcw, UploadCloud, X } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Unit = "px" | "%";
type OutputFormat = "original" | "jpg" | "png" | "webp";
type PreviewMode = "before" | "after";

type ResultState = {
  url: string;
  width: number;
  height: number;
  size: number;
  format: OutputFormat;
  mimeType: string;
};

type Preset = {
  name: string;
  width: number;
  height: number;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const presets: Preset[] = [
  { name: "Instagram Post", width: 1080, height: 1080 },
  { name: "YouTube Thumbnail", width: 1280, height: 720 },
  { name: "Passport Photo", width: 600, height: 600 },
  { name: "Website Banner", width: 1200, height: 628 },
  { name: "HD", width: 1920, height: 1080 },
];

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

function positiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function ImageResizerTool() {
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
  const [targetWidth, setTargetWidth] = useState(0);
  const [targetHeight, setTargetHeight] = useState(0);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [doNotEnlarge, setDoNotEnlarge] = useState(false);
  const [unit, setUnit] = useState<Unit>("px");
  const [percent, setPercent] = useState(100);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState(90);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspectRatio = useMemo(() => {
    if (originalWidth <= 0 || originalHeight <= 0) return 1;
    return originalWidth / originalHeight;
  }, [originalHeight, originalWidth]);

  const canResize = selectedFile !== null && targetWidth > 0 && targetHeight > 0 && !isProcessing;
  const visibleUrl = previewMode === "after" && result ? result.url : sourceUrl;
  const previewTitle = previewMode === "after" && result ? "Resized preview" : "Original preview";

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
    setTargetWidth(0);
    setTargetHeight(0);
    setKeepAspectRatio(true);
    setDoNotEnlarge(false);
    setUnit("px");
    setPercent(100);
    setOutputFormat("original");
    setQuality(90);
    setIsProcessing(false);
    setIsDragging(false);
    setError(null);
    imageRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupResultUrl, cleanupSourceUrl]);

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
        setTargetWidth(width);
        setTargetHeight(height);
        setPercent(100);
        setKeepAspectRatio(true);
        setDoNotEnlarge(false);
        setUnit("px");
        setOutputFormat("original");
        setQuality(90);
      };
      image.onerror = () => {
        URL.revokeObjectURL(nextSourceUrl);
        sourceUrlRef.current = null;
        setError("We could not read this image. Please try another file.");
      };
      image.src = nextSourceUrl;
    },
    [cleanupResultUrl, cleanupSourceUrl],
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

  const syncPercentFromDimensions = useCallback(
    (width: number) => {
      if (originalWidth > 0) setPercent(Math.max(1, Math.round((width / originalWidth) * 100)));
    },
    [originalWidth],
  );

  const updateWidth = (value: string) => {
    const nextWidth = positiveInteger(value);
    resetResult();
    setTargetWidth(nextWidth);
    if (keepAspectRatio) setTargetHeight(Math.max(1, Math.round(nextWidth / aspectRatio)));
    syncPercentFromDimensions(nextWidth);
  };

  const updateHeight = (value: string) => {
    const nextHeight = positiveInteger(value);
    resetResult();
    setTargetHeight(nextHeight);
    if (keepAspectRatio) {
      const nextWidth = Math.max(1, Math.round(nextHeight * aspectRatio));
      setTargetWidth(nextWidth);
      syncPercentFromDimensions(nextWidth);
    }
  };

  const applyPercent = (nextPercent: number) => {
    const safePercent = Math.max(1, Math.min(1000, Math.round(nextPercent)));
    resetResult();
    setPercent(safePercent);
    if (originalWidth > 0 && originalHeight > 0) {
      setTargetWidth(Math.max(1, Math.round((originalWidth * safePercent) / 100)));
      setTargetHeight(Math.max(1, Math.round((originalHeight * safePercent) / 100)));
    }
  };

  const handleUnitChange = (nextUnit: Unit) => {
    resetResult();
    setUnit(nextUnit);
    if (nextUnit === "%") syncPercentFromDimensions(targetWidth || originalWidth);
  };

  const applyPreset = (preset: Preset) => {
    resetResult();
    setUnit("px");
    setTargetWidth(preset.width);
    setTargetHeight(preset.height);
    syncPercentFromDimensions(preset.width);
  };

  const resetDimensions = () => {
    resetResult();
    setTargetWidth(originalWidth);
    setTargetHeight(originalHeight);
    setPercent(100);
    setUnit("px");
    setQuality(90);
    setOutputFormat("original");
  };

  const resolveOutputDimensions = () => {
    if (!doNotEnlarge || originalWidth <= 0 || originalHeight <= 0) {
      return { width: targetWidth, height: targetHeight };
    }
    if (keepAspectRatio) {
      const scale = Math.min(1, originalWidth / targetWidth, originalHeight / targetHeight);
      return {
        width: Math.max(1, Math.round(targetWidth * scale)),
        height: Math.max(1, Math.round(targetHeight * scale)),
      };
    }
    return {
      width: Math.min(targetWidth, originalWidth),
      height: Math.min(targetHeight, originalHeight),
    };
  };

  const resizeImage = async () => {
    if (!selectedFile || !imageRef.current || targetWidth <= 0 || targetHeight <= 0) return;

    setError(null);
    setIsProcessing(true);
    cleanupResultUrl();
    setResult(null);

    try {
      const outputDimensions = resolveOutputDimensions();
      const canvas = document.createElement("canvas");
      canvas.width = outputDimensions.width;
      canvas.height = outputDimensions.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      context.drawImage(imageRef.current, 0, 0, outputDimensions.width, outputDimensions.height);
      const mimeType = mimeFromOutput(outputFormat, selectedFile.type);
      const qualityValue = mimeType === "image/jpeg" || mimeType === "image/webp" ? quality / 100 : undefined;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, qualityValue));
      if (!blob) throw new Error("Blob unavailable");

      const nextResultUrl = URL.createObjectURL(blob);
      resultUrlRef.current = nextResultUrl;
      setResult({
        url: nextResultUrl,
        width: outputDimensions.width,
        height: outputDimensions.height,
        size: blob.size,
        format: outputFormat,
        mimeType,
      });
      setPreviewMode("after");
    } catch {
      setError("We could not resize this image. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!result || !selectedFile) return;

    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = `${sanitizeFileName(selectedFile.name)}-resized.${extensionFromMime(result.mimeType)}`;
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
                {selectedFile ? previewTitle : "Upload image"}
              </CardTitle>
              <CardDescription className="text-xs leading-5">
                {selectedFile ? "Preview and compare your image." : "Choose a JPG, PNG, or WebP image up to 25 MB."}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {result ? (
                <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                  <BadgeCheck className="size-3.5" />
                  Resized successfully
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
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={visibleUrl}
                alt={previewMode === "after" ? "Resized result preview" : `Preview of ${selectedFile.name}`}
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
                · {originalWidth} x {originalHeight} px · {formatBytes(selectedFile.size)} · {formatFromMime(selectedFile.type)}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" className="min-h-11 px-2.5 text-xs lg:min-h-8" onClick={openFilePicker}>
                    <RefreshCw className="size-4" />
                    Replace
                  </Button>
                  <Button type="button" variant="ghost" className="min-h-11 px-2.5 text-xs text-[#B91C1C] lg:min-h-8" onClick={resetAll}>
                    <X className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>

              {result ? (
                <div className="rounded-md border border-primary/15 bg-[#FFF1F2] px-2.5 py-1.5 text-xs leading-4 text-[#B91C1C] sm:col-span-2">
                  Output: {result.width} x {result.height} px · {formatFromMime(result.mimeType)} · {formatBytes(result.size)}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <aside className="min-w-0">
        <Card id="settings" className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-3.5 pb-0 pt-0">
            <CardTitle className="text-sm text-[#171717]">Resize settings</CardTitle>
            <CardDescription className="text-[11px] leading-4">
              {originalWidth > 0 && originalHeight > 0
                ? `Original: ${originalWidth} x ${originalHeight} px`
                : "Upload an image to unlock resizing."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-3.5 pb-3.5">
            <div className="grid grid-cols-[1fr_6.25rem] gap-2">
              <div className="space-y-0.5">
                <Label className="text-xs">Unit</Label>
                <Select value={unit} onValueChange={(value) => handleUnitChange(value as Unit)}>
                  <SelectTrigger className="h-10 w-full text-sm lg:h-8">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="px">Pixels</SelectItem>
                    <SelectItem value="%">Percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {unit === "%" ? (
                <div className="space-y-0.5">
                  <Label htmlFor="percentage" className="text-xs">Scale</Label>
                  <Input
                    id="percentage"
                    type="number"
                    min="1"
                    max="1000"
                    value={percent || ""}
                    className="h-10 text-sm lg:h-8"
                    onChange={(event) => applyPercent(positiveInteger(event.target.value))}
                    disabled={!selectedFile}
                  />
                </div>
              ) : null}
            </div>

            {unit === "px" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="width" className="text-xs">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    min="1"
                    value={targetWidth || ""}
                    placeholder="1080"
                    className="h-10 text-sm lg:h-8"
                    onChange={(event) => updateWidth(event.target.value)}
                    disabled={!selectedFile}
                  />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="height" className="text-xs">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    min="1"
                    value={targetHeight || ""}
                    placeholder="1080"
                    className="h-10 text-sm lg:h-8"
                    onChange={(event) => updateHeight(event.target.value)}
                    disabled={!selectedFile}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={percent === value ? "default" : "outline"}
                    className="min-h-11 px-2 text-xs lg:min-h-8"
                    onClick={() => applyPercent(value)}
                    disabled={!selectedFile}
                  >
                    {value}%
                  </Button>
                ))}
              </div>
            )}

            <p className="-mt-0.5 text-[11px] leading-3 text-muted-foreground">
              Target: {targetWidth || 0} x {targetHeight || 0} px
            </p>

            <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 text-sm font-medium text-[#171717] lg:min-h-9">
              <span>Keep aspect ratio</span>
              <Checkbox
                checked={keepAspectRatio}
                onCheckedChange={(checked) => {
                  resetResult();
                  setKeepAspectRatio(Boolean(checked));
                }}
                aria-label="Keep aspect ratio"
                disabled={!selectedFile}
              />
            </label>

            <Accordion>
              <AccordionItem value="advanced" className="border-0">
                <AccordionTrigger className="min-h-11 items-center rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm hover:bg-[#FFF1F2] hover:no-underline lg:min-h-9">
                  Advanced options
                </AccordionTrigger>
                <AccordionContent className="space-y-1.5 px-1 pb-0.5 pt-1.5">
                  <label className="flex min-h-11 items-center gap-3 rounded-lg bg-[#FAFAFA] px-3 text-sm font-medium text-[#171717] lg:min-h-9">
                    <Checkbox
                      checked={doNotEnlarge}
                      onCheckedChange={(checked) => {
                        resetResult();
                        setDoNotEnlarge(Boolean(checked));
                      }}
                      aria-label="Do not enlarge smaller images"
                      disabled={!selectedFile}
                    />
                    Do not enlarge smaller images
                  </label>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

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
                  <Label htmlFor="quality" className="text-xs">Quality</Label>
                  <span className="text-xs text-muted-foreground">{quality}</span>
                </div>
                <input
                  id="quality"
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(event) => {
                    resetResult();
                    setQuality(Number.parseInt(event.target.value, 10));
                  }}
                  className="h-2 w-full cursor-pointer accent-primary"
                />
              </div>
            )}

            <Accordion>
              <AccordionItem value="presets" className="border-0">
                <AccordionTrigger className="min-h-11 items-center rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm hover:bg-[#FFF1F2] hover:no-underline lg:min-h-9">
                  Popular presets
                </AccordionTrigger>
                <AccordionContent className="pb-0.5 pt-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="min-h-10 rounded-full border border-[#E5E7EB] bg-white px-2.5 text-xs font-medium text-[#171717] transition-colors hover:border-primary/30 hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 lg:min-h-7"
                        disabled={!selectedFile}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {isProcessing ? (
              <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-primary">
                Resizing your image...
              </p>
            ) : null}

            <div className="grid gap-1.5 bg-white pt-0.5 lg:sticky lg:bottom-3 lg:z-10">
              <Button
                type="button"
                className="min-h-11 bg-primary hover:bg-[#B91C1C] lg:min-h-9"
                onClick={result ? downloadImage : resizeImage}
                disabled={result ? false : !canResize}
              >
                {result ? "Download Image" : "Resize Image"}
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetDimensions} disabled={!selectedFile}>
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
