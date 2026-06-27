"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Loader2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
  pending?: boolean;
};

type ChatResponse = {
  message?: string;
  error?: string;
};

type ChatAction = {
  label: string;
  href: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hello! I can help you find FileWalaTool features, explain tool requirements, and guide you to the right page.\n\nAsk about image tools, PDF tools, PAN photo resize, signature resize, passport photos, or support.",
};

const GENERAL_PROMPTS = [
  "What tools are available?",
  "How do I contact support?",
  "Who is the founder?",
];

const ROUTE_PROMPTS: Record<string, string[]> = {
  "/pan-photo-resize": ["How do I resize a PAN photo?", "What are the PAN photo presets?", "Can I upload PNG or WebP?", "What file size is allowed?"],
  "/signature-resize": ["How do I resize a PAN signature?", "What are the signature presets?", "How does cleanup work?", "What is the file size limit?"],
  "/passport-photo": ["How do I make a passport photo?", "What is the print preset?", "How does the face guide work?", "Can I use a custom size?"],
  "/contact": ["How do I contact support?", "What happens to my message?", "Can I report a bug?", "Can I request a tool?"],
  "/about": ["Who is the founder of FileWalaTool?", "What is FileWalaTool built for?", "How do I contact FileWalaTool?"],
  "/resume-builder": ["How do I build a resume?", "Can I print or save the resume?", "How do templates work?", "What sections can I edit?"],
};

const ACTION_LOOKUP: Array<{ match: RegExp; action: ChatAction }> = [
  { match: /pan photo|pan application|protean|nsdl/i, action: { label: "Open PAN Photo Resize", href: "/pan-photo-resize" } },
  { match: /signature/i, action: { label: "Open Signature Resize", href: "/signature-resize" } },
  { match: /passport/i, action: { label: "Open Passport Photo Maker", href: "/passport-photo" } },
  { match: /contact|support|feedback|bug/i, action: { label: "Open Contact page", href: "/contact" } },
  { match: /resume/i, action: { label: "Open Resume Builder", href: "/resume-builder" } },
  { match: /founder|who made|who built|muhammad sufiyan|about founder/i, action: { label: "Open About page", href: "/about" } },
  { match: /crop image/i, action: { label: "Open Crop Image", href: "/crop-image" } },
  { match: /image resizer/i, action: { label: "Open Image Resizer", href: "/image-resizer" } },
  { match: /kb resizer|20kb|50kb/i, action: { label: "Open KB Resizer", href: "/kb-resizer" } },
];

