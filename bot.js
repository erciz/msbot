/**
 * MoonSale Telegram Bot — Node.js
 * =================================
 * 24/7 support bot powered by smart search.
 * No AI API. No GPU. No monthly cost.
 *
 * Setup:
 *   1. npm install
 *   2. npm run scrape
 *   3. npm run build
 *   Set TELEGRAM_TOKEN env variable
 *   4. npm run bot
 */

import TelegramBot from "node-telegram-bot-api";
import { SearchEngine } from "./searchEngine.js";

// ── Config ────────────────────────────────────────────────────────────────────
const TOKEN = process.env.TELEGRAM_TOKEN;

if (!TOKEN) {
  console.error("\n ERROR: TELEGRAM_TOKEN environment variable is not set.");
  console.error("  Windows:  set TELEGRAM_TOKEN=your_token_here");
  console.error("  Mac/Linux: export TELEGRAM_TOKEN=your_token_here\n");
  process.exit(1);
}

// ── Load search engine ────────────────────────────────────────────────────────
let engine;
try {
  engine = new SearchEngine();
  console.log(`\n Knowledge base loaded: ${engine.entries.length} entries`);
} catch (e) {
  console.error(`\n ERROR loading knowledge base: ${e.message}`);
  console.error("  Run: npm run build\n");
  process.exit(1);
}

// ── Bot messages ──────────────────────────────────────────────────────────────
const WELCOME = `
👋 *Welcome to MoonSale Assistant\\!*

I can answer any question about the MoonSale launchpad — presales, fair launches, fees, refunds, liquidity, vesting, token locking, KYC, audits and more\\.

Just type your question\\!

*Examples:*
• What is MoonSale?
• How do I create a presale?
• What happens if softcap isn't reached?
• Are LP tokens locked?
• What are the platform fees?

Type /help for all commands\\.
`.trim();

const HELP = `
*MoonSale Assistant — Commands*

/start — Welcome message
/help  — This help message
/links — Useful MoonSale links
/about — About this bot

*Or just ask any question:*
• How does vesting work?
• Can I withdraw early?
• Which blockchains are supported?
• How do I lock my tokens?
• What is a fair launch?
`.trim();

const LINKS = `
*Useful MoonSale Links*

🚀 [Browse Presales](https://www.moonsale.app/presale)
➕ [Create Presale](https://www.moonsale.app/create)
⚖️ [Create Fair Launch](https://www.moonsale.app/create-fair-launch)
💰 [Platform Fees](https://www.moonsale.app/fees)
🔒 [Token Lock](https://www.moonsale.app/lock)
📅 [Token Vesting](https://www.moonsale.app/vesting)
🪙 [Token Generator](https://www.moonsale.app/create-token)
🔍 [Token Scanner](https://www.moonsale.app/token-scanner)
✅ [KYC & Audit](https://www.moonsale.app/kyc-audit)
📊 [Tokenomics Creator](https://www.moonsale.app/tokenomics-creator)
📖 [Investor Docs](https://www.moonsale.app/investor-docs)
🛠️ [Developer Docs](https://www.moonsale.app/developer-docs)
`.trim();

const ABOUT = `
*About MoonSale Assistant*

Answers questions about MoonSale using a smart search engine built from the platform's official content\\.

• No AI hallucinations — answers come from real MoonSale data
• Always accurate — based on verified platform information
• Instant responses — no model inference delay

Built for the MoonSale community 🚀
`.trim();

const FALLBACK = `
I'm not sure about that one\\. Try:

• Rephrasing your question
• [Investor Docs](https://www.moonsale.app/investor-docs)
• [Developer Docs](https://www.moonsale.app/developer-docs)
• [Browse Presales](https://www.moonsale.app/presale)
`.trim();

const OFF_TOPIC_REPLY =
  "I only have information about the MoonSale platform\\. " +
  "Ask me about presales, fair launches, fees, vesting, or token tools\\! 🚀";

// Compact per-chat memory for follow-up requests like "link of that please"
const CHAT_CONTEXT = new Map();
const MAX_CHAT_CONTEXTS = 2000;
const FOLLOW_UP_CONTEXT_TTL_MS = 30 * 60 * 1000;

