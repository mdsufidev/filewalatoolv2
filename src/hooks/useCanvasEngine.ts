import { useState, useCallback, useEffect } from 'react';
import {
  CanvasEngine,
  ResizeOptions,
  CompressOptions,
  ImageFormat,
  CropRect,
  RotateFlipOptions,
  FilterOptions,
  WatermarkOptions,
} from '../core/engine/CanvasEngine';
import { createSafeObjectURL, revokeSafeObjectURL } from '../utils/memory';

export interface ProcessedResult {
  blob: Blob;
  url: string;
  sizeBytes: number;
  width: number;
  height: number;
  format: string;
  savedBytes?: number;
  savedPercentage?: number;
}

export function useCanvasEngine() {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearResult = useCallback(() => {
    if (result?.url) {
      revokeSafeObjectURL(result.url);
    }
    setResult(null);
    setError(null);
  }, [result]);

  const processResize = useCallback(
    async (
      img: HTMLImageElement,
      options: ResizeOptions,
      originalSize?: number
    ): Promise<ProcessedResult | null> => {
      setIsProcessing(true);
      setError(null);
      try {
        const blob = await CanvasEngine.resize(img, options);
        const url = createSafeObjectURL(blob);
        const savedBytes = originalSize ? originalSize - blob.size : undefined;
        const savedPercentage =
          originalSize && originalSize > 0
            ? Math.round(((originalSize - blob.size) / originalSize) * 100)
            : undefined;

        const newResult: ProcessedResult = {
          blob,
          url,
          sizeBytes: blob.size,
          width: options.width,
          height: options.height,
          format: options.format || 'image/jpeg',
          savedBytes,
          savedPercentage,
        };

        setResult((prev) => {
          if (prev?.url) revokeSafeObjectURL(prev.url);
          return newResult;
        });

        return newResult;
      } catch (err: any) {
        setError(err?.message || 'Resize operation failed');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const processCompress = useCallback(
    async (
      img: HTMLImageElement,
      options: CompressOptions,
      originalSize: number
    ): Promise<ProcessedResult | null> => {
      setIsProcessing(true);
      setError(null);
      try {
        const blob = await CanvasEngine.compress(img, options);
        const url = createSafeObjectURL(blob);
        const savedBytes = originalSize - blob.size;
        const savedPercentage = Math.round((savedBytes / originalSize) * 100);

        const newResult: ProcessedResult = {
          blob,
          url,
          sizeBytes: blob.size,
          width: options.maxWidth ? Math.min(img.naturalWidth, options.maxWidth) : img.naturalWidth,
          height: options.maxHeight ? Math.min(img.naturalHeight, options.maxHeight) : img.naturalHeight,
          format: options.format || 'image/jpeg',
          savedBytes,
          savedPercentage,
        };

        setResult((prev) => {
          if (prev?.url) revokeSafeObjectURL(prev.url);
          return newResult;
        });

        return newResult;
      } catch (err: any) {
        setError(err?.message || 'Compression operation failed');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const processConvert = useCallback(
    async (
      img: HTMLImageElement,
      targetFormat: ImageFormat,
      quality: number,
      originalSize?: number
    ): Promise<ProcessedResult | null> => {
      setIsProcessing(true);
      setError(null);
      try {
        const blob = await CanvasEngine.convertFormat(img, targetFormat, quality);
        const url = createSafeObjectURL(blob);
        const savedBytes = originalSize ? originalSize - blob.size : undefined;
        const savedPercentage =
          originalSize && originalSize > 0
            ? Math.round(((originalSize - blob.size) / originalSize) * 100)
            : undefined;

        const newResult: ProcessedResult = {
          blob,
          url,
          sizeBytes: blob.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: targetFormat,
          savedBytes,
          savedPercentage,
        };

        setResult((prev) => {
          if (prev?.url) revokeSafeObjectURL(prev.url);
          return newResult;
        });

        return newResult;
      } catch (err: any) {
        setError(err?.message || 'Conversion failed');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const processCrop = useCallback(
    async (
      img: HTMLImageElement,
      cropRect: CropRect,
      format: ImageFormat = 'image/png'
    ): Promise<ProcessedResult | null> => {
      setIsProcessing(true);
      setError(null);
      try {
        const blob = await CanvasEngine.crop(img, cropRect, format);
        const url = createSafeObjectURL(blob);

        const newResult: ProcessedResult = {
          blob,
          url,
          sizeBytes: blob.size,
          width: cropRect.width,
          height: cropRect.height,
          format,
        };

        setResult((prev) => {
          if (prev?.url) revokeSafeObjectURL(prev.url);
          return newResult;
        });

        return newResult;
      } catch (err: any) {
        setError(err?.message || 'Cropping failed');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const processRotateFlip = useCallback(
    async (
      img: HTMLImageElement,
      options: RotateFlipOptions,
      format: ImageFormat = 'image/png'
    ): Promise<ProcessedResult | null> => {
      setIsProcessing(true);
      setError(null);
      try {
        const blob = await CanvasEngine.rotateAndFlip(img, options, format);
        const url = createSafeObjectURL(blob);
        const isQuarter = options.angle % 180 !== 0;

        const newResult: ProcessedResult = {
          blob,
          url,
          sizeBytes: blob.size,
          width: isQuarter ? img.naturalHeight : img.naturalWidth,
          height: isQuarter ? img.naturalWidth : img.naturalHeight,
          format,
        };

        setResult((prev) => {
          if (prev?.url) revokeSafeObjectURL(prev.url);
          return newResult;
        });

        return newResult;
      } catch (err: any) {
        setError(err?.message || 'Rotate/flip failed');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const processFilters = useCallback(
    async (
      img: HTMLImageElement,
      filters: FilterOptions,
      format: ImageFormat = 'image/png'
    ): Promise<ProcessedResult | null> => {
      setIsProcessing(true);
      setError(null);
      try {
        const blob = await CanvasEngine.applyFilters(img, filters, format);
        const url = createSafeObjectURL(blob);

        const newResult: ProcessedResult = {
          blob,
          url,
          sizeBytes: blob.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format,
        };

        setResult((prev) => {
          if (prev?.url) revokeSafeObjectURL(prev.url);
          return newResult;
        });

        return newResult;
      } catch (err: any) {
        setError(err?.message || 'Filter application failed');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const processWatermark = useCallback(
    async (
      img: HTMLImageElement,
      watermark: WatermarkOptions,
      format: ImageFormat = 'image/png'
    ): Promise<ProcessedResult | null> => {
      setIsProcessing(true);
      setError(null);
      try {
        const blob = await CanvasEngine.addWatermark(img, watermark, format);
        const url = createSafeObjectURL(blob);

        const newResult: ProcessedResult = {
          blob,
          url,
          sizeBytes: blob.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          format,
        };

        setResult((prev) => {
          if (prev?.url) revokeSafeObjectURL(prev.url);
          return newResult;
        });

        return newResult;
      } catch (err: any) {
        setError(err?.message || 'Watermark failed');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (result?.url) {
        revokeSafeObjectURL(result.url);
      }
    };
  }, [result]);

  return {
    isProcessing,
    result,
    error,
    clearResult,
    processResize,
    processCompress,
    processConvert,
    processCrop,
    processRotateFlip,
    processFilters,
    processWatermark,
  };
}
