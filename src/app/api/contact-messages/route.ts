import { NextResponse } from "next/server";

import { appendContactMessage } from "@/lib/contact-messages";
import type { ContactMessage } from "@/types/contact";

const TOPIC_LABELS: Record<string, string> = {
  "tool-not-working": "Tool not working",
  "report-a-bug": "Report a bug",
  "request-a-tool": "Request a tool",
  "general-feedback": "General feedback",
  other: "Other",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const name = clean(payload.name);
  const email = clean(payload.email);
  const topic = clean(payload.topic);
  const relatedTool = clean(payload.relatedTool);
  const message = clean(payload.message);
  const technicalDetails = clean(payload.technicalDetails);

  const errors: Record<string, string> = {};

  if (name.length < 2) errors.name = "Please enter your name.";
  if (name.length > 80) errors.name = "Your name must be 80 characters or fewer.";
  if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
  if (!Object.prototype.hasOwnProperty.call(TOPIC_LABELS, topic)) errors.topic = "Please choose a topic.";
  if (message.length < 20) errors.message = "Your message must be at least 20 characters.";
  if (message.length > 1500) errors.message = "Message cannot be longer than 1500 characters.";

  if (Object.keys(errors).length) {
    return NextResponse.json({ message: "Please review the highlighted fields.", errors }, { status: 400 });
  }

  const record: ContactMessage = {
    id: crypto.randomUUID(),
    name,
    email,
    topic: TOPIC_LABELS[topic],
    relatedTool,
    message,
    technicalDetails,
    createdAt: new Date().toISOString(),
    status: "new",
  };

  try {
    await appendContactMessage(record);
  } catch {
    return NextResponse.json(
      { message: "We could not send your message right now. Please check your connection and try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "Message sent successfully." });
}