const EXPLICIT_LINK_TOPIC_PATTERNS = [
  /\bpresale\b/i,
  /\bfair\s*launch\b/i,
  /\bwhitepaper\b/i,
  /\binvestor\s*docs\b/i,
  /\bdeveloper\s*docs\b/i,
  /\bfees?\b/i,
  /\btokenomics\b/i,
  /\btoken\s*scanner\b/i,
  /\bvesting\b/i,
  /\block\b/i,
  /\bkyc\b/i,
  /\baudit\b/i,
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const GREETINGS = new Set([
  "hi","hello","hey","sup","yo","hola","greetings",
  "good morning","good evening","good afternoon","howdy",
]);

function isGreeting(text) {
  return GREETINGS.has(text.toLowerCase().trim().replace(/[!?]+$/, ""));
}

const OFF_TOPIC_PATTERNS = [
  /\b(bitcoin|btc(?!\s*chain)|solana|sol|cardano|ada|xrp|ripple)\b/i,
  /\b(binance(?!.*moonsale)|coinbase|kraken|okx|bybit)\b/i,
  /\bweather\b/i,
  /\b(football|cricket|sports|basketball)\b/i,
];

function isOffTopic(text) {
  return OFF_TOPIC_PATTERNS.some(p => p.test(text));
}

function isFollowUpLinkRequest(text) {
  const q = (text || "").toLowerCase().trim();
  if (!q) return false;

  const asksLink =
    /\b(link|url|source|website)\b/.test(q)
    || /^link\??$/.test(q)
    || /^send\s+link\??$/.test(q)
    || /^source\??$/.test(q);

  if (!asksLink) return false;

  const referencesPrevious =
    /\b(that|it|this|above|previous|last|earlier|same)\b/.test(q)
    || /^link\??$/.test(q)
    || /^send\s+link\??$/.test(q)
    || /^source\??$/.test(q)
    || /^link\s+of\s+that(\s+please)?\??$/.test(q);

  if (!referencesPrevious) return false;

  return !EXPLICIT_LINK_TOPIC_PATTERNS.some(p => p.test(q));
}

function getChatContext(chatId) {
  if (!CHAT_CONTEXT.has(chatId)) {
    if (CHAT_CONTEXT.size >= MAX_CHAT_CONTEXTS) {
      const oldestChatId = CHAT_CONTEXT.keys().next().value;
      if (oldestChatId !== undefined) CHAT_CONTEXT.delete(oldestChatId);
    }
    CHAT_CONTEXT.set(chatId, {
      lastQuery: "",
      lastTopic: "",
      lastLink: "",
      updatedAt: 0,
    });
  }
  return CHAT_CONTEXT.get(chatId);
}

function extractUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s)]+/gi) || [];
  const cleaned = matches.map(u => u.replace(/[).,!?]+$/g, ""));
  return [...new Set(cleaned)];
}

function rememberChatContext(chatId, query, answer, topResult) {
  const ctx = getChatContext(chatId);

  const links = [];
  if (topResult?.source && /^https?:\/\//i.test(topResult.source)) {
    links.push(topResult.source);
  }
  links.push(...extractUrls(answer));

  const uniqueLinks = [...new Set(links)];

  ctx.lastQuery = query;
  ctx.lastTopic = (topResult?.title || query || "").trim();
  if (uniqueLinks.length > 0) {
    ctx.lastLink = uniqueLinks[0];
  }
  ctx.updatedAt = Date.now();
}

// Escape special chars for Telegram MarkdownV2
function escape(text) {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// Tone detection for human-like responses
const TONE_PRO_PATTERNS = [
  /\bplease\b/i,
  /\bkindly\b/i,
  /\bofficial\b/i,
  /\bdocumentation\b/i,
  /\bexplain in detail\b/i,
  /\bfull details\b/i,
  /\bpolicy\b/i,
  /\baudit report\b/i,
];

const TONE_CASUAL_PATTERNS = [
  /\bhey\b/i,
  /\byo\b/i,
  /\bsup\b/i,
  /\bpls\b/i,
  /\blol\b/i,
  /\bquick\b/i,
  /\btldr\b/i,
];

const CASUAL_INTROS = [
  "Got you!",
  "Sure thing!",
  "Quick answer:",
  "No worries!",
];

const FRIENDLY_INTROS = [
  "Here you go:",
  "Happy to help:",
  "This should help:",
];

const CASUAL_EMOJIS = ["😄", "✨", "🚀", "🙌"];
const FRIENDLY_EMOJIS = ["🙂", "✅", "💡"];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function detectTone(query) {
  const q = query || "";
  if (TONE_PRO_PATTERNS.some(p => p.test(q)) || q.length > 140) return "professional";
  if (TONE_CASUAL_PATTERNS.some(p => p.test(q))) return "casual";
  return "friendly";
}

function styleAnswer(answer, tone) {
  if (tone === "professional") {
    return `Answer:\n${answer}`;
  }
  if (tone === "casual") {
    return `${pick(CASUAL_INTROS)} ${pick(CASUAL_EMOJIS)}\n\n${answer}`;
  }
  return `${pick(FRIENDLY_INTROS)} ${pick(FRIENDLY_EMOJIS)}\n\n${answer}`;
}

function formatAnswer(text) {
  // Convert plain URLs to markdown links
  text = text.replace(
    /📄 (Source|More info): (https?:\/\/\S+)/g,
    "📄 [More info]($2)"
  );
  // Escape for MarkdownV2
  text = escape(text);
  // Restore markdown links (don't escape inside them)
  text = text.replace(/📄 \[More info\]\((https?[^)]+)\)/g,
    (_, url) => `📄 [More info](${url})`
  );
  // Cap length
  if (text.length > 3800) {
    text = text.slice(0, 3800) + "\\.\\.\\.\n\n📄 [Read more](https://www.moonsale.app)";
  }
  return text;
}

