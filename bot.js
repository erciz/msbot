/**
 * MoonSale Telegram Bot — Long polling runtime (local/VPS).
 */

import path from "path";
import { fileURLToPath } from "url";
import TelegramBot from "node-telegram-bot-api";
import {
  OPTS_MD,
  buildAssistantReply,
  getEngine,
  parseTelegramCommand,
  resolveCommandText,
  shouldReplyToMessageByPolicy,
} from "./assistantCore.js";
import {
  getReplyHintForUser,
  isAiControlCommand,
  isAiPausedForUser,
  isPrivilegedTelegramUser,
  runAiControlCommand,
} from "./telegramUserControls.js";

function isMainModule() {
  if (!process.argv[1]) return false;
  const entry = path.resolve(process.argv[1]);
  const current = fileURLToPath(import.meta.url);
  return entry === current;
}

function ensureToken() {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    console.error("\n ERROR: TELEGRAM_TOKEN environment variable is not set.");
    console.error("  Windows:  set TELEGRAM_TOKEN=your_token_here");
    console.error("  Mac/Linux: export TELEGRAM_TOKEN=your_token_here\n");
    process.exit(1);
  }
  return token;
}

function registerCommand(bot, command) {
  const regex = new RegExp(`^\\${command}(?:@[a-zA-Z0-9_]+)?(?:\\s|$)`, "i");
  bot.onText(regex, async msg => {
    try {
      const userId = msg.from?.id;
      if (isPrivilegedTelegramUser(userId)) return;
      if (await isAiPausedForUser(userId)) return;

      const text = resolveCommandText(command);
      if (!text) return;

      if (command === "/start") {
        const user = msg.from?.username || msg.from?.id || "unknown";
        console.log(`[/start] ${user}`);
      }

      bot.sendMessage(msg.chat.id, text, OPTS_MD);
    } catch (err) {
      console.error(`[COMMAND ERROR] ${err.message}`);
    }
  });
}

function startPollingBot() {
  const token = ensureToken();
  const groupMentionOnly = String(process.env.GROUP_MENTION_ONLY || "false").toLowerCase() === "true";
  let botUsername = String(process.env.BOT_USERNAME || "").replace(/^@/, "").toLowerCase();
  let botId = Number(process.env.BOT_ID || 0) || 0;

  let engine;
  try {
    engine = getEngine();
    console.log(`\n Knowledge base loaded: ${engine.entries.length} entries`);
  } catch (e) {
    console.error(`\n ERROR loading knowledge base: ${e.message}`);
    console.error("  Run: npm run build\n");
    process.exit(1);
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.getMe()
    .then(me => {
      if (me?.username) botUsername = String(me.username).toLowerCase();
      if (me?.id) botId = Number(me.id) || botId;
      console.log(`  Bot identity: @${botUsername || "unknown"}`);
      if (groupMentionOnly && !botUsername) {
        console.log("  Mention-only mode is enabled but bot username is unknown.");
      }
    })
    .catch(err => {
      console.error(`[WARN] Could not read bot identity: ${err.message}`);
    });

  registerCommand(bot, "/start");
  registerCommand(bot, "/help");
  registerCommand(bot, "/links");
  registerCommand(bot, "/about");

  bot.on("message", async msg => {
    if (!msg?.text) return;

    const userId = msg.from?.id;
    if (isPrivilegedTelegramUser(userId)) return;

    const text = String(msg.text).trim();
    const command = parseTelegramCommand(text);

    if (isAiControlCommand(command)) {
      try {
        const replyText = await runAiControlCommand(command, userId);
        if (replyText) {
          bot.sendMessage(msg.chat.id, replyText, OPTS_MD);
        }
      } catch (err) {
        console.error(`[AI CONTROL ERROR] ${err.message}`);
      }
      return;
    }

    if (await isAiPausedForUser(userId)) return;
    if (command) return;

    const replyFrom = msg.reply_to_message?.from;
    const replyToBot = !!replyFrom && (
      (botId && Number(replyFrom.id) === botId)
      || (botUsername && String(replyFrom.username || "").toLowerCase() === botUsername)
    );

    const shouldReply = shouldReplyToMessageByPolicy({
      chatType: msg.chat?.type,
      text,
      command,
      botUsername,
      isReplyToBot: replyToBot,
      groupMentionOnly,
    });

    if (!shouldReply) return;

    const chatId = msg.chat.id;
    const user = msg.from?.username || msg.from?.id || "unknown";

    console.log(`[${user}] ${text}`);

    bot.sendChatAction(chatId, "typing");

    try {
      const reply = buildAssistantReply(chatId, text);
      const hint = await getReplyHintForUser(userId);
      bot.sendMessage(chatId, reply.text + hint, OPTS_MD);
    } catch (err) {
      console.error(`[ERROR] ${err.message}`);
      bot.sendMessage(chatId, "Something went wrong\. Please try again\!", OPTS_MD);
    }
  });

  bot.on("polling_error", err => {
    console.error(`[POLLING ERROR] ${err.message}`);
  });

  bot.on("error", err => {
    console.error(`[BOT ERROR] ${err.message}`);
  });

  console.log("=".repeat(50));
  console.log("  MoonSale Telegram Bot — Running");
  console.log(`  KB entries: ${engine.entries.length}`);
  console.log(`  Group mention-only: ${groupMentionOnly ? "ON" : "OFF"}`);
  console.log("  Waiting for messages...");
  console.log("=".repeat(50) + "\n");
}

if (isMainModule()) {
  startPollingBot();
}
