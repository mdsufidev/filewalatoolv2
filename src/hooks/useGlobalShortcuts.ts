import { useEffect } from 'react';

interface ShortcutHandlers {
  onOpenSearch: () => void;
  onExitActiveTool: () => void;
  onGoHome: () => void;
  onToggleTheme?: () => void;
  onSelectCategory?: (category: 'image-tools' | 'pdf-tools' | 'convert' | 'document-tools') => void;
  onOpenHelp?: () => void;
  isModalOpen?: boolean;
  hasActiveTool?: boolean;
}

/**
 * Checks if the user is currently typing in an editable field
 * (input, textarea, select, contentEditable)
 */
function isEditableElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toUpperCase();
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT' ||
    element.isContentEditable ||
    element.getAttribute('role') === 'textbox'
  );
}

export function useGlobalShortcuts({
  onOpenSearch,
  onExitActiveTool,
  onGoHome,
  onToggleTheme,
  onSelectCategory,
  onOpenHelp,
  isModalOpen = false,
  hasActiveTool = false,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isTargetEditable = isEditableElement(event.target);
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
      const isCmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // 1. GLOBAL CMD+K or CTRL+K -> Search / Command Palette
      if ((isCmdOrCtrl && event.key.toLowerCase() === 'k') || (event.key === '/' && !isTargetEditable)) {
        event.preventDefault();
        event.stopPropagation();
        onOpenSearch();
        return;
      }

      // 2. ESCAPE KEY -> Priority Hierarchy
      if (event.key === 'Escape' || event.key === 'Esc') {
        // If an input is focused, blur it first
        if (isTargetEditable && event.target instanceof HTMLElement) {
          event.target.blur();
        }

        // If a modal is open, let the modal close handler catch it or exit tool
        if (isModalOpen) {
          // Modal will close via its own handler or onExitActiveTool
          return;
        }

        // If inside an active tool, exit to catalog
        if (hasActiveTool) {
          event.preventDefault();
          onExitActiveTool();
          return;
        }
        return;
      }

      // If user is actively typing in an input or a modal is currently open, do not trigger single-key navigation
      if (isTargetEditable || isModalOpen) {
        return;
      }

      // 3. '?' (Shift + /) -> Open Keyboard Shortcuts Cheat Sheet
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        if (onOpenHelp) onOpenHelp();
        return;
      }

      // If any modifier key is held down (except shift for ?), ignore single-key shortcuts
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const lowerKey = event.key.toLowerCase();

      // 4. 'H' -> Return to Home
      if (lowerKey === 'h') {
        event.preventDefault();
        onGoHome();
        return;
      }

      // 5. '1', '2', '3', '4' -> Switch Categories
      if (onSelectCategory) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            onSelectCategory('image-tools');
            break;
          case '2':
            event.preventDefault();
            onSelectCategory('pdf-tools');
            break;
          case '3':
            event.preventDefault();
            onSelectCategory('convert');
            break;
          case '4':
            event.preventDefault();
            onSelectCategory('document-tools');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onOpenSearch,
    onExitActiveTool,
    onGoHome,
    onToggleTheme,
    onSelectCategory,
    onOpenHelp,
    isModalOpen,
    hasActiveTool,
  ]);
}
