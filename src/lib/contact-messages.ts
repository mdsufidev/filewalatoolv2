import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ContactMessage } from "@/types/contact";

const storageDir = path.join(process.cwd(), "data");
const storageFile = path.join(storageDir, "contact-messages.json");
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabaseTable = process.env.SUPABASE_CONTACT_MESSAGES_TABLE?.trim() || "contact_messages";
const hasSupabase = Boolean(supabaseUrl && supabaseServiceKey);

type SupabaseContactMessageRow = {
  id: string;
  name: string;
  email: string;
  topic: string;
  related_tool: string;
  message: string;
  technical_details: string;
  created_at: string;
  status: "new";
};

function mapSupabaseRow(row: SupabaseContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    relatedTool: row.related_tool,
    message: row.message,
    technicalDetails: row.technical_details,
    createdAt: row.created_at,
    status: row.status,
  };
}

async function readMessagesFile(): Promise<ContactMessage[]> {
  try {
    const raw = await readFile(storageFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ContactMessage[]) : [];
  } catch {
    return [];
  }
}

async function writeMessagesFile(messages: ContactMessage[]) {
  await mkdir(storageDir, { recursive: true });
  await writeFile(storageFile, JSON.stringify(messages, null, 2), "utf8");
}

async function appendContactMessageToSupabase(message: ContactMessage) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase is not configured.");
  }

  const row: SupabaseContactMessageRow = {
    id: message.id,
    name: message.name,
    email: message.email,
    topic: message.topic,
    related_tool: message.relatedTool,
    message: message.message,
    technical_details: message.technicalDetails,
    created_at: message.createdAt,
    status: message.status,
  };

  const response = await fetch(`${supabaseUrl.replace(/\/+$/g, "")}/rest/v1/${supabaseTable}`, {
    method: "POST",
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(details ? `Supabase insert failed: ${details}` : "Supabase insert failed.");
  }

  return message;
}

async function readContactMessagesFromSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/+$/g, "")}/rest/v1/${supabaseTable}?select=*&order=created_at.desc`,
    {
      method: "GET",
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(details ? `Supabase read failed: ${details}` : "Supabase read failed.");
  }

  const rows = (await response.json()) as SupabaseContactMessageRow[];
  return Array.isArray(rows) ? rows.map(mapSupabaseRow) : [];
}

export async function appendContactMessage(message: ContactMessage) {
  if (hasSupabase) {
    return appendContactMessageToSupabase(message);
  }

  const messages = await readMessagesFile();
  messages.push(message);
  await writeMessagesFile(messages);
  return message;
}

export async function readContactMessages() {
  if (hasSupabase) {
    return readContactMessagesFromSupabase();
  }

  return readMessagesFile();
}
