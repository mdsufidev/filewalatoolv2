'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  detectFileTarget,
  quickDetectDragTypes,
  DetectedFileSummary,
} from '../utils/fileTypeDetector';

interface UseGlobalFileDropProps {
  onFilesDropped: (files: File[], summary: DetectedFileSummary) => void;
  disabled?: boolean;
}

export function useGlobalFileDrop({ onFilesDropped, disabled = false }: UseGlobalFileDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [detectedSummary, setDetectedSummary] = useState<DetectedFileSummary | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);
  
  const dragCounterRef = useRef(0);
  // Internal drag guard: tracks whether a drag started from an internal DOM element (e.g. logo, text, image)
  const isInternalDragRef = useRef(false);

  const cancelDrop = useCallback(() => {
    dragCounterRef.current = 0;
    setIsDragging(false);
    setDetectedSummary(null);
    setDroppedFiles(null);
  }, []);

  // Listen to window-level dragstart to detect internal element drags
  useEffect(() => {
    const handleDragStart = () => {
      isInternalDragRef.current = true;
    };

    const handleDragEnd = () => {
      isInternalDragRef.current = false;
      dragCounterRef.current = 0;
      setIsDragging(false);
    };

    window.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('dragend', handleDragEnd, true);

    return () => {
      window.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('dragend', handleDragEnd, true);
    };
  }, []);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      
      // CRITICAL GUARD: If the drag originated from within the webpage (e.g. logo, text, button), IGNORE completely
      if (isInternalDragRef.current) return;

      // Verify that dataTransfer types contain external OS files
      const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
      if (!types.includes('Files')) return;

      e.preventDefault();

      dragCounterRef.current += 1;
      if (dragCounterRef.current === 1) {
        setIsDragging(true);

        // Quick type detection during hover
        const items = e.dataTransfer?.items;
        if (items) {
          const quick = quickDetectDragTypes(items);
          if (quick.isSupported && items.length > 0) {
            const fakeFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
              if (items[i].kind === 'file') {
                fakeFiles.push(
                  new File(
                    [],
                    `document.${quick.category === 'pdf' ? 'pdf' : quick.category === 'heic' ? 'heic' : 'png'}`,
                    {
                      type: items[i].type || (quick.category === 'pdf' ? 'application/pdf' : 'image/png'),
                    }
                  )
                );
              }
            }
            if (fakeFiles.length > 0) {
              setDetectedSummary(detectFileTarget(fakeFiles));
            }
          }
        }
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      if (isInternalDragRef.current) return;

      const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
      if (!types.includes('Files')) return;

      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      if (isInternalDragRef.current) return;

      e.preventDefault();
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      // Guard against internal drags dropping onto the window
      if (isInternalDragRef.current) {
        isInternalDragRef.current = false;
        dragCounterRef.current = 0;
        setIsDragging(false);
        return;
      }

      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      setIsDragging(false);

      if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;

      const files = Array.from(e.dataTransfer.files);
      const summary = detectFileTarget(files);
      setDetectedSummary(summary);
      setDroppedFiles(files);

      // Notify caller with dropped files and summary without forced auto-launching
      onFilesDropped(files, summary);
    },
    [disabled, onFilesDropped]
  );

  // Global ESC key listener to cancel drag state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDrop();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDrop]);

  // Window drag events
  useEffect(() => {
    if (disabled) return;

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [disabled, handleDragEnter, handleDragOver, handleDragLeave, handleDrop]);

  return {
    isDragging,
    detectedSummary,
    droppedFiles,
    cancelDrop,
    setDroppedFiles,
  };
}
