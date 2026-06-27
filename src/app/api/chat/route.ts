import { NextResponse } from "next/server";

import { toolCategories } from "@/data/tools";
import { publicRoutes } from "@/lib/seo";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  pageContext?: {
    pathname?: string;
    title?: string;
  };
};

const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim();
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPublicFounderAnswer(message: string) {
  const normalized = message.toLowerCase();
  const asksFounder =
    /\bfounder\b/.test(normalized) ||
    /\bmuhammad\s+sufiyan\b/.test(normalized) ||
    /\bwho\s+(made|built|created)\b/.test(normalized) ||
    /\bwho\s+is\s+behind\b/.test(normalized);

  if (!asksFounder) return "";

  return "FileWalaTool was founded by Muhammad Sufiyan. He created the platform to provide simple and practical browser-based tools for image, PDF, and document tasks. Public portfolio: https://mdsufidev.vercel.app/";
}

function buildAppContext(pathname?: string, title?: string) {
  const categories = toolCategories
    .map((category) => {
      const toolNames = [category.title, ...category.tools.map((tool) => tool.name)].join(", ");
      return `${category.title}: ${toolNames}`;
    })
    .join("\n");

  return [
    "You are the FileWalaTool assistant.",
    "Answer only about the public application, routes, file tools, and how to use them.",
    "You may answer public questions about available tools, how a tool works, browser-based file handling, public founder information, and the contact/support route.",
    "Do not claim access to private admin data or internal server state.",
    "Do not reveal or speculate about admin data, environment variables, API keys, contact message data, private founder details, or non-public implementation details.",
    "Privacy guidance: FileWalaTool provides public guidance only. Users should not share passwords, secrets, or personal documents in chat.",
    "Founder public info: FileWalaTool was founded by Muhammad Sufiyan.",
    "Founder public answer: Muhammad Sufiyan created FileWalaTool to provide simple and practical browser-based tools for image, PDF, and document tasks.",
    "Founder public portfolio: https://mdsufidev.vercel.app/",
    "Keep founder answers short and public-safe. Do not reveal private contact info, admin data, secrets, or non-public personal details.",
    "When a user asks for a tool, mention the relevant public route if known.",
    "Use the user's language when practical, and keep answers concise but useful.",
    pathname ? `Current page: ${pathname}` : "",
    title ? `Current page title: ${title}` : "",
    "Public categories and tools:",
    categories,
    "Canonical public routes:",
    publicRoutes.map((route) => `${route.title}: ${route.path}`).join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: "GROQ_API_KEY is not configured." }, { status: 503 });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: message.role,
      content: cleanText(message.content),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-10);

  const userMessage = messages.filter((message) => message.role === "user").at(-1);
  if (!userMessage) {
    return NextResponse.json({ error: "Please ask a question first." }, { status: 400 });
  }

  const founderAnswer = getPublicFounderAnswer(userMessage.content);
  if (founderAnswer) {
    return NextResponse.json({ message: founderAnswer });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: buildAppContext(body.pageContext?.pathname, body.pageContext?.title),
          },
          ...messages,
        ],
      }),
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Groq request timed out." : "Groq request could not be reached.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    return NextResponse.json(
      {
        error: details ? `Groq request failed: ${details}` : "Groq request failed.",
      },
      { status: response.status },
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Groq returned an empty response." }, { status: 502 });
  }

  return NextResponse.json({ message: content });
}
