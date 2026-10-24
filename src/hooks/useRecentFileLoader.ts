import { useEffect, useState, useCallback } from 'react';
import {
  getRecentFiles,
  getPendingReProcess,
  clearPendingReProcess,
  dataUrlToFile,
  RecentFileRecord,
} from '../utils/recentFiles';

/**
 * Hook to seamlessly load files into tools from Recent Files history
 * without requiring the user to manually re-upload.
 */
export function useRecentFileLoader(
  targetToolIds: string[],
  onFileLoaded?: (file: File, fileRecord: RecentFileRecord) => void
) {
  const [recentFiles, setRecentFiles] = useState<RecentFileRecord[]>([]);

  // Synchronize recent files state
  useEffect(() => {
    setRecentFiles(getRecentFiles());

    const handleUpdate = () => {
      setRecentFiles(getRecentFiles());
    };

    window.addEventListener('filewala:recent-files-updated', handleUpdate);
    return () => window.removeEventListener('filewala:recent-files-updated', handleUpdate);
  }, []);

  // Listen for and consume pending re-process requests
  useEffect(() => {
    if (!onFileLoaded) return;

    const checkPending = () => {
      const pending = getPendingReProcess();
      if (!pending) return;

      const isMatch = targetToolIds.some(
        (id) =>
          id === pending.targetToolId ||
          id === pending.fileRecord.toolId ||
          pending.targetToolId === '*'
      );

      if (isMatch && pending.fileRecord.dataUrl) {
        try {
          const file = dataUrlToFile(
            pending.fileRecord.dataUrl,
            pending.fileRecord.name,
            pending.fileRecord.mimeType
          );
          clearPendingReProcess();
          onFileLoaded(file, pending.fileRecord);
        } catch (err) {
          console.error('Failed to load pending file into tool', err);
        }
      }
    };

    // Check immediately on mount or after navigation
    const timer = setTimeout(checkPending, 50);
    window.addEventListener('filewala:reprocess-trigger', checkPending);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('filewala:reprocess-trigger', checkPending);
    };
  }, [targetToolIds, onFileLoaded]);

  // Direct 1-click load of a recent file
  const loadRecentFile = useCallback(
    (fileRecord: RecentFileRecord) => {
      if (!onFileLoaded || !fileRecord.dataUrl) return;
      try {
        const file = dataUrlToFile(fileRecord.dataUrl, fileRecord.name, fileRecord.mimeType);
        onFileLoaded(file, fileRecord);
      } catch (err) {
        console.error('Failed to load recent file directly', err);
      }
    },
    [onFileLoaded]
  );

  return {
    recentFiles,
    loadRecentFile,
  };
}
