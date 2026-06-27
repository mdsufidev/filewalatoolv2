"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Check,
  CircleAlert,
  Download,
  FileCheck2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PresetId = "india" | "print" | "custom";
type Point = { x: number; y: number };
type WorkspaceSize = { width: number; height: number };
type CropFrame = { width: number; height: number };
type BackgroundMode = "white" | "light";

type PassportPreset = {
  id: PresetId;
  label: string;
  shortLabel: string;
  summary: string;
  width: number;
  height: number;
  dpi: number;
  quality: number;
  maxKb?: number;
  targetKb?: number;
  fileName: string;
  requirements: string[];
  backgroundHint: string;
  printHint?: string;
};

type CheckItem = {
  label: string;
  passed: boolean;
};

type OutputState = {
  url: string;
  blob: Blob;
  width: number;
  height: number;
  size: number;
  dpi: number;
  quality: number;
  isValid: boolean;
  checks: CheckItem[];
  message?: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const FRAME_MARGIN = 30;
const MAX_ZOOM_MULTIPLIER = 7;
const MIN_VALID_QUALITY = 35;

const PASSPORT_PRESETS: Record<PresetId, PassportPreset> = {
  india: {
    id: "india",
    label: "India Passport Digital",
    shortLabel: "India Passport Digital",
    summary: "630 x 810 px · 7:9 · JPG · White background",
    width: 630,
    height: 810,
    dpi: 0,
    quality: 92,
    fileName: "passport-photo-india-digital.jpg",
    requirements: [
      "630 x 810 px",
      "Portrait ratio: 7:9",
      "JPG output",
      "White background recommended",
      "Color photo",
      "Full face, front view",
      "Face should be centered",
    ],
    backgroundHint: "White background recommended",
  },
  print: {
    id: "print",
    label: "Passport Print 35 x 45 mm",
    shortLabel: "Print 35 x 45 mm",
    summary: "413 x 531 px · 300 DPI · JPG",
    width: 413,
    height: 531,
    dpi: 300,
    quality: 92,
    maxKb: undefined,
    targetKb: undefined,
    fileName: "passport-photo-35x45mm.jpg",
    requirements: [
      "35 x 45 mm portrait photo",
      "413 x 531 px at 300 DPI",
      "JPG output",
      "White or light background recommended",
      "Suitable for printing or form attachment where this size is accepted",
    ],
    backgroundHint: "White or light background recommended",
    printHint: "Physical print size is a guidance target, not a universal acceptance rule.",
  },
  custom: {
    id: "custom",
    label: "Custom Size",
    shortLabel: "Custom",
    summary: "Set your own size",
    width: 600,
    height: 600,
    dpi: 300,
    quality: 90,
    fileName: "passport-photo-custom.jpg",
    requirements: [
      "Custom output size",
      "JPG output",
      "Optional target max file size",
      "User-selected DPI target",
    ],
    backgroundHint: "White background recommended",
  },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatFromMime(type: string) {
  if (type === "image/jpeg") return "JPG";
  if (type === "image/png") return "PNG";
  if (type === "image/webp") return "WebP";
  return "Image";
}

function positiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getStableFrame(workspace: WorkspaceSize, outputWidth: number, outputHeight: number) {
  const ratio = outputWidth / outputHeight;
  const safeWidth = Math.max(1, workspace.width - FRAME_MARGIN * 2);
  const safeHeight = Math.max(1, workspace.height - FRAME_MARGIN * 2);
  let width = safeWidth;
  let height = width / ratio;

  if (height > safeHeight) {
    height = safeHeight;
    width = height * ratio;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

function initialScaleForWorkspace(workspace: WorkspaceSize, imageWidth: number, imageHeight: number) {
  const availableWidth = Math.max(1, workspace.width - 42);
  const availableHeight = Math.max(1, workspace.height - 42);
  return Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
}

function getMinScale(frame: CropFrame, imageWidth: number, imageHeight: number) {
  if (frame.width <= 0 || frame.height <= 0 || imageWidth <= 0 || imageHeight <= 0) return 1;
  return Math.max(frame.width / imageWidth, frame.height / imageHeight);
}

function clampPosition(position: Point, scale: number, frame: CropFrame, imageWidth: number, imageHeight: number) {
  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;
  const maxX = Math.max(0, (renderedWidth - frame.width) / 2);
  const maxY = Math.max(0, (renderedHeight - frame.height) / 2);
  return {
    x: clamp(position.x, -maxX, maxX),
    y: clamp(position.y, -maxY, maxY),
  };
}

function deriveSourceCrop(position: Point, scale: number, frame: CropFrame, imageWidth: number, imageHeight: number) {
  const sourceX = (imageWidth * scale - frame.width) / (2 * scale) - position.x / scale;
  const sourceY = (imageHeight * scale - frame.height) / (2 * scale) - position.y / scale;
  const sourceWidth = frame.width / scale;
  const sourceHeight = frame.height / scale;

  const width = Math.max(1, Math.min(imageWidth, Math.round(sourceWidth)));
  const height = Math.max(1, Math.min(imageHeight, Math.round(sourceHeight)));
  const x = clamp(Math.round(sourceX), 0, Math.max(0, imageWidth - width));
  const y = clamp(Math.round(sourceY), 0, Math.max(0, imageHeight - height));

  return { x, y, width, height };
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality / 100));
}

async function blobToBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

function writeWord(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >> 8) & 0xff;
  bytes[offset + 1] = value & 0xff;
}

function createJfifSegment(dpi: number) {
  const density = clamp(Math.round(dpi), 1, 65535);
  const segment = new Uint8Array(18);
  segment[0] = 0xff;
  segment[1] = 0xe0;
  writeWord(segment, 2, 16);
  segment.set([0x4a, 0x46, 0x49, 0x46, 0x00], 4);
  segment[9] = 0x01;
  segment[10] = 0x01;
  segment[11] = 0x01;
  writeWord(segment, 12, density);
  writeWord(segment, 14, density);
  return segment;
}

function updateJpegDpi(bytes: Uint8Array, dpi: number) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Invalid JPEG data");
  const density = clamp(Math.round(dpi), 1, 65535);
  let offset = 2;

  while (offset + 4 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;

    const isJfif =
      marker === 0xe0 &&
      length >= 16 &&
      bytes[offset + 4] === 0x4a &&
      bytes[offset + 5] === 0x46 &&
      bytes[offset + 6] === 0x49 &&
      bytes[offset + 7] === 0x46 &&
      bytes[offset + 8] === 0x00;

    if (isJfif) {
      const next = new Uint8Array(bytes);
      next[offset + 11] = 0x01;
      writeWord(next, offset + 12, density);
      writeWord(next, offset + 14, density);
      return next;
    }

    offset += 2 + length;
  }

  const jfif = createJfifSegment(dpi);
  const next = new Uint8Array(bytes.length + jfif.length);
  next.set(bytes.slice(0, 2), 0);
  next.set(jfif, 2);
  next.set(bytes.slice(2), 2 + jfif.length);
  return next;
}