// ── Bot setup ─────────────────────────────────────────────────────────────────
const bot = new TelegramBot(TOKEN, { polling: true });

const OPTS_MD = {
  parse_mode: "MarkdownV2",
  disable_web_page_preview: true,
};

// ── Commands ──────────────────────────────────────────────────────────────────
bot.onText(/\/start/, msg => {
  console.log(`[/start] ${msg.from.username || msg.from.id}`);
  bot.sendMessage(msg.chat.id, WELCOME, OPTS_MD);
});

bot.onText(/\/help/, msg => {
  bot.sendMessage(msg.chat.id, HELP, OPTS_MD);
});

bot.onText(/\/links/, msg => {
  bot.sendMessage(msg.chat.id, LINKS, OPTS_MD);
});

bot.onText(/\/about/, msg => {
  bot.sendMessage(msg.chat.id, ABOUT, OPTS_MD);
});

// ── Main message handler ──────────────────────────────────────────────────────
bot.on("message", async msg => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const query  = msg.text.trim();
  const chatId = msg.chat.id;
  const user   = msg.from.username || msg.from.id;
  const context = getChatContext(chatId);

  console.log(`[${user}] ${query}`);

  // Typing indicator
  bot.sendChatAction(chatId, "typing");

  // Greeting
  if (isGreeting(query)) {
    bot.sendMessage(
      chatId,
      escape("Hey! 👋 I'm the MoonSale Assistant. Ask me anything about the platform!\n\nTry: What is MoonSale? or How do I create a presale?"),
      OPTS_MD
    );
    return;
  }

  // Off-topic
  if (isOffTopic(query)) {
    bot.sendMessage(chatId, OFF_TOPIC_REPLY, OPTS_MD);
    return;
  }

  // Follow-up link request: resolve from immediately previous topic in this chat.
  const hasFreshContext = context.lastLink && (Date.now() - context.updatedAt <= FOLLOW_UP_CONTEXT_TTL_MS);

  if (isFollowUpLinkRequest(query) && hasFreshContext) {
    const topicText = context.lastTopic ? ` (${context.lastTopic})` : "";
    const raw = `Here is the exact link from your previous topic${topicText}:\n📄 Source: ${context.lastLink}`;
    const tone = detectTone(query);
    const styled = styleAnswer(raw, tone);
    const formatted = formatAnswer(styled);
    bot.sendMessage(chatId, formatted, OPTS_MD);
    return;
  }

  // Search and answer
  try {
    const topResult = engine.search(query, 1)[0];
    const raw = engine.answer(query);

    if (raw.includes("don't have specific info")) {
      bot.sendMessage(chatId, FALLBACK, OPTS_MD);
      return;
    }

    rememberChatContext(chatId, query, raw, topResult);

    const tone = detectTone(query);
    const styled = styleAnswer(raw, tone);
    const formatted = formatAnswer(styled);
    bot.sendMessage(chatId, formatted, OPTS_MD);

  } catch (err) {
    console.error(`[ERROR] ${err.message}`);
    bot.sendMessage(chatId, escape("Something went wrong. Please try again!"), OPTS_MD);
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────
bot.on("polling_error", err => {
  console.error(`[POLLING ERROR] ${err.message}`);
});

bot.on("error", err => {
  console.error(`[BOT ERROR] ${err.message}`);
});

// ── Startup ───────────────────────────────────────────────────────────────────
console.log("=".repeat(50));
console.log("  MoonSale Telegram Bot — Running");
console.log(`  KB entries: ${engine.entries.length}`);
console.log("  Waiting for messages...");
console.log("=".repeat(50) + "\n");
