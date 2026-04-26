/**
 * Web assistant endpoint for non-Telegram clients (for example, website AI modals).
 * Route: /api/assistant
 */

import {
  buildAssistantReply,
  parseTelegramCommand,
  resolveCommandText,
} from "../assistantCore.js";

const DEFAULT_CHAT_ID = "web-modal";

function parseBody(body) {
  if (!body) return null;
  if (typeof body === "object") return body;
  if (typeof body !== "string") return null;

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function toFormat(value) {
  const normalized = String(value || "plain").trim().toLowerCase();
  return normalized === "telegram" ? "telegram" : "plain";
}

function toChatId(value) {
  if (value === null || value === undefined || value === "") return DEFAULT_CHAT_ID;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : String(value);
}

function applyCors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      endpoint: "/api/assistant",
      accepts: ["POST"],
      defaultFormat: "plain",
    });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const body = parseBody(req.body) || {};
  const query = String(body.query ?? body.message ?? "").trim();
  if (!query) {
    res.status(400).json({ ok: false, error: "missing_query" });
    return;
  }

  const outputFormat = toFormat(body.format);
  const chatId = toChatId(body.chatId);

  try {
    const command = parseTelegramCommand(query);

    if (command) {
      const text = resolveCommandText(command, { format: outputFormat });
      res.status(200).json({ ok: true, kind: "command", text, format: outputFormat });
      return;
    }

    const reply = buildAssistantReply(chatId, query, { format: outputFormat });
    res.status(200).json({ ok: true, ...reply, format: outputFormat });
  } catch (err) {
    console.error(`[ASSISTANT API ERROR] ${err?.message || err}`);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
}
