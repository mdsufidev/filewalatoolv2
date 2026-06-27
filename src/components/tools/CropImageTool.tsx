"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, LockKeyhole, RefreshCw, RotateCcw, UploadCloud, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type OutputFormat = "original" | "jpg" | "png" | "webp";
type PreviewMode = "before" | "after";
type AspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

type Point = {
  x: number;
  y: number;
};

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropFrame = {
  width: number;
  height: number;
  ratio: AspectRatio;
};

type ScreenRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FreeAction =
  | { type: "move"; pointerId: number; start: Point; origin: ScreenRect }
  | { type: "resize"; pointerId: number; handle: string; start: Point; origin: ScreenRect };

type ResultState = {
  url: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const SAFE_MARGIN = 28;
const FRAME_MARGIN = 34;
const MAX_ZOOM_MULTIPLIER = 6;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function aspectValue(value: AspectRatio) {
  if (value === "1:1") return 1;
  if (value === "4:3") return 4 / 3;
  if (value === "3:4") return 3 / 4;
  if (value === "16:9") return 16 / 9;
  if (value === "9:16") return 9 / 16;
  return null;
}

function getStableFixedFrame(workspace: { width: number; height: number }, ratio: AspectRatio, margin = FRAME_MARGIN) {
  const safeWidth = Math.max(0, workspace.width - margin * 2);
  const safeHeight = Math.max(0, workspace.height - margin * 2);
  const numericRatio = aspectValue(ratio);

  if (!numericRatio || safeWidth <= 0 || safeHeight <= 0) {
    return { width: 0, height: 0, ratio };
  }

  let width: number;
  let height: number;

  if (safeWidth / safeHeight > numericRatio) {
    height = safeHeight;
    width = height * numericRatio;
  } else {
    width = safeWidth;
    height = width / numericRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    ratio,
  };
}

function initialScaleForWorkspace(
  workspace: { width: number; height: number },
  imageWidth: number,
  imageHeight: number,
) {
  const availableWidth = Math.max(1, workspace.width - 40);
  const availableHeight = Math.max(1, workspace.height - 40);
  return Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
}

function defaultFreeCrop(imageWidth: number, imageHeight: number): CropRect {
  const minCropSize = 40;
  const width = Math.min(Math.max(minCropSize, Math.round(imageWidth * 0.82)), imageWidth);
  const height = Math.min(Math.max(minCropSize, Math.round(imageHeight * 0.82)), imageHeight);
  return {
    x: Math.round((imageWidth - width) / 2),
    y: Math.round((imageHeight - height) / 2),
    width,
    height,
  };
}

function getMinScale(frame: CropFrame, imageWidth: number, imageHeight: number) {
  if (!frame.width || !frame.height || !imageWidth || !imageHeight) return 1;
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

function deriveCropRect(position: Point, scale: number, frame: CropFrame, imageWidth: number, imageHeight: number): CropRect {
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

function deriveCropRectFromScreen(
  frame: ScreenRect,
  position: Point,
  scale: number,
  workspace: { width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): CropRect {
  const imageLeft = workspace.width / 2 + position.x - (imageWidth * scale) / 2;
  const imageTop = workspace.height / 2 + position.y - (imageHeight * scale) / 2;
  const sourceX = (frame.x - imageLeft) / scale;
  const sourceY = (frame.y - imageTop) / scale;
  const sourceWidth = frame.width / scale;
  const sourceHeight = frame.height / scale;

  const width = Math.max(1, Math.min(imageWidth, Math.round(sourceWidth)));
  const height = Math.max(1, Math.min(imageHeight, Math.round(sourceHeight)));
  const x = clamp(Math.round(sourceX), 0, Math.max(0, imageWidth - width));
  const y = clamp(Math.round(sourceY), 0, Math.max(0, imageHeight - height));

  return { x, y, width, height };
}

function imageBounds(position: Point, scale: number, workspace: { width: number; height: number }, imageWidth: number, imageHeight: number) {
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: workspace.width / 2 + position.x - width / 2,
    y: workspace.height / 2 + position.y - height / 2,
    width,
    height,
  };
}

function clampFreeFrame(
  frame: ScreenRect,
  position: Point,
  scale: number,
  workspace: { width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): ScreenRect {
  const bounds = imageBounds(position, scale, workspace, imageWidth, imageHeight);
  const minSize = 40;
  const width = clamp(frame.width, minSize, Math.max(minSize, bounds.width));
  const height = clamp(frame.height, minSize, Math.max(minSize, bounds.height));
  return {
    x: clamp(frame.x, bounds.x, bounds.x + bounds.width - width),
    y: clamp(frame.y, bounds.y, bounds.y + bounds.height - height),
    width,
    height,
  };
}

function clampSourceCrop(crop: CropRect, imageWidth: number, imageHeight: number): CropRect {
  const minCropSize = 1;
  const width = clamp(crop.width, minCropSize, imageWidth);
  const height = clamp(crop.height, minCropSize, imageHeight);
  return {
    x: clamp(crop.x, 0, Math.max(0, imageWidth - width)),
    y: clamp(crop.y, 0, Math.max(0, imageHeight - height)),
    width,
    height,
  };
}

function sourceCropToScreen(
  crop: CropRect,
  position: Point,
  scale: number,
  workspace: { width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): ScreenRect {
  const bounds = imageBounds(position, scale, workspace, imageWidth, imageHeight);
  return {
    x: bounds.x + crop.x * scale,
    y: bounds.y + crop.y * scale,
    width: crop.width * scale,
    height: crop.height * scale,
  };
}

export function CropImageTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; start: Point; origin: Point } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number; center: Point; origin: Point } | null>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const selectedFileRef = useRef<File | null>(null);
  const originalSizeRef = useRef({ width: 0, height: 0 });
  const cropFrameRef = useRef<CropFrame>({ width: 0, height: 0, ratio: "free" });
  const scaleRef = useRef(1);
  const positionRef = useRef<Point>({ x: 0, y: 0 });
  const freeFrameRef = useRef<ScreenRect>({ x: 0, y: 0, width: 0, height: 0 });
  const freeCropRef = useRef<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const freeActionRef = useRef<FreeAction | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("before");
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });
  const [cropFrame, setCropFrame] = useState<CropFrame>({ width: 0, height: 0, ratio: "free" });
  const [freeFrame, setFreeFrame] = useState<ScreenRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [freeCrop, setFreeCrop] = useState<CropRect>({ x: 0, y: 0, width: 0, height: 0 });
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState(92);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFreeCrop = cropFrame.ratio === "free";
  const minScale = useMemo(
    () =>
      isFreeCrop
        ? initialScaleForWorkspace(workspaceSize, originalWidth || 1, originalHeight || 1)
        : getMinScale(cropFrame, originalWidth, originalHeight),
    [cropFrame, isFreeCrop, originalHeight, originalWidth, workspaceSize],
  );
  const maxScale = Math.max(minScale, minScale * MAX_ZOOM_MULTIPLIER);
  const crop = useMemo(
    () =>
      isFreeCrop ? freeCrop : deriveCropRect(position, scale, cropFrame, originalWidth, originalHeight),
    [cropFrame, freeCrop, isFreeCrop, originalHeight, originalWidth, position, scale],
  );
  const canCrop = selectedFile !== null && crop.width > 0 && crop.height > 0 && !isProcessing;
  const visibleUrl = previewMode === "after" && result ? result.url : sourceUrl;
  const previewTitle = previewMode === "after" && result ? "Cropped preview" : "Original preview";

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

  const applyTransform = useCallback(
    (nextScale: number, nextPosition: Point) => {
      const safeScale = clamp(nextScale, minScale, maxScale);
      const safePosition = clampPosition(nextPosition, safeScale, cropFrame, originalWidth, originalHeight);
      setScale(safeScale);
      setPosition(safePosition);
      setFreeFrame(sourceCropToScreen(freeCropRef.current, safePosition, safeScale, workspaceSize, originalWidth, originalHeight));
    },
    [cropFrame, maxScale, minScale, originalHeight, originalWidth, workspaceSize],
  );

  const resetAll = useCallback(() => {
    cleanupSourceUrl();
    cleanupResultUrl();
    setSelectedFile(null);
    setSourceUrl(null);
    setResult(null);
    setPreviewMode("before");
    setOriginalWidth(0);
    setOriginalHeight(0);
    setCropFrame({ width: 0, height: 0, ratio: "free" });
    setFreeFrame({ x: 0, y: 0, width: 0, height: 0 });
    setFreeCrop({ x: 0, y: 0, width: 0, height: 0 });
    setPosition({ x: 0, y: 0 });
    setScale(1);
    setOutputFormat("original");
    setQuality(92);
    setIsProcessing(false);
    setIsDragging(false);
    setIsFileDragging(false);
    setError(null);
    dragRef.current = null;
    pinchRef.current = null;
    freeActionRef.current = null;
    pointersRef.current.clear();
    imageRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [cleanupResultUrl, cleanupSourceUrl]);

  useEffect(() => {
    return () => {
      cleanupSourceUrl();
      cleanupResultUrl();
    };
  }, [cleanupResultUrl, cleanupSourceUrl]);

  useEffect(() => {
    selectedFileRef.current = selectedFile;
    originalSizeRef.current = { width: originalWidth, height: originalHeight };
    cropFrameRef.current = cropFrame;
    scaleRef.current = scale;
    positionRef.current = position;
    freeFrameRef.current = freeFrame;
    freeCropRef.current = freeCrop;
  }, [cropFrame, freeCrop, freeFrame, originalHeight, originalWidth, position, scale, selectedFile]);

  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const nextWorkspaceSize = { width, height };
      setWorkspaceSize(nextWorkspaceSize);

      if (!selectedFileRef.current || width <= 0 || height <= 0) return;

      const { width: imageWidth, height: imageHeight } = originalSizeRef.current;
      const currentRatio = cropFrameRef.current.ratio;
      const nextMinScale = initialScaleForWorkspace(nextWorkspaceSize, imageWidth, imageHeight);
      const nextScale = Math.max(scaleRef.current, currentRatio === "free" ? nextMinScale : getMinScale(cropFrameRef.current, imageWidth, imageHeight));
      const nextFrame =
        currentRatio === "free"
          ? cropFrameRef.current
          : getStableFixedFrame(nextWorkspaceSize, currentRatio);
      setCropFrame(nextFrame);
      setScale(nextScale);
      const nextPosition = clampPosition(positionRef.current, nextScale, nextFrame, imageWidth, imageHeight);
      setPosition(nextPosition);
      setFreeFrame(sourceCropToScreen(freeCropRef.current, nextPosition, nextScale, nextWorkspaceSize, imageWidth, imageHeight));
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

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
        setOutputFormat("original");
        setQuality(92);

        requestAnimationFrame(() => {
          const workspaceElement = workspaceRef.current;
          const measured = workspaceElement?.getBoundingClientRect();
          const nextWorkspace =
            measured && measured.width > 0 && measured.height > 0
              ? { width: measured.width, height: measured.height }
              : workspaceSize.width > 0
                ? workspaceSize
                : { width: 640, height: 360 };
          const nextScale = initialScaleForWorkspace(nextWorkspace, width, height);
          const nextFreeCrop = defaultFreeCrop(width, height);
          const nextPosition = { x: 0, y: 0 };
          const nextFreeFrame = sourceCropToScreen(nextFreeCrop, nextPosition, nextScale, nextWorkspace, width, height);
          const nextFrame = {
            width: nextFreeFrame.width,
            height: nextFreeFrame.height,
            ratio: "free" as AspectRatio,
          };

          setWorkspaceSize(nextWorkspace);
          setCropFrame(nextFrame);
          setFreeCrop(nextFreeCrop);
          setFreeFrame(nextFreeFrame);
          setScale(nextScale);
          setPosition(nextPosition);
        });
      };
      image.onerror = () => {
        URL.revokeObjectURL(nextSourceUrl);
        sourceUrlRef.current = null;
        setError("We could not read this image. Please try another file.");
      };
      image.src = nextSourceUrl;
    },
    [cleanupResultUrl, cleanupSourceUrl, workspaceSize],
  );

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedFile) setIsFileDragging(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedFile) setIsFileDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget === event.target) setIsFileDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsFileDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  };

  const zoomAtPoint = useCallback(
    (nextScale: number, point: Point) => {
      if (!workspaceRef.current) return;
      resetResult();
      const safeScale = clamp(nextScale, minScale, maxScale);
      const center = {
        x: point.x - workspaceSize.width / 2,
        y: point.y - workspaceSize.height / 2,
      };
      const ratio = safeScale / scale;
      const nextPosition = {
        x: center.x - (center.x - position.x) * ratio,
        y: center.y - (center.y - position.y) * ratio,
      };
      applyTransform(safeScale, nextPosition);
    },
    [applyTransform, maxScale, minScale, position, resetResult, scale, workspaceSize.height, workspaceSize.width],
  );

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const handleNativeWheel = (event: WheelEvent) => {
      if (!selectedFile || previewMode === "after") return;

      event.preventDefault();
      event.stopPropagation();

      const bounds = workspace.getBoundingClientRect();
      const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      zoomAtPoint(scale * factor, pointer);
    };

    workspace.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      workspace.removeEventListener("wheel", handleNativeWheel);
    };
  }, [previewMode, scale, selectedFile, zoomAtPoint]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedFile || previewMode === "after") return;
    event.preventDefault();
    resetResult();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    pointersRef.current.set(event.pointerId, point);

    const target = event.target as HTMLElement;
    const freeAction = target.dataset.cropAction;
    const freeHandle = target.dataset.cropHandle;
    if (isFreeCrop && (freeAction === "move" || freeHandle)) {
      freeActionRef.current = freeHandle
        ? { type: "resize", pointerId: event.pointerId, handle: freeHandle, start: point, origin: freeFrame }
        : { type: "move", pointerId: event.pointerId, start: point, origin: freeFrame };
      setIsDragging(true);
      return;
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        scale,
        center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
        origin: position,
      };
      dragRef.current = null;
      setIsDragging(false);
      return;
    }

    dragRef.current = { pointerId: event.pointerId, start: point, origin: position };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!selectedFile || previewMode === "after") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, point);

    if (freeActionRef.current?.pointerId === event.pointerId) {
      event.preventDefault();
      const action = freeActionRef.current;
      const dx = point.x - action.start.x;
      const dy = point.y - action.start.y;
      const next = { ...action.origin };

      if (action.type === "move") {
        next.x = action.origin.x + dx;
        next.y = action.origin.y + dy;
      } else {
        if (action.handle.includes("w")) {
          next.x = action.origin.x + dx;
          next.width = action.origin.width - dx;
        }
        if (action.handle.includes("e")) {
          next.width = action.origin.width + dx;
        }
        if (action.handle.includes("n")) {
          next.y = action.origin.y + dy;
          next.height = action.origin.height - dy;
        }
        if (action.handle.includes("s")) {
          next.height = action.origin.height + dy;
        }
      }

      const clampedFrame = clampFreeFrame(next, position, scale, workspaceSize, originalWidth, originalHeight);
      const nextSourceCrop = deriveCropRectFromScreen(clampedFrame, position, scale, workspaceSize, originalWidth, originalHeight);
      setFreeFrame(clampedFrame);
      setFreeCrop(nextSourceCrop);
      setCropFrame((current) => ({ ...current, width: clampedFrame.width, height: clampedFrame.height }));
      return;
    }

    if (pointersRef.current.size === 2 && pinchRef.current) {
      event.preventDefault();
      const [first, second] = Array.from(pointersRef.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (pinchRef.current.distance > 0) {
        const nextScale = pinchRef.current.scale * (distance / pinchRef.current.distance);
        const center = {
          x: (first.x + second.x) / 2 - workspaceSize.width / 2,
          y: (first.y + second.y) / 2 - workspaceSize.height / 2,
        };
        const ratio = clamp(nextScale, minScale, maxScale) / pinchRef.current.scale;
        applyTransform(nextScale, {
          x: center.x - (center.x - pinchRef.current.origin.x) * ratio,
          y: center.y - (center.y - pinchRef.current.origin.y) * ratio,
        });
      }
      return;
    }

    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    event.preventDefault();
    applyTransform(scale, {
      x: dragRef.current.origin.x + point.x - dragRef.current.start.x,
      y: dragRef.current.origin.y + point.y - dragRef.current.start.y,
    });
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (freeActionRef.current?.pointerId === event.pointerId) freeActionRef.current = null;
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) setIsDragging(false);
  };

  const applyAspectRatio = (nextAspectRatio: AspectRatio) => {
    resetResult();
    if (nextAspectRatio === "free") {
      const nextSourceCrop = freeCrop.width > 0 && freeCrop.height > 0 ? freeCrop : defaultFreeCrop(originalWidth, originalHeight);
      const nextFrame = sourceCropToScreen(nextSourceCrop, position, scale, workspaceSize, originalWidth, originalHeight);
      setFreeCrop(nextSourceCrop);
      setFreeFrame(nextFrame);
      setCropFrame({ width: nextFrame.width, height: nextFrame.height, ratio: "free" });
      return;
    }

    const nextFrame = getStableFixedFrame(workspaceSize, nextAspectRatio);
    const nextMinScale = getMinScale(nextFrame, originalWidth, originalHeight);
    const nextScale = Math.max(scale, nextMinScale);
    setCropFrame(nextFrame);
    setScale(nextScale);
    setPosition((current) => clampPosition(current, nextScale, nextFrame, originalWidth, originalHeight));
  };

  const updateFreeFrameFromSourceSize = (patch: Partial<Pick<CropRect, "width" | "height">>) => {
    resetResult();
    if (isFreeCrop) {
      const nextSourceCrop = clampSourceCrop(
        {
          ...freeCrop,
          width: patch.width ?? freeCrop.width,
          height: patch.height ?? freeCrop.height,
        },
        originalWidth,
        originalHeight,
      );
      const nextFrame = sourceCropToScreen(nextSourceCrop, position, scale, workspaceSize, originalWidth, originalHeight);
      setFreeCrop(nextSourceCrop);
      setFreeFrame(nextFrame);
      setCropFrame((current) => ({ ...current, width: nextFrame.width, height: nextFrame.height }));
      return;
    }

    setCropFrame((current) => {
      const nextSourceWidth = patch.width ?? crop.width;
      const nextSourceHeight = patch.height ?? crop.height;
      const nextFrame: CropFrame = {
        ...current,
        ratio: current.ratio === "free" ? "free" : current.ratio,
        width: Math.max(80, Math.min(workspaceSize.width - SAFE_MARGIN * 2, Math.round(nextSourceWidth * scale))),
        height: Math.max(80, Math.min(workspaceSize.height - SAFE_MARGIN * 2, Math.round(nextSourceHeight * scale))),
      };

      if (current.ratio !== "free") {
        const ratio = aspectValue(current.ratio);
        if (ratio) {
          if (patch.width) nextFrame.height = Math.round(nextFrame.width / ratio);
          if (patch.height) nextFrame.width = Math.round(nextFrame.height * ratio);
        }
      }

      const nextMinScale = getMinScale(nextFrame, originalWidth, originalHeight);
      const nextScale = Math.max(scale, nextMinScale * 1.05);
      setScale(nextScale);
      setPosition((currentPosition) => clampPosition(currentPosition, nextScale, nextFrame, originalWidth, originalHeight));
      setFreeFrame((currentFreeFrame) =>
        clampFreeFrame(
          {
            ...currentFreeFrame,
            width: nextFrame.width,
            height: nextFrame.height,
          },
          position,
          nextScale,
          workspaceSize,
          originalWidth,
          originalHeight,
        ),
      );
      return nextFrame;
    });
  };

  const updateFreeFrameFromSourcePosition = (patch: Partial<Pick<CropRect, "x" | "y">>) => {
    resetResult();
    if (!isFreeCrop) return;
    const nextSourceX = patch.x ?? crop.x;
    const nextSourceY = patch.y ?? crop.y;
    const nextSourceCrop = clampSourceCrop({ ...freeCrop, x: nextSourceX, y: nextSourceY }, originalWidth, originalHeight);
    const nextFrame = sourceCropToScreen(nextSourceCrop, position, scale, workspaceSize, originalWidth, originalHeight);
    setFreeCrop(nextSourceCrop);
    setFreeFrame(nextFrame);
  };

  const recenterImage = () => {
    resetResult();
    if (isFreeCrop) {
      const nextSourceCrop = clampSourceCrop(
        {
          ...freeCrop,
          x: Math.round((originalWidth - freeCrop.width) / 2),
          y: Math.round((originalHeight - freeCrop.height) / 2),
        },
        originalWidth,
        originalHeight,
      );
      setFreeCrop(nextSourceCrop);
      setFreeFrame(sourceCropToScreen(nextSourceCrop, position, scale, workspaceSize, originalWidth, originalHeight));
    } else {
      applyTransform(scale, { x: 0, y: 0 });
    }
  };

  const resetCropLayout = () => {
    resetResult();
    const nextScale = initialScaleForWorkspace(workspaceSize, originalWidth, originalHeight);
    const nextPosition = { x: 0, y: 0 };
    if (isFreeCrop) {
      const nextSourceCrop = defaultFreeCrop(originalWidth, originalHeight);
      const nextFrame = sourceCropToScreen(nextSourceCrop, nextPosition, nextScale, workspaceSize, originalWidth, originalHeight);
      setScale(nextScale);
      setPosition(nextPosition);
      setFreeCrop(nextSourceCrop);
      setFreeFrame(nextFrame);
      setCropFrame({ width: nextFrame.width, height: nextFrame.height, ratio: "free" });
      return;
    }

    const nextFrame = getStableFixedFrame(workspaceSize, cropFrame.ratio);
    setScale(nextScale);
    setPosition(nextPosition);
    setCropFrame(nextFrame);
  };

  const cropImage = async () => {
    if (!selectedFile || !imageRef.current || crop.width <= 0 || crop.height <= 0) return;

    setError(null);
    setIsProcessing(true);
    cleanupResultUrl();
    setResult(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      context.drawImage(
        imageRef.current,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );

      const mimeType = mimeFromOutput(outputFormat, selectedFile.type);
      const qualityValue = mimeType === "image/jpeg" || mimeType === "image/webp" ? quality / 100 : undefined;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, qualityValue));
      if (!blob) throw new Error("Blob unavailable");

      const nextResultUrl = URL.createObjectURL(blob);
      resultUrlRef.current = nextResultUrl;
      setResult({
        url: nextResultUrl,
        width: crop.width,
        height: crop.height,
        size: blob.size,
        mimeType,
      });
      setPreviewMode("after");
    } catch {
      setError("We could not crop this image. Please try another file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!result || !selectedFile) return;

    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = `${sanitizeFileName(selectedFile.name)}-cropped.${extensionFromMime(result.mimeType)}`;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const imageTransform = `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`;

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
                {selectedFile ? "Drag image to position and scroll to zoom." : "Choose a JPG, PNG, or WebP image up to 25 MB."}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {result ? (
                <Badge className="h-7 bg-[#FFF1F2] text-xs text-primary hover:bg-[#FFF1F2]">
                  <BadgeCheck className="size-3.5" />
                  Cropped
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
            ref={workspaceRef}
            role="button"
            tabIndex={0}
            aria-label={selectedFile ? "Fixed crop workspace" : "Upload image dropzone"}
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
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onLostPointerCapture={handlePointerEnd}
            className={cn(
              "group relative flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[14px] px-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
              selectedFile
                ? "h-[clamp(260px,62vw,310px)] min-h-[260px] max-h-[310px] touch-none select-none overscroll-contain border border-[#E5E7EB] bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%),linear-gradient(-45deg,#f3f4f6_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f3f4f6_75%),linear-gradient(-45deg,transparent_75%,#f3f4f6_75%)] bg-white bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] sm:h-[clamp(300px,40vh,360px)] sm:min-h-[300px] sm:max-h-[360px] lg:h-[clamp(330px,44vh,400px)] lg:min-h-[330px] lg:max-h-[400px]"
                : "min-h-[170px] border border-dashed border-[#D1D5DB] bg-[linear-gradient(45deg,#f5f5f5_25%,transparent_25%),linear-gradient(-45deg,#f5f5f5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f5f5f5_75%),linear-gradient(-45deg,transparent_75%,#f5f5f5_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px] sm:min-h-[185px] lg:h-[230px] lg:min-h-0 lg:max-h-[230px] hover:border-primary/40 hover:bg-[#FFF1F2]",
              selectedFile && previewMode === "before" && (isDragging ? "cursor-grabbing" : "cursor-grab"),
              isFileDragging && !selectedFile && "border-primary bg-[#FFF1F2]",
            )}
          >
            {visibleUrl && selectedFile ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={visibleUrl}
                  alt={previewMode === "after" ? "Cropped result preview" : `Preview of ${selectedFile.name}`}
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-1/2 block max-w-none select-none object-contain shadow-[0_10px_28px_rgba(15,23,42,0.16)] will-change-transform",
                    previewMode === "after" ? "h-auto max-h-[94%] w-auto max-w-[94%]" : "",
                  )}
                  style={
                    previewMode === "after"
                      ? { transform: "translate(-50%, -50%)" }
                      : {
                          width: `${originalWidth}px`,
                          height: `${originalHeight}px`,
                          transform: imageTransform,
                          transformOrigin: "center center",
                        }
                  }
                  draggable={false}
                />
                {previewMode === "before" ? (
                  <>
                    <div
                      data-crop-action={isFreeCrop ? "move" : undefined}
                      className={cn(
                        "absolute z-20 border-2 border-primary shadow-[0_0_0_1px_rgba(255,255,255,0.9),0_0_0_9999px_rgba(15,23,42,0.32)]",
                        isFreeCrop ? "cursor-move pointer-events-auto" : "pointer-events-none left-1/2 top-1/2",
                      )}
                      style={{
                        left: isFreeCrop ? `${freeFrame.x}px` : "50%",
                        top: isFreeCrop ? `${freeFrame.y}px` : "50%",
                        width: `${isFreeCrop ? freeFrame.width : cropFrame.width}px`,
                        height: `${isFreeCrop ? freeFrame.height : cropFrame.height}px`,
                        transform: isFreeCrop ? "none" : "translate(-50%, -50%)",
                      }}
                    >
                      <span className="absolute -left-0.5 -top-0.5 block h-6 w-6 border-l-2 border-t-2 border-white" />
                      <span className="absolute -right-0.5 -top-0.5 block h-6 w-6 border-r-2 border-t-2 border-white" />
                      <span className="absolute -bottom-0.5 -left-0.5 block h-6 w-6 border-b-2 border-l-2 border-white" />
                      <span className="absolute -bottom-0.5 -right-0.5 block h-6 w-6 border-b-2 border-r-2 border-white" />
                      {isFreeCrop ? (
                        <>
                          <span data-crop-handle="nw" className="absolute -left-2 -top-2 size-4 cursor-nwse-resize rounded-full border-2 border-white bg-primary" />
                          <span data-crop-handle="ne" className="absolute -right-2 -top-2 size-4 cursor-nesw-resize rounded-full border-2 border-white bg-primary" />
                          <span data-crop-handle="sw" className="absolute -bottom-2 -left-2 size-4 cursor-nesw-resize rounded-full border-2 border-white bg-primary" />
                          <span data-crop-handle="se" className="absolute -bottom-2 -right-2 size-4 cursor-nwse-resize rounded-full border-2 border-white bg-primary" />
                          <span data-crop-handle="n" className="absolute -top-1.5 left-1/2 h-3 w-8 -translate-x-1/2 cursor-ns-resize rounded-full border border-white bg-primary" />
                          <span data-crop-handle="s" className="absolute -bottom-1.5 left-1/2 h-3 w-8 -translate-x-1/2 cursor-ns-resize rounded-full border border-white bg-primary" />
                          <span data-crop-handle="w" className="absolute -left-1.5 top-1/2 h-8 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-white bg-primary" />
                          <span data-crop-handle="e" className="absolute -right-1.5 top-1/2 h-8 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-white bg-primary" />
                        </>
                      ) : null}
                    </div>
                    <div className="pointer-events-none absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200/95 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)]">
                      <LockKeyhole className="size-3" />
                      Drag image to position - Scroll to zoom
                    </div>
                  </>
                ) : null}
              </>
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
                  Output: {result.width} x {result.height} px - {formatFromMime(result.mimeType)} - {formatBytes(result.size)}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <aside className="min-w-0">
        <Card id="settings" className="rounded-[14px] border-[#E5E7EB] bg-white shadow-none">
          <CardHeader className="px-3.5 pb-0 pt-0">
            <CardTitle className="text-sm text-[#171717]">Crop settings</CardTitle>
            <CardDescription className="text-[11px] leading-4">
              {selectedFile ? `Crop: ${crop.width} x ${crop.height} px` : "Upload an image to crop."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 px-3.5 pb-3.5">
            <div className="space-y-0.5">
              <Label className="text-xs">Aspect ratio</Label>
              <Select value={cropFrame.ratio} onValueChange={(value) => applyAspectRatio(value as AspectRatio)}>
                <SelectTrigger className="h-10 w-full text-sm lg:h-8">
                  <SelectValue placeholder="Select ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="1:1">Square 1:1</SelectItem>
                  <SelectItem value="4:3">Classic 4:3</SelectItem>
                  <SelectItem value="3:4">Portrait 3:4</SelectItem>
                  <SelectItem value="16:9">Wide 16:9</SelectItem>
                  <SelectItem value="9:16">Story 9:16</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <Label htmlFor="crop-width" className="text-xs">Width</Label>
                <Input
                  id="crop-width"
                  type="number"
                  min="1"
                  value={crop.width || ""}
                  className="h-10 text-sm lg:h-8"
                  onChange={(event) => updateFreeFrameFromSourceSize({ width: positiveInteger(event.target.value) })}
                  disabled={!selectedFile}
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="crop-height" className="text-xs">Height</Label>
                <Input
                  id="crop-height"
                  type="number"
                  min="1"
                  value={crop.height || ""}
                  className="h-10 text-sm lg:h-8"
                  onChange={(event) => updateFreeFrameFromSourceSize({ height: positiveInteger(event.target.value) })}
                  disabled={!selectedFile}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <Label htmlFor="crop-x" className="text-xs">X</Label>
                <Input
                  id="crop-x"
                  type="number"
                  value={crop.x}
                  className="h-10 text-sm lg:h-8"
                  readOnly={!isFreeCrop}
                  disabled={!selectedFile}
                  onChange={(event) => updateFreeFrameFromSourcePosition({ x: Number.parseInt(event.target.value, 10) || 0 })}
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="crop-y" className="text-xs">Y</Label>
                <Input
                  id="crop-y"
                  type="number"
                  value={crop.y}
                  className="h-10 text-sm lg:h-8"
                  readOnly={!isFreeCrop}
                  disabled={!selectedFile}
                  onChange={(event) => updateFreeFrameFromSourcePosition({ y: Number.parseInt(event.target.value, 10) || 0 })}
                />
              </div>
            </div>

            <Button type="button" variant="outline" className="min-h-11 w-full px-2 lg:min-h-8" onClick={recenterImage} disabled={!selectedFile}>
              {isFreeCrop ? "Center crop" : "Center image"}
            </Button>

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
                  <Label htmlFor="crop-quality" className="text-xs">Quality</Label>
                  <span className="text-xs text-muted-foreground">{quality}</span>
                </div>
                <input
                  id="crop-quality"
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(event) => {
                    resetResult();
                    setQuality(Number.parseInt(event.target.value, 10));
                  }}
                  className="h-2 w-full cursor-pointer accent-primary"
                  disabled={!selectedFile}
                />
              </div>
            )}

            {isProcessing ? (
              <p className="rounded-lg border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-sm text-primary">
                Cropping your image...
              </p>
            ) : null}

            <div className="grid gap-1.5 bg-white pt-0.5 lg:sticky lg:bottom-3 lg:z-10">
              <Button
                type="button"
                className="min-h-11 bg-primary hover:bg-[#B91C1C] lg:min-h-9"
                onClick={result ? downloadImage : cropImage}
                disabled={result ? false : !canCrop}
              >
                {result ? "Download Image" : "Crop Image"}
              </Button>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 px-2 lg:min-h-8"
                  onClick={resetCropLayout}
                  disabled={!selectedFile}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
                <Button type="button" variant="outline" className="min-h-11 px-2 lg:min-h-8" onClick={resetAll} disabled={!selectedFile}>
                  Crop another
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
