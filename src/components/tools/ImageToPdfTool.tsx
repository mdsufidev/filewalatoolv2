"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { BadgeCheck, Download, FileText, Loader2, RefreshCw, UploadCloud, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ImageSource = {
  id: string;
  file: File;
  url: string;
};

type PdfResult = {
  url: string;
  fileName: string;
  size: number;
  pages: number;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function sanitizeFileName(name: string) {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");
  return withoutExtension.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "images";
}

function uint8ArrayToBlob(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "application/pdf" });
}

async function webpToPngBytes(file: File) {
  const image = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(image, 0, 0);
  image.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Image export failed"));
    }, "image/png");
  });

  return new Uint8Array(await blob.arrayBuffer());
}

export function ImageToPdfTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sourceUrlsRef = useRef<string[]>([]);
  const resultUrlRef = useRef<string | null>(null);

  const [images, setImages] = useState<ImageSource[]>([]);
  const [result, setResult] = useState<PdfResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSize = useMemo(() => images.reduce((sum, image) => sum + image.file.size, 0), [images]);
  const outputName = useMemo(() => sanitizeFileName(images[0]?.file.name ?? "images"), [images]);
  const canConvert = images.length > 0 && !isConverting;

  const cleanupResult = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setResult(null);
  }, []);

  const resetAll = useCallback(() => {
    cleanupResult();
    sourceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    sourceUrlsRef.current = [];
    setImages([]);
    setIsDragging(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupResult]);

  useEffect(() => {
    return () => {
      sourceUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const nextFiles = Array.from(fileList);
      const validFiles: ImageSource[] = [];

      for (const file of nextFiles) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("Please choose JPG, PNG, or WebP images.");
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError("Each image must be 25 MB or smaller.");
          continue;
        }
        const url = URL.createObjectURL(file);
        sourceUrlsRef.current.push(url);
        validFiles.push({ id: createId(), file, url });
      }

      if (validFiles.length > 0) {
        cleanupResult();
        setError(null);
        setImages((current) => [...current, ...validFiles]);
      }
    },
    [cleanupResult],
  );

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (id: string) => {
    cleanupResult();
    setImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.url);
      return current.filter((item) => item.id !== id);
    });
  };

  const convertToPdf = async () => {
    if (!canConvert) return;

    setError(null);
    setIsConverting(true);
    cleanupResult();

    try {
      const pdf = await PDFDocument.create();

      for (const image of images) {
        const bytes =
          image.file.type === "image/webp"
            ? await webpToPngBytes(image.file)
            : new Uint8Array(await image.file.arrayBuffer());
        const embeddedImage =
          image.file.type === "image/jpeg"
            ? await pdf.embedJpg(bytes)
            : await pdf.embedPng(bytes);
        const page = pdf.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: embeddedImage.width,
          height: embeddedImage.height,
        });
      }

      pdf.setTitle(`${outputName}.pdf`);
      pdf.setCreator("FileWalaTool");
      pdf.setProducer("FileWalaTool");

      const pdfBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = uint8ArrayToBlob(pdfBytes);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({
        url,
        size: blob.size,
        pages: images.length,
        fileName: `${outputName}.pdf`,
      });
    } catch {
      setError("We could not create the PDF. Try another JPG, PNG, or WebP image.");
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
              <CardTitle className="text-base text-[#171717]">Upload images</CardTitle>
              <CardDescription className="text-xs leading-5">
                Choose JPG, PNG, or WebP images and combine them into one PDF.
              </CardDescription>
            </div>
            {result ? (
              <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                <BadgeCheck className="size-3.5" />
                PDF ready
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 px-4 pb-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload images dropzone"
            onClick={openFilePicker}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openFilePicker();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            className={cn(
              "group flex min-h-[190px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#D1D5DB] bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%),linear-gradient(-45deg,#f5f5f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f5_75%),linear-gradient(-45deg,transparent_75%,#f5f5f5_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] px-4 text-center transition-colors hover:border-primary/40 hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 lg:h-[230px] lg:min-h-0",
              isDragging && "border-primary bg-[#FFF1F2]",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-primary shadow-sm ring-1 ring-[#E5E7EB] transition-colors group-hover:bg-primary group-hover:text-white">
              <UploadCloud className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#171717]">
              {images.length > 0 ? `${images.length} image${images.length === 1 ? "" : "s"} selected` : "Drop images here or click to upload"}
            </p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              Files stay in your browser while the PDF is created.
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {images.length > 0 ? (
            <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#171717]">Selected images</h3>
                  <p className="text-xs text-muted-foreground">Images are added to the PDF in this order.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={resetAll}>
                  <X className="size-3.5" />
                  Clear
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {images.map((image, index) => (
                  <div key={image.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="size-12 shrink-0 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#171717]">{index + 1}. {image.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(image.file.size)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${image.file.name}`} onClick={() => removeImage(image.id)}>
                      <X className="size-4" />
                    </Button>
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
            <CardTitle className="text-sm text-[#171717]">PDF summary</CardTitle>
            <CardDescription className="text-xs">Create one PDF with one image per page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{images.length}</p>
                <p className="text-[11px] text-muted-foreground">Pages</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">{formatBytes(totalSize)}</p>
                <p className="text-[11px] text-muted-foreground">Images</p>
              </div>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                <p className="text-lg font-semibold text-[#171717]">PDF</p>
                <p className="text-[11px] text-muted-foreground">Output</p>
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
                    <FileText className="size-4" aria-hidden="true" />
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
              Use JPG for photos and PNG for screenshots or documents with sharp text.
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Each image becomes a separate PDF page using the image&apos;s original dimensions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
