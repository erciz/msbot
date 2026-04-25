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
} from "./assistantCore.js";

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
  bot.onText(regex, msg => {
    const text = resolveCommandText(command);
    if (text) {
      if (command === "/start") {
        const user = msg.from?.username || msg.from?.id || "unknown";
        console.log(`[/start] ${user}`);
      }
      bot.sendMessage(msg.chat.id, text, OPTS_MD);
    }
  });
}

function startPollingBot() {
  const token = ensureToken();

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

  registerCommand(bot, "/start");
  registerCommand(bot, "/help");
  registerCommand(bot, "/links");
  registerCommand(bot, "/about");

  bot.on("message", msg => {
    if (!msg?.text) return;

    const text = String(msg.text).trim();
    const command = parseTelegramCommand(text);
    if (command) return;

    const chatId = msg.chat.id;
    const user = msg.from?.username || msg.from?.id || "unknown";

    console.log(`[${user}] ${text}`);

    bot.sendChatAction(chatId, "typing");

    try {
      const reply = buildAssistantReply(chatId, text);
      bot.sendMessage(chatId, reply.text, OPTS_MD);
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
  console.log("  Waiting for messages...");
  console.log("=".repeat(50) + "\n");
}

if (isMainModule()) {
  startPollingBot();
}
