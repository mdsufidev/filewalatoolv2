"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, MessageSquareText } from "lucide-react";

const AppChatPanel = dynamic(
  () => import("@/components/chat/AppChatPanel").then((module) => module.AppChatPanel),
  {
    ssr: false,
  },
);

export function AppChatWidget() {
  const pathname = usePathname();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const hidden = pathname.startsWith("/admin");

  const toggleAssistant = () => {
    setIsAssistantOpen((current) => !current);
  };

  const closeAssistant = useCallback(() => {
    setIsAssistantOpen(false);
  }, []);

  useEffect(() => {
    if (!isAssistantOpen) {
      launcherRef.current?.focus();
    }
  }, [isAssistantOpen]);

  if (hidden) return null;

  return (
    <>
      <div className="assistant-launcher fixed bottom-[max(12px,env(safe-area-inset-bottom))] right-3 z-[1001] sm:bottom-5 sm:right-5">
        <button
          ref={launcherRef}
          type="button"
          onClick={toggleAssistant}
          aria-expanded={isAssistantOpen}
          aria-controls="filewalatool-assistant"
          aria-label={isAssistantOpen ? "Minimize FileWalaTool Assistant" : "Open FileWalaTool Assistant"}
          title={isAssistantOpen ? "Minimize FileWalaTool Assistant" : "Open FileWalaTool Assistant"}
          className="group relative inline-flex h-[54px] w-[54px] items-center justify-center rounded-full border border-primary/20 bg-primary text-white shadow-[0_14px_30px_rgba(185,28,28,0.2)] transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {isAssistantOpen ? (
            <ChevronDown className="size-5 transition-transform duration-200" aria-hidden="true" />
          ) : (
            <MessageSquareText className="size-5 transition-transform duration-200" aria-hidden="true" />
          )}
          <span className="pointer-events-none absolute -left-2 bottom-full mb-2 hidden whitespace-nowrap rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs font-medium text-[#171717] shadow-sm group-hover:block group-focus-visible:block">
            {isAssistantOpen ? "Minimize" : "Help"}
          </span>
        </button>
      </div>

      {isAssistantOpen ? <AppChatPanel onClose={closeAssistant} /> : null}
    </>
  );
}
