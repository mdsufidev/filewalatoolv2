"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, RefreshCw, RotateCcw, UploadCloud, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PreviewMode = "before" | "after";

type ResultState = {
  url: string;
  width: number;
  height: number;
  size: number;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg"] as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function sanitizeFileName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "image";
}

export function JpgToPngTool() {
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConvert = selectedFile !== null && !isProcessing;
  const visibleUrl = previewMode === "after" && result ? result.url : sourceUrl;
  const previewTitle = previewMode === "after" && result ? "PNG preview" : "JPG preview";

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
        setError("Please choose a JPG or JPEG image.");
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

  const convertImage = async () => {
    if (!selectedFile || !imageRef.current || originalWidth <= 0 || originalHeight <= 0) return;

    setError(null);
    setIsProcessing(true);
    cleanupResultUrl();
    setResult(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      context.drawImage(imageRef.current, 0, 0, originalWidth, originalHeight);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Blob unavailable");

      const nextResultUrl = URL.createObjectURL(blob);
      resultUrlRef.current = nextResultUrl;
      setResult({
        url: nextResultUrl,
        width: originalWidth,
        height: originalHeight,
        size: blob.size,
      });
      setPreviewMode("after");
    } catch {
      setError("We could not convert this image. Please try another JPG file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!result || !selectedFile) return;

    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = `${sanitizeFileName(selectedFile.name)}.png`;
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
                {selectedFile ? previewTitle : "Upload JPG image"}
              </CardTitle>
              <CardDescription className="text-xs leading-5">
                {selectedFile ? "Preview and compare your converted image." : "Choose a JPG or JPEG image up to 25 MB."}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {result ? (
                <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                  <BadgeCheck className="size-3.5" />
                  Converted
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
            aria-label="Upload JPG image dropzone"
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
                alt={previewMode === "after" ? "PNG result preview" : `Preview of ${selectedFile.name}`}
                className="m-auto block h-auto max-h-[94%] w-auto max-w-[94%] object-contain"
              />
            ) : (
              <>
                <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-[#E5E7EB] transition-colors group-hover:bg-primary group-hover:text-white">
                  <UploadCloud className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-3 text-sm font-semibold text-[#171717]">Drop your JPG here</span>
                <span className="mt-0.5 text-xs text-muted-foreground">Supports JPG, JPEG</span>
                <span className="mt-3 inline-flex h-[38px] items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors group-hover:bg-[#B91C1C]">
                  Choose image
                </span>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg"
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
                - {originalWidth} x {originalHeight} px - {formatBytes(selectedFile.size)} - JPG
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
                  Output: {result.width} x {result.height} px - PNG - {formatBytes(result.size)}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <aside className="min-w-0">
        <Card id="settings" className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-3.5 pb-0 pt-0">
            <CardTitle className="text-sm text-[#171717]">Convert settings</CardTitle>
            <CardDescription className="text-[11px] leading-4">
              {selectedFile ? `Original: ${formatBytes(selectedFile.size)}` : "Upload a JPG image to convert."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-3.5 pb-3.5">
            <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-xs leading-5 text-muted-foreground">
              Output format: <span className="font-medium text-[#171717]">PNG</span>
              <br />
              Dimensions are preserved during conversion.
            </div>

            {result ? (
              <div className="rounded-lg border border-primary/15 bg-[#FFF1F2] px-3 py-2 text-xs leading-5 text-[#B91C1C]">
                Ready to download as PNG.
              </div>
            ) : null}

            {isProcessing ? (
              <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-primary">
                Converting your image...
              </p>
            ) : null}

            <div className="grid gap-1.5 bg-white pt-0.5 lg:sticky lg:bottom-3 lg:z-10">
              <Button
                type="button"
                className="min-h-11 bg-primary hover:bg-[#B91C1C] lg:min-h-9"
                onClick={result ? downloadImage : convertImage}
                disabled={result ? false : !canConvert}
              >
                {result ? "Download PNG" : "Convert to PNG"}
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetResult} disabled={!result}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
                <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetAll} disabled={!selectedFile}>
                  Convert another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