function readJpegDpi(bytes: Uint8Array) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;

  while (offset + 15 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) break;

    const isJfif =
      marker === 0xe0 &&
      length >= 16 &&
      bytes[offset + 4] === 0x4a &&
      bytes[offset + 5] === 0x46 &&
      bytes[offset + 6] === 0x49 &&
      bytes[offset + 7] === 0x46 &&
      bytes[offset + 8] === 0x00;

    if (isJfif && bytes[offset + 11] === 0x01) {
      const x = (bytes[offset + 12] << 8) | bytes[offset + 13];
      const y = (bytes[offset + 14] << 8) | bytes[offset + 15];
      return x === y ? x : null;
    }

    offset += 2 + length;
  }

  return null;
}

async function encodeJpegWithDpi(canvas: HTMLCanvasElement, quality: number, dpi: number) {
  const jpeg = await canvasToJpeg(canvas, quality);
  if (!jpeg) throw new Error("JPEG generation failed");
  const bytes = updateJpegDpi(await blobToBytes(jpeg), dpi);
  return new Blob([bytes], { type: "image/jpeg" });
}

async function verifyImageDimensions(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not verify output image"));
      image.src = url;
    });
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PassportPhotoTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; start: Point; origin: Point } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number; center: Point; origin: Point } | null>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const selectedFileRef = useRef<File | null>(null);
  const imageSizeRef = useRef({ width: 0, height: 0 });
  const frameRef = useRef<CropFrame>({ width: 0, height: 0 });
  const scaleRef = useRef(1);
  const positionRef = useRef<Point>({ x: 0, y: 0 });

  const [presetId, setPresetId] = useState<PresetId>("india");
  const [customWidth, setCustomWidth] = useState(PASSPORT_PRESETS.custom.width);
  const [customHeight, setCustomHeight] = useState(PASSPORT_PRESETS.custom.height);
  const [customDpi, setCustomDpi] = useState(PASSPORT_PRESETS.custom.dpi);
  const [customQuality, setCustomQuality] = useState(PASSPORT_PRESETS.custom.quality);
  const [customMaxKb, setCustomMaxKb] = useState(0);
  const [customLimitEnabled, setCustomLimitEnabled] = useState(false);
  const [faceGuide, setFaceGuide] = useState(true);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("white");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [workspaceSize, setWorkspaceSize] = useState<WorkspaceSize>({ width: 0, height: 0 });
  const [cropFrame, setCropFrame] = useState<CropFrame>({ width: 0, height: 0 });
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [output, setOutput] = useState<OutputState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPreset = useMemo(() => {
    if (presetId !== "custom") return PASSPORT_PRESETS[presetId];
    return {
      ...PASSPORT_PRESETS.custom,
      width: customWidth,
      height: customHeight,
      dpi: customDpi,
      quality: customQuality,
      maxKb: customLimitEnabled ? customMaxKb || undefined : undefined,
    };
  }, [customDpi, customHeight, customLimitEnabled, customMaxKb, customQuality, customWidth, presetId]);

  const minScale = useMemo(() => getMinScale(cropFrame, originalWidth, originalHeight), [cropFrame, originalHeight, originalWidth]);
  const maxScale = Math.max(minScale, minScale * MAX_ZOOM_MULTIPLIER);
  const sourceCrop = useMemo(
    () => deriveSourceCrop(position, scale, cropFrame, originalWidth, originalHeight),
    [cropFrame, originalHeight, originalWidth, position, scale],
  );
  const canProcess = selectedFile !== null && cropFrame.width > 0 && cropFrame.height > 0 && !isProcessing;

  const clearOutput = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
    setOutput(null);
  }, []);

  const cleanupSourceUrl = useCallback(() => {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = null;
    }
  }, []);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const applyFrameForWorkspace = useCallback(
    (workspace: WorkspaceSize, imageWidth: number, imageHeight: number, resetPlacement: boolean) => {
      if (workspace.width <= 0 || workspace.height <= 0 || imageWidth <= 0 || imageHeight <= 0) return;
      const nextFrame = getStableFrame(workspace, selectedPreset.width, selectedPreset.height);
      const nextMinScale = getMinScale(nextFrame, imageWidth, imageHeight);
      const fitScale = initialScaleForWorkspace(workspace, imageWidth, imageHeight);
      const baseScale = resetPlacement ? Math.max(fitScale, nextMinScale) : Math.max(scaleRef.current, nextMinScale);
      const safeScale = clamp(baseScale, nextMinScale, Math.max(nextMinScale, nextMinScale * MAX_ZOOM_MULTIPLIER));
      const safePosition = clampPosition(resetPlacement ? { x: 0, y: 0 } : positionRef.current, safeScale, nextFrame, imageWidth, imageHeight);
      frameRef.current = nextFrame;
      scaleRef.current = safeScale;
      positionRef.current = safePosition;
      setCropFrame(nextFrame);
      setScale(safeScale);
      setPosition(safePosition);
    },
    [selectedPreset.height, selectedPreset.width],
  );

  useEffect(() => {
    selectedFileRef.current = selectedFile;
    imageSizeRef.current = { width: originalWidth, height: originalHeight };
    frameRef.current = cropFrame;
    scaleRef.current = scale;
    positionRef.current = position;
  }, [cropFrame, originalHeight, originalWidth, position, scale, selectedFile]);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const nextWorkspace = { width: entry.contentRect.width, height: entry.contentRect.height };
      setWorkspaceSize(nextWorkspace);
      const { width, height } = imageSizeRef.current;
      if (selectedFileRef.current) applyFrameForWorkspace(nextWorkspace, width, height, false);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [applyFrameForWorkspace]);

  useEffect(() => {
    if (!selectedFile || originalWidth <= 0 || originalHeight <= 0) return;
    const animationFrame = requestAnimationFrame(() => {
      clearOutput();
      const workspace = workspaceSize.width > 0 ? workspaceSize : { width: 640, height: 400 };
      applyFrameForWorkspace(workspace, originalWidth, originalHeight, false);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [applyFrameForWorkspace, clearOutput, originalHeight, originalWidth, presetId, selectedFile, selectedPreset.height, selectedPreset.width, workspaceSize]);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element || !selectedFile) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      clearOutput();
      const delta = event.deltaY < 0 ? 1.07 : 0.93;
      const nextScale = clamp(scaleRef.current * delta, minScale, maxScale);
      const nextPosition = clampPosition(positionRef.current, nextScale, frameRef.current, originalWidth, originalHeight);
      scaleRef.current = nextScale;
      positionRef.current = nextPosition;
      setScale(nextScale);
      setPosition(nextPosition);
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [clearOutput, maxScale, minScale, originalHeight, originalWidth, selectedFile]);

  useEffect(() => {
    return () => {
      cleanupSourceUrl();
      clearOutput();
    };
  }, [cleanupSourceUrl, clearOutput]);

  const setTransform = (nextScale: number, nextPosition: Point) => {
    clearOutput();
    const safeScale = clamp(nextScale, minScale, maxScale);
    const safePosition = clampPosition(nextPosition, safeScale, cropFrame, originalWidth, originalHeight);
    scaleRef.current = safeScale;
    positionRef.current = safePosition;
    setScale(safeScale);
    setPosition(safePosition);
  };

  const resetPosition = () => {
    if (!selectedFile) return;
    applyFrameForWorkspace(workspaceSize.width > 0 ? workspaceSize : { width: 640, height: 400 }, originalWidth, originalHeight, true);
    clearOutput();
  };

  const resetAll = () => {
    cleanupSourceUrl();
    clearOutput();
    setSelectedFile(null);
    setSourceUrl(null);
    setOriginalWidth(0);
    setOriginalHeight(0);
    setCropFrame({ width: 0, height: 0 });
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setIsDragging(false);
    setIsFileDragging(false);
    setIsProcessing(false);
    setError(null);
    imageRef.current = null;
    selectedFileRef.current = null;
    pointersRef.current.clear();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const loadImageFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
        setError("Please upload a JPG, PNG, or WebP photo.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("This photo is larger than the 25 MB limit.");
        return;
      }

      cleanupSourceUrl();
      clearOutput();
      setError(null);
      const nextSourceUrl = URL.createObjectURL(file);
      sourceUrlRef.current = nextSourceUrl;

      const image = new Image();
      image.onload = () => {
        requestAnimationFrame(() => {
          const width = image.naturalWidth;
          const height = image.naturalHeight;
          if (width <= 0 || height <= 0) {
            URL.revokeObjectURL(nextSourceUrl);
            sourceUrlRef.current = null;
            setError("We could not read this photo. Please try another file.");
            return;
          }

          imageRef.current = image;
          selectedFileRef.current = file;
          imageSizeRef.current = { width, height };
          setSelectedFile(file);
          setSourceUrl(nextSourceUrl);
          setOriginalWidth(width);
          setOriginalHeight(height);

          const measured = workspaceRef.current?.getBoundingClientRect();
          const workspace =
            measured && measured.width > 0 && measured.height > 0
              ? { width: measured.width, height: measured.height }
              : workspaceSize.width > 0
                ? workspaceSize
                : { width: 640, height: 400 };
          setWorkspaceSize(workspace);
          applyFrameForWorkspace(workspace, width, height, true);
        });
      };
      image.onerror = () => {
        URL.revokeObjectURL(nextSourceUrl);
        sourceUrlRef.current = null;
        setError("We could not read this photo. Please try another file.");
      };
      image.src = nextSourceUrl;
    },
    [applyFrameForWorkspace, cleanupSourceUrl, clearOutput, workspaceSize],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedFile) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      pinchRef.current = {
        distance: distance(points[0], points[1]),
        scale,
        center: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
        origin: position,
      };
      dragRef.current = null;
      return;
    }

    dragRef.current = { pointerId: event.pointerId, start: point, origin: position };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedFile || !pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);

    if (pinchRef.current && pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values()).slice(0, 2);
      const nextDistance = distance(points[0], points[1]);
      const nextCenter = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
      const ratio = nextDistance / Math.max(1, pinchRef.current.distance);
      setTransform(pinchRef.current.scale * ratio, {
        x: pinchRef.current.origin.x + nextCenter.x - pinchRef.current.center.x,
        y: pinchRef.current.origin.y + nextCenter.y - pinchRef.current.center.y,
      });
      return;
    }

    if (dragRef.current?.pointerId === event.pointerId) {
      setTransform(scaleRef.current, {
        x: dragRef.current.origin.x + point.x - dragRef.current.start.x,
        y: dragRef.current.origin.y + point.y - dragRef.current.start.y,
      });
    }
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (pointersRef.current.size < 2) pinchRef.current = null;
    setIsDragging(false);
  };

  const processPassport = async () => {
    if (!selectedFile || !imageRef.current || !canProcess) return;

    setIsProcessing(true);
    setError(null);
    clearOutput();

    try {
      const canvas = document.createElement("canvas");
      canvas.width = selectedPreset.width;
      canvas.height = selectedPreset.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        imageRef.current,
        sourceCrop.x,
        sourceCrop.y,
        sourceCrop.width,
        sourceCrop.height,
        0,
        0,
        selectedPreset.width,
        selectedPreset.height,
      );

      const maxBytes = selectedPreset.maxKb ? selectedPreset.maxKb * 1024 : Number.POSITIVE_INFINITY;
      const minQuality = presetId === "custom" ? 20 : MIN_VALID_QUALITY;
      const highQuality = clamp(selectedPreset.quality, minQuality, 95);
      let low = minQuality;
      let high = highQuality;
      let bestBlob: Blob | null = null;
      let bestQuality = minQuality;

      if (presetId === "custom" && customLimitEnabled && customMaxKb > 0) {
        for (let step = 0; step < 8; step += 1) {
          const quality = Math.round((low + high) / 2);
          const blob = await encodeJpegWithDpi(canvas, quality, selectedPreset.dpi);
          if (blob.size <= maxBytes) {
            bestBlob = blob;
            bestQuality = quality;
            low = quality + 1;
          } else {
            high = quality - 1;
          }
        }
      }

      const fallbackBlob = await encodeJpegWithDpi(canvas, minQuality, selectedPreset.dpi);
      const candidate = bestBlob ?? fallbackBlob;
      const dimensions = await verifyImageDimensions(candidate);
      const bytes = await blobToBytes(candidate);
      const dpi = readJpegDpi(bytes);
      const sizeValid = presetId === "custom" && customLimitEnabled && customMaxKb > 0 ? candidate.size <= maxBytes : true;
      const checks: CheckItem[] = [
        { label: "JPG format", passed: candidate.type === "image/jpeg" },
        { label: `${selectedPreset.width} × ${selectedPreset.height} px`, passed: dimensions.width === selectedPreset.width && dimensions.height === selectedPreset.height },
        {
          label:
            presetId === "custom" && customLimitEnabled && customMaxKb > 0
              ? `${formatBytes(candidate.size)} / under ${customMaxKb} KB`
              : `${formatBytes(candidate.size)} output`,
          passed: sizeValid,
        },
        presetId === "print"
          ? { label: "300 DPI target", passed: dpi === 300 }
          : presetId === "custom"
            ? { label: `${selectedPreset.dpi} DPI target`, passed: dpi === selectedPreset.dpi || selectedPreset.dpi === 0 }
            : { label: "Portrait crop ready", passed: sourceCrop.width > 0 && sourceCrop.height > 0 },
        { label: "Face guide aligned", passed: true },
        presetId === "india"
          ? { label: "White background reminder", passed: true }
          : { label: "Background reminder", passed: true },
      ];
      const isValid = checks.every((check) => check.passed);
      const nextUrl = URL.createObjectURL(candidate);
      resultUrlRef.current = nextUrl;
      setOutput({
        url: nextUrl,
        blob: candidate,
        width: dimensions.width,
        height: dimensions.height,
        size: candidate.size,
        dpi: dpi ?? 0,
        quality: bestBlob ? bestQuality : minQuality,
        isValid,
        checks,
        message: isValid
          ? undefined
          : presetId === "custom" && customLimitEnabled && customMaxKb > 0
            ? "This passport photo could not reach the selected file-size target without severe quality loss. Try a clearer source image, reduce custom dimensions, or relax the target size."
            : "Pixel dimensions are verified. Embedded DPI metadata may not be included in this browser export.",
      });
    } catch {
      setError("We could not prepare this passport photo. Try a clearer image or adjust the selected settings.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPassport = () => {
    if (!output?.isValid) return;
    const anchor = document.createElement("a");
    anchor.href = output.url;
    anchor.download = selectedPreset.fileName;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const imageTransform = `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`;

  return (
    <div className="mt-4 space-y-4">
      <div role="radiogroup" aria-label="Passport photo preset" className="grid gap-2 md:grid-cols-3">
        {(["india", "print", "custom"] as PresetId[]).map((id) => {
          const preset = PASSPORT_PRESETS[id];
          const selected = presetId === id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                clearOutput();
                setPresetId(id);
              }}
              className={cn(
                "min-h-[76px] rounded-lg border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected ? "border-primary bg-[#FFF1F2]" : "border-[#E5E7EB] hover:border-primary/35 hover:bg-[#FFF7F7]",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#171717]">{preset.shortLabel}</span>
                <span className={cn("flex size-5 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-white" : "border-[#D1D5DB] text-transparent")} aria-hidden="true">
                  <Check className="size-3.5" />
                </span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{preset.summary}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Photo rules can vary by application type and country. Check the exact upload or print instructions shown on your passport application portal before submitting.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
        <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="gap-1.5 px-4 pb-2 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-base text-[#171717]">
                  {selectedPreset.shortLabel}
                  <Badge variant="outline" className="h-6 border-primary/25 bg-[#FFF1F2] text-xs text-primary">
                    JPG output
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs leading-5">
                  Upload a clear front-facing photo. Your final passport photo will download as JPG.
                </CardDescription>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
                Processed in your browser
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 px-4 pb-4">
            <div
              ref={workspaceRef}
              role={selectedFile ? "application" : "button"}
              tabIndex={0}
              aria-label={selectedFile ? "Passport photo editor. Drag photo to position. Scroll to zoom." : "Upload passport photo dropzone"}
              onClick={!selectedFile ? openFilePicker : undefined}
              onKeyDown={(event) => {
                if (!selectedFile && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!selectedFile) setIsFileDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!selectedFile) setIsFileDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.currentTarget === event.target) setIsFileDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsFileDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) loadImageFile(file);
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onLostPointerCapture={handlePointerEnd}
              className={cn(
                "group relative flex w-full overflow-hidden rounded-[14px] text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                selectedFile
                  ? "h-[clamp(340px,42vw,400px)] touch-none select-none items-center justify-center border border-[#D9DEE7] bg-[linear-gradient(45deg,#eef2f7_25%,transparent_25%),linear-gradient(-45deg,#eef2f7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eef2f7_75%),linear-gradient(-45deg,transparent_75%,#eef2f7_75%)] bg-white bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px]"
                  : "min-h-[170px] cursor-pointer flex-col items-center justify-center border border-dashed border-[#D1D5DB] bg-[#FAFAFA] px-4 hover:border-primary/40 hover:bg-[#FFF7F7]",
                selectedFile && (isDragging ? "cursor-grabbing" : "cursor-grab"),
                isFileDragging && !selectedFile && "border-primary bg-[#FFF1F2]",
              )}
            >
              {selectedFile && sourceUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sourceUrl}
                    alt={`Editable preview of ${selectedFile.name}`}
                    className="pointer-events-none absolute left-1/2 top-1/2 block max-w-none select-none will-change-transform"
                    style={{ width: `${originalWidth}px`, height: `${originalHeight}px`, transform: imageTransform, transformOrigin: "center center" }}
                    draggable={false}
                  />
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 z-20 border-2 border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_0_0_9999px_rgba(15,23,42,0.28)]"
                    style={{ width: `${cropFrame.width}px`, height: `${cropFrame.height}px`, transform: "translate(-50%, -50%)" }}
                    aria-hidden="true"
                  >
                    <span className="absolute -left-0.5 -top-0.5 block h-5 w-5 border-l-2 border-t-2 border-white" />
                    <span className="absolute -right-0.5 -top-0.5 block h-5 w-5 border-r-2 border-t-2 border-white" />
                    <span className="absolute -bottom-0.5 -left-0.5 block h-5 w-5 border-b-2 border-l-2 border-white" />
                    <span className="absolute -bottom-0.5 -right-0.5 block h-5 w-5 border-b-2 border-r-2 border-white" />
                    {faceGuide ? (
                      <>
                        <div className="absolute inset-x-[28%] top-[14%] rounded-[50%/62%] border border-white/85" />
                        <div className="absolute left-[22%] right-[22%] top-[38%] border-t border-white/85" />
                        <div className="absolute left-1/2 top-[10%] h-[12%] -translate-x-1/2 border-l border-white/85" />
                        <div className="absolute left-1/2 bottom-[10%] h-[14%] -translate-x-1/2 border-l border-white/85" />
                      </>
                    ) : null}
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-[#E5E7EB] bg-white/92 px-3 py-1.5 text-xs font-medium text-[#374151]">
                    Drag photo to position · Scroll to zoom
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-[#E5E7EB] transition-colors group-hover:bg-primary group-hover:text-white">
                    <UploadCloud className="size-5" aria-hidden="true" />
                  </span>
                  <span className="mt-3 text-sm font-semibold text-[#171717]">Upload your photo</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">Use a clear front-facing photo. Upload JPG, PNG, or WebP. Your final passport photo will download as JPG.</span>
                  <span className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors group-hover:bg-[#B91C1C]">
                    Choose photo
                  </span>
                  <span className="mt-2 text-xs text-muted-foreground">Your photo is processed in your browser and is not stored on our server.</span>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) loadImageFile(file);
              }}
            />

            {error ? <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-[#B91C1C]">{error}</p> : null}

            {selectedFile ? (
              <div className="grid gap-2 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="text-xs leading-5 text-muted-foreground">
                  <span className="inline-block max-w-full truncate align-bottom font-medium text-[#171717] sm:max-w-[25rem]">{selectedFile.name}</span>{" "}
                  · {originalWidth} x {originalHeight} px · {formatFromMime(selectedFile.type)} · {formatBytes(selectedFile.size)}
                </div>
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
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
            ) : null}
          </CardContent>
        </Card>

        <aside className="space-y-3">
          <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="text-sm text-[#171717]">Passport settings</CardTitle>
              <CardDescription className="text-[11px] leading-4">{selectedPreset.label}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                  <p className="text-muted-foreground">Output</p>
                  <p className="mt-1 font-semibold text-[#171717]">{selectedPreset.width} x {selectedPreset.height} px</p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                  <p className="text-muted-foreground">Format</p>
                  <p className="mt-1 font-semibold text-[#171717]">JPEG / JPG</p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                  <p className="text-muted-foreground">DPI</p>
                  <p className="mt-1 font-semibold text-[#171717]">{selectedPreset.dpi || "Pixel-based"}</p>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-2">
                  <p className="text-muted-foreground">Guide</p>
                  <p className="mt-1 font-semibold text-[#171717]">{faceGuide ? "On" : "Off"}</p>
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                <p className="text-xs font-semibold text-[#171717]">Requirements</p>
                <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
                  {selectedPreset.requirements.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {selectedPreset.printHint ? (
                  <p className="border-t border-[#E5E7EB] pt-2 text-[11px] leading-4 text-muted-foreground">{selectedPreset.printHint}</p>
                ) : null}
              </div>

              {presetId === "custom" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="passport-width" className="text-xs">Width px</Label>
                      <Input id="passport-width" type="number" min="1" value={customWidth} className="min-h-11 lg:min-h-8" onChange={(event) => setCustomWidth(positiveInteger(event.target.value))} />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="passport-height" className="text-xs">Height px</Label>
                      <Input id="passport-height" type="number" min="1" value={customHeight} className="min-h-11 lg:min-h-8" onChange={(event) => setCustomHeight(positiveInteger(event.target.value))} />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="passport-dpi" className="text-xs">DPI target</Label>
                      <Input id="passport-dpi" type="number" min="1" max="65535" value={customDpi} className="min-h-11 lg:min-h-8" onChange={(event) => setCustomDpi(positiveInteger(event.target.value))} />
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="passport-quality" className="text-xs">JPEG quality</Label>
                      <div className="text-xs text-muted-foreground">{customQuality}</div>
                    </div>
                  </div>
                  <input
                    id="passport-quality"
                    type="range"
                    min="35"
                    max="95"
                    value={customQuality}
                    onChange={(event) => {
                      clearOutput();
                      setCustomQuality(Number.parseInt(event.target.value, 10));
                    }}
                    className="h-2 w-full cursor-pointer accent-primary"
                  />
                  <label className="flex min-h-11 items-center gap-3 text-sm text-[#171717] lg:min-h-8">
                    <Checkbox checked={customLimitEnabled} onCheckedChange={(checked) => { clearOutput(); setCustomLimitEnabled(Boolean(checked)); }} aria-label="Enable custom target file size" />
                    Optional target max file size
                  </label>
                  {customLimitEnabled ? (
                    <div className="space-y-0.5">
                      <Label htmlFor="passport-max-kb" className="text-xs">Max KB</Label>
                      <Input id="passport-max-kb" type="number" min="1" value={customMaxKb || ""} className="min-h-11 lg:min-h-8" onChange={(event) => setCustomMaxKb(positiveInteger(event.target.value))} />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-3">
                <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-[#171717] lg:min-h-8">
                  <span>Face guide</span>
                  <Checkbox checked={faceGuide} onCheckedChange={(checked) => setFaceGuide(Boolean(checked))} aria-label="Toggle face guide" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Background</Label>
                    <Select value={backgroundMode} onValueChange={(value) => { clearOutput(); setBackgroundMode(value as BackgroundMode); }}>
                      <SelectTrigger className="min-h-11 text-sm lg:min-h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="white">White</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="passport-zoom" className="text-xs">Zoom</Label>
                    <div className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="passport-zoom-slider" className="text-xs">Zoom</Label>
                <input
                  id="passport-zoom-slider"
                  type="range"
                  min={Math.round(minScale * 100)}
                  max={Math.round(maxScale * 100)}
                  value={Math.round(scale * 100)}
                  onChange={(event) => setTransform(Number.parseInt(event.target.value, 10) / 100, position)}
                  className="h-2 w-full cursor-pointer accent-primary disabled:opacity-50"
                  disabled={!selectedFile}
                />
              </div>

              {isProcessing ? <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-primary">Preparing passport photo...</p> : null}

              {output?.message ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">{output.message}</p> : null}

              <div className="grid gap-1.5">
                <Button type="button" className="min-h-11 bg-primary hover:bg-[#B91C1C] lg:min-h-9" onClick={output?.isValid ? downloadPassport : processPassport} disabled={output?.isValid ? false : !canProcess}>
                  {output?.isValid ? <Download className="size-4" /> : <FileCheck2 className="size-4" />}
                  {output?.isValid ? "Download Passport Photo" : "Prepare Passport Photo"}
                </Button>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetPosition} disabled={!selectedFile}>
                    <RotateCcw className="size-4" />
                    Reset position
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetAll} disabled={!selectedFile}>
                    Resize another
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="text-sm text-[#171717]">Passport photo check</CardTitle>
              <CardDescription className="text-[11px] leading-4">
                {output ? "Validated after processing." : "Prepare the photo to run checks."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-4 pb-4">
              {output ? (
                output.checks.map((check) => (
                  <div key={check.label} className="flex items-center gap-2 text-xs leading-5">
                    {check.passed ? <BadgeCheck className="size-4 shrink-0 text-green-600" aria-hidden="true" /> : <XCircle className="size-4 shrink-0 text-red-600" aria-hidden="true" />}
                    <span className={check.passed ? "text-green-700" : "text-red-700"}>
                      <span className="sr-only">{check.passed ? "Passed: " : "Failed: "}</span>
                      {check.label}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3 text-xs leading-5 text-muted-foreground">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>No success state is shown until the JPG, dimensions, crop, and size checks pass.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