function renderInlineNodes(text: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(text))) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    if (match[1]) {
      nodes.push(
        <strong key={`${prefix}-strong-${match.index}`}>{match[1]}</strong>,
      );
    } else if (match[2] && match[3]) {
      const label = match[2];
      const href = match[3];
      if (href.startsWith("/")) {
        nodes.push(
          <Link key={`${prefix}-link-${match.index}`} href={href} className="font-medium text-primary underline underline-offset-2 hover:text-[#B91C1C]">
            {label}
          </Link>,
        );
      } else {
        nodes.push(
          <a
            key={`${prefix}-link-${match.index}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:text-[#B91C1C]"
          >
            {label}
          </a>,
        );
      }
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function renderContent(content: string) {
  const blocks: ReactNode[] = [];
  const lines = content.split(/\r?\n/);
  let paragraphLines: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const text = paragraphLines.join(" ");
    blocks.push(
      <p key={`p-${blocks.length}`} className="whitespace-pre-wrap">
        {renderInlineNodes(text, `p-${blocks.length}`)}
      </p>,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    const Tag = listType;
    blocks.push(
      <Tag key={`${Tag}-${blocks.length}`} className="my-2 ml-5 list-outside space-y-1">
        {listItems.map((item, itemIndex) => (
          <li key={`${Tag}-${itemIndex}`}>{renderInlineNodes(item, `${Tag}-${blocks.length}-${itemIndex}`)}</li>
        ))}
      </Tag>,
    );
    listType = null;
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);

    if (bullet) {
      flushParagraph();
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(bullet[1]);
      continue;
    }

    if (numbered) {
      flushParagraph();
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(numbered[1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function getActions(content: string) {
  return ACTION_LOOKUP.filter(({ match }) => match.test(content)).map(({ action }) => action).slice(0, 2);
}

function getContextPrompts(pathname: string, messages: ChatMessage[]) {
  const base = ROUTE_PROMPTS[pathname] ?? GENERAL_PROMPTS;
  const asked = new Set(
    messages
      .filter((message) => message.role === "user")
      .map((message) => message.content.trim().toLowerCase()),
  );
  return base.filter((prompt) => !asked.has(prompt.trim().toLowerCase())).slice(0, 3);
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) return {};

  try {
    return JSON.parse(text) as ChatResponse;
  } catch {
    return { error: text };
  }
}

type AppChatPanelProps = {
  onClose: () => void;
};

export function AppChatPanel({ onClose }: AppChatPanelProps) {
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [textareaHeight, setTextareaHeight] = useState(54);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const suggestedPrompts = useMemo(() => getContextPrompts(pathname, messages), [messages, pathname]);
  const pageContext = useMemo(
    () => ({
      pathname,
      title: typeof document !== "undefined" ? document.title : "FileWalaTool",
    }),
    [pathname],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useLayoutEffect(() => {
    const element = composerRef.current;
    if (!element) return;

    element.style.height = "0px";
    const nextHeight = Math.min(Math.max(element.scrollHeight, 52), 96);
    element.style.height = `${nextHeight}px`;
    setTextareaHeight(nextHeight);
  }, [input]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    },
    [prefersReducedMotion],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!isPinnedToBottom) return;
    scrollToBottom("auto");
  }, [isPinnedToBottom, messages.length, scrollToBottom]);

  useEffect(() => {
    requestAnimationFrame(() => {
      messagesViewportRef.current?.scrollTo({ top: messagesViewportRef.current.scrollHeight, behavior: "auto" });
      composerRef.current?.focus();
    });
  }, [scrollToBottom]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setError("");
    setIsSending(true);
    setInput("");
    setIsPinnedToBottom(true);

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
      { role: "assistant", content: "Thinking...", pending: true },
    ];
    setMessages(nextMessages);

    requestAnimationFrame(() => scrollToBottom("auto"));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => !message.pending)
            .map((message) => ({ role: message.role, content: message.content })),
          pageContext,
        }),
      });

      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Chat request failed.");
      }

      const reply = payload.message?.trim() || "I could not generate a response right now.";
      setMessages((current) => [...current.filter((message) => !message.pending), { role: "assistant", content: reply }]);
    } catch (submissionError) {
      const fallback = submissionError instanceof Error ? submissionError.message : "Chat request failed.";
      setMessages((current) => current.filter((message) => !message.pending));
      setError(fallback);
    } finally {
      setIsSending(false);
    }
  };

  return (
      <div
        id="filewalatool-assistant"
        role="dialog"
        aria-labelledby="assistant-title"
        className="assistant-widget fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-3 right-3 z-[1000] flex h-[min(68dvh,600px)] w-auto flex-col overflow-hidden rounded-[18px] border border-[#E5E7EB] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.14)] transition-all duration-200 ease-out sm:bottom-[84px] sm:left-auto sm:right-5 sm:h-[min(600px,calc(100dvh-120px))] sm:min-h-[520px] sm:w-[400px] sm:max-h-[calc(100dvh-120px)] sm:rounded-[20px]"
      >
          <header className="assistant-header flex flex-none items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F2] text-primary">
                  <Bot className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="assistant-title" className="truncate text-sm font-semibold text-[#171717]">
                    FileWalaTool Assistant
                  </h2>
                </div>
              </div>
              <Button
                ref={closeButtonRef}
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:bg-[#FFF1F2] hover:text-[#B91C1C]"
                onClick={onClose}
                aria-label="Close assistant"
                title="Close assistant"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </header>

          <main
            ref={messagesViewportRef}
            onScroll={() => {
              const element = messagesViewportRef.current;
              if (!element) return;
              const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
              setIsPinnedToBottom(distanceFromBottom < 80);
            }}
            className="assistant-messages min-h-[220px] flex-auto overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-[14px]"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-labelledby="assistant-title"
          >
            <div className="space-y-3">
                {messages.map((message, index) => {
                  const actions = message.role === "assistant" && !message.pending && index > 0 ? getActions(message.content) : [];

                  return (
                    <div key={`${message.role}-${index}`} className={cn("flex flex-col gap-2", message.role === "user" ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "max-w-[84%] rounded-[14px] px-3.5 py-2.5 text-[14px] leading-6 shadow-none",
                          message.role === "user"
                            ? "rounded-br-[4px] bg-primary text-white"
                            : "rounded-bl-[4px] border border-[#E5E7EB] bg-white text-[#172033]",
                          message.pending && "opacity-80",
                        )}
                      >
                        {message.role === "assistant" ? (
                          <div className="space-y-2">{renderContent(message.content)}</div>
                        ) : (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        )}
                        {message.pending ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" />
                            Thinking...
                          </div>
                        ) : null}
                      </div>

                      {actions.length ? (
                        <div className="flex max-w-[84%] flex-wrap gap-2">
                          {actions.map((action) => (
                            <Link
                              key={action.href}
                              href={action.href}
                              onClick={onClose}
                              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#171717] transition-colors hover:border-primary/35 hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                              {action.label}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
            </div>
          </main>

          <section className="assistant-suggestions max-h-[115px] flex-none overflow-hidden border-t border-[#E5E7EB] bg-white px-4 py-2.5">
            <div className="mb-1.5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Popular questions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.slice(0, 3).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitMessage(prompt)}
                  className="inline-flex min-h-8 shrink-0 items-center rounded-full border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#171717] transition-colors hover:border-primary/35 hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  disabled={isSending}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              submitMessage(input);
            }}
            className="assistant-composer flex-none border-t border-[#E5E7EB] bg-white px-4 py-2.5"
          >
            <div className="rounded-[14px] border border-[#D9DEE7] bg-white px-3 py-2 transition-shadow focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/20">
              <div className="flex items-end gap-2">
                <textarea
                  ref={composerRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask about FileWalaTool tools..."
                  rows={1}
                  style={{ height: `${textareaHeight}px` }}
                  className="min-h-[52px] max-h-[96px] flex-1 resize-none border-0 bg-transparent p-0 text-[14px] leading-6 shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitMessage(input);
                    }
                  }}
                />
                <Button
                  type="submit"
                  className="mb-1 h-10 min-w-10 rounded-xl px-3"
                  disabled={isSending || !input.trim()}
                  aria-label="Send message"
                >
                  {isSending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>

            {error ? <p className="mt-2 rounded-xl border border-primary/20 bg-[#FFF1F2] px-3 py-2 text-xs text-[#B91C1C]">{error}</p> : null}
          </form>

          <footer className="assistant-privacy flex-none px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-[11px] leading-4 text-muted-foreground">
            Public guidance only - do not share personal documents or passwords.
          </footer>
      </div>
  );
}
