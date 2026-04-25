/**
 * Vercel serverless webhook endpoint for Telegram updates.
 * Route: /api/telegram
 */

import {
  OPTS_MD,
  buildAssistantReply,
  parseTelegramCommand,
  resolveCommandText,
  shouldReplyToMessageByPolicy,
} from "../assistantCore.js";

const TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const GROUP_MENTION_ONLY = String(process.env.GROUP_MENTION_ONLY || "false").toLowerCase() === "true";
const BOT_USERNAME_ENV = String(process.env.BOT_USERNAME || "").replace(/^@/, "").toLowerCase();

let botIdentityPromise;

function getHeader(req, name) {
  if (!req?.headers) return "";
  const key = String(name || "").toLowerCase();
  const raw = req.headers[key] ?? req.headers[name];
  if (Array.isArray(raw)) return String(raw[0] || "");
  return String(raw || "");
}

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

function pickMessage(update) {
  return update?.message || update?.edited_message || null;
}

async function sendTelegramMessage(chatId, text, replyToMessageId) {
  const payload = {
    chat_id: chatId,
    text,
    ...OPTS_MD,
    allow_sending_without_reply: true,
  };

  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }

  return fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function getBotIdentity() {
  if (BOT_USERNAME_ENV) {
    return { username: BOT_USERNAME_ENV, id: 0 };
  }

  if (!botIdentityPromise) {
    botIdentityPromise = (async () => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getMe`);
        const data = await res.json();

        if (!data?.ok || !data?.result) return { username: "", id: 0 };

        return {
          username: String(data.result.username || "").toLowerCase(),
          id: Number(data.result.id || 0) || 0,
        };
      } catch {
        return { username: "", id: 0 };
      }
    })();
  }

  return botIdentityPromise;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ ok: true, endpoint: "/api/telegram" });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  if (!TOKEN) {
    res.status(500).json({ ok: false, error: "missing_TELEGRAM_TOKEN" });
    return;
  }

  if (WEBHOOK_SECRET) {
    const headerSecret = getHeader(req, "x-telegram-bot-api-secret-token");
    if (!headerSecret || headerSecret !== WEBHOOK_SECRET) {
      res.status(401).json({ ok: false, error: "invalid_webhook_secret" });
      return;
    }
  }

  const update = parseBody(req.body);
  const message = pickMessage(update);

  if (!message || !message.chat) {
    res.status(200).json({ ok: true, skipped: "no_message" });
    return;
  }

  if (message.from?.is_bot) {
    res.status(200).json({ ok: true, skipped: "bot_message" });
    return;
  }

  const text = String(message.text || message.caption || "").trim();
  if (!text) {
    res.status(200).json({ ok: true, skipped: "empty_text" });
    return;
  }

  try {
    const command = parseTelegramCommand(text);
    const botIdentity = await getBotIdentity();
    const replyFrom = message.reply_to_message?.from;
    const replyToBot = !!replyFrom && (
      (botIdentity.id && Number(replyFrom.id) === botIdentity.id)
      || (botIdentity.username && String(replyFrom.username || "").toLowerCase() === botIdentity.username)
    );

    const shouldReply = shouldReplyToMessageByPolicy({
      chatType: message.chat?.type,
      text,
      command,
      botUsername: botIdentity.username,
      isReplyToBot: replyToBot,
      groupMentionOnly: GROUP_MENTION_ONLY,
    });

    if (!shouldReply) {
      res.status(200).json({ ok: true, skipped: "mention_policy" });
      return;
    }

    let replyText = "";

    if (command) {
      replyText = resolveCommandText(command);
    } else {
      const reply = buildAssistantReply(message.chat.id, text);
      replyText = reply.text;
    }

    if (!replyText) {
      res.status(200).json({ ok: true, skipped: "no_reply" });
      return;
    }

    const sendRes = await sendTelegramMessage(message.chat.id, replyText, message.message_id);
    if (!sendRes.ok) {
      const errBody = await sendRes.text();
      console.error(`[WEBHOOK SEND ERROR] ${sendRes.status} ${errBody}`);
      res.status(502).json({ ok: false, error: "telegram_send_failed" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[WEBHOOK ERROR] ${err.message}`);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
}
