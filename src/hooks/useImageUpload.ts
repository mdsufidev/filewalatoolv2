import { useState, useEffect, useCallback } from 'react';
import { createSafeObjectURL, revokeSafeObjectURL } from '../utils/memory';
import { CanvasEngine } from '../core/engine/CanvasEngine';

export interface LoadedImageMeta {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  sizeBytes: number;
  format: string;
  name: string;
  imageElement: HTMLImageElement;
}

export function useImageUpload() {
  const [currentImage, setCurrentImage] = useState<LoadedImageMeta | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    if (currentImage?.previewUrl) {
      revokeSafeObjectURL(currentImage.previewUrl);
    }
    setCurrentImage(null);
    setError(null);
    setIsLoading(false);
  }, [currentImage]);

  const loadFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const img = await CanvasEngine.loadImage(file);
      const url = createSafeObjectURL(file);

      // Clean up previous image URL if replacing
      setCurrentImage((prev) => {
        if (prev?.previewUrl) {
          revokeSafeObjectURL(prev.previewUrl);
        }
        return {
          file,
          previewUrl: url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          sizeBytes: file.size,
          format: file.type || 'image/jpeg',
          name: file.name,
          imageElement: img,
        };
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load image');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentImage?.previewUrl) {
        revokeSafeObjectURL(currentImage.previewUrl);
      }
    };
  }, [currentImage]);

  return {
    currentImage,
    isLoading,
    error,
    loadFile,
    reset,
  };
}
