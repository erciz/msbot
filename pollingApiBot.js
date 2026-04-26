/**
 * MoonSale Telegram Bot — Direct API polling runtime (no webhook).
 *
 * Uses Telegram Bot API getUpdates/sendMessage directly.
 * Suitable for VPS/local servers running continuously.
 */

import dns from "node:dns/promises";
import { loadDotEnvFile } from "./loadEnv.js";
import {
  OPTS_MD,
  buildAssistantReply,
  getEngine,
  parseTelegramCommand,
  resolveCommandText,
  shouldReplyToMessageByPolicy,
} from "./assistantCore.js";

loadDotEnvFile();

const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API_BASE_URL = String(process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org").replace(/\/+$/, "");
const POLL_TIMEOUT_SECONDS = Number(process.env.TELEGRAM_POLL_TIMEOUT || 30);
const IDLE_DELAY_MS = Number(process.env.TELEGRAM_POLL_IDLE_MS || 800);
const ERROR_DELAY_MS = Number(process.env.TELEGRAM_POLL_ERROR_MS || 3000);
const REMOVE_WEBHOOK_ON_START = String(process.env.REMOVE_WEBHOOK_ON_START || "true").toLowerCase() !== "false";
const GROUP_MENTION_ONLY = String(process.env.GROUP_MENTION_ONLY || "false").toLowerCase() === "true";
const BOT_USERNAME_ENV = String(process.env.BOT_USERNAME || "").replace(/^@/, "").toLowerCase();

let botIdentity = {
  username: BOT_USERNAME_ENV,
  id: Number(process.env.BOT_ID || 0) || 0,
};

if (!TOKEN) {
  console.error("Missing TELEGRAM_TOKEN.");
  console.error("PowerShell: $env:TELEGRAM_TOKEN=\"your_token_here\"");
  console.error("CMD: set TELEGRAM_TOKEN=your_token_here");
  process.exit(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function warnIfTelegramDnsLooksBlocked() {
  try {
    const records = await dns.lookup("api.telegram.org", { all: true });
    const addresses = records.map(r => r.address);
    const hasLoopback = addresses.includes("127.0.0.1") || addresses.includes("::1");

    if (hasLoopback) {
      console.error("DNS warning: api.telegram.org resolves to loopback on this machine.");
      console.error(`Resolved: ${addresses.join(", ")}`);
      console.error("This network is blocking Telegram API access.");
    }
  } catch {
    // Non-fatal check.
  }
}

async function telegramRequest(method, payload = {}) {
  const url = `${TELEGRAM_API_BASE_URL}/bot${TOKEN}/${method}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err) {
    const text = String(err?.stack || err || "");
    const looksLocal = text.includes("127.0.0.1") || text.includes("::1") || text.includes("ECONNREFUSED");

    console.error(`[API ERROR] ${method}: ${err?.message || err}`);
    if (looksLocal) {
      console.error("Detected local loopback resolution for Telegram API. Use an unblocked network/VPS.");
    }
    throw err;
  }
}

async function maybeDeleteWebhook() {
  if (!REMOVE_WEBHOOK_ON_START) return;

  try {
    const data = await telegramRequest("deleteWebhook", { drop_pending_updates: false });
    if (!data.ok) {
      console.error(`[WARN] deleteWebhook failed: ${JSON.stringify(data)}`);
      return;
    }

    console.log("Webhook disabled. Polling mode is active.");
  } catch {
    console.error("[WARN] Could not disable webhook right now. Poller will keep retrying getUpdates.");
  }
}

async function loadBotIdentity() {
  // If username is already provided via env, mention-only policy can still work.
  if (botIdentity.username) return;

  try {
    const data = await telegramRequest("getMe");
    if (!data?.ok || !data?.result) return;

    const username = String(data.result.username || "").toLowerCase();
    const id = Number(data.result.id || 0) || 0;

    botIdentity = { username: username || botIdentity.username, id: id || botIdentity.id };
  } catch {
    console.error("[WARN] getMe failed. Set BOT_USERNAME in .env for mention-only mode.");
  }
}

async function sendTyping(chatId) {
  try {
    await telegramRequest("sendChatAction", { chat_id: chatId, action: "typing" });
  } catch {
    // Ignore typing errors.
  }
}

async function sendReply(message, text) {
  const payload = {
    chat_id: message.chat.id,
    text,
    ...OPTS_MD,
    allow_sending_without_reply: true,
  };

  if (message.message_id) {
    payload.reply_to_message_id = message.message_id;
  }

  const data = await telegramRequest("sendMessage", payload);
  if (!data.ok) {
    console.error(`[SEND ERROR] ${JSON.stringify(data)}`);
  }
}

async function handleMessage(message) {
  if (!message || !message.chat) return;
  if (message.from?.is_bot) return;

  const text = String(message.text || message.caption || "").trim();
  if (!text) return;

  const command = parseTelegramCommand(text);
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

  if (!shouldReply) return;

  const chatId = message.chat.id;
  const user = message.from?.username || message.from?.id || "unknown";
  console.log(`[${user}] ${text}`);

  let replyText = "";

  if (command) {
    replyText = resolveCommandText(command);
  } else {
    const reply = buildAssistantReply(chatId, text);
    replyText = reply.text;
  }

  if (!replyText) return;

  await sendTyping(chatId);
  await sendReply(message, replyText);
}

async function run() {
  await warnIfTelegramDnsLooksBlocked();

  let engine;
  try {
    engine = getEngine();
  } catch (err) {
    console.error(`ERROR loading knowledge base: ${err.message}`);
    console.error("Run: npm run build");
    process.exit(1);
  }

  await maybeDeleteWebhook();
  await loadBotIdentity();

  console.log("=".repeat(60));
  console.log(" MoonSale Telegram Bot — Direct API Polling (No Webhook)");
  console.log(` KB entries: ${engine.entries.length}`);
  console.log(` Telegram API base: ${TELEGRAM_API_BASE_URL}`);
  console.log(` Bot identity: @${botIdentity.username || "unknown"}`);
  console.log(` Group mention-only: ${GROUP_MENTION_ONLY ? "ON" : "OFF"}`);
  console.log(" Waiting for messages...");
  console.log("=".repeat(60));

  let offset = 0;
  let stop = false;

  process.on("SIGINT", () => {
    stop = true;
    console.log("\nShutting down...");
  });

  while (!stop) {
    try {
      const data = await telegramRequest("getUpdates", {
        offset,
        timeout: POLL_TIMEOUT_SECONDS,
        allowed_updates: ["message", "edited_message"],
      });

      if (!data.ok) {
        console.error(`[POLL ERROR] ${JSON.stringify(data)}`);
        await sleep(ERROR_DELAY_MS);
        continue;
      }

      const updates = Array.isArray(data.result) ? data.result : [];

      for (const update of updates) {
        offset = Math.max(offset, Number(update.update_id || 0) + 1);
        const message = update.message || update.edited_message;
        await handleMessage(message);
      }

      if (updates.length === 0) {
        await sleep(IDLE_DELAY_MS);
      }
    } catch {
      await sleep(ERROR_DELAY_MS);
    }
  }
}

await run();
