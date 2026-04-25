/**
 * Shared MoonSale assistant logic used by both polling and webhook runtimes.
 */

import { SearchEngine } from "./searchEngine.js";

export const WELCOME = `
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

export const HELP = `
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

export const LINKS = `
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

export const ABOUT = `
*About MoonSale Assistant*

Answers questions about MoonSale using a smart search engine built from the platform's official content\\.

• No AI hallucinations — answers come from real MoonSale data
• Always accurate — based on verified platform information
• Instant responses — no model inference delay

Built for the MoonSale community 🚀
`.trim();

export const FALLBACK = `
I'm not sure about that one\\. Try:

• Rephrasing your question
• [Investor Docs](https://www.moonsale.app/investor-docs)
• [Developer Docs](https://www.moonsale.app/developer-docs)
• [Browse Presales](https://www.moonsale.app/presale)
`.trim();

export const OFF_TOPIC_REPLY =
  "I only have information about the MoonSale platform\\. " +
  "Ask me about presales, fair launches, fees, vesting, or token tools\\! 🚀";

const SPECIFIC_PRESALE_REPLY = [
  "I can't provide specific presale details for individual projects.",
  "If you mean a specific project, please go to /presale and search there.",
  "📄 Source: https://moonsale.app/presale",
  "",
  "Always DYOR before you invest in any project.",
  "Happy investing! 🚀",
].join("\n");

export const OPTS_MD = {
  parse_mode: "MarkdownV2",
  disable_web_page_preview: true,
};

const GREETINGS = new Set([
  "hi", "hello", "hey", "sup", "yo", "hola", "greetings",
  "good morning", "good evening", "good afternoon", "howdy",
]);

const OFF_TOPIC_PATTERNS = [
  /\b(bitcoin|btc(?!\s*chain)|solana|sol|cardano|ada|xrp|ripple)\b/i,
  /\b(binance(?!.*moonsale)|coinbase|kraken|okx|bybit)\b/i,
  /\bweather\b/i,
  /\b(football|cricket|sports|basketball)\b/i,
];

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

const PROJECT_TERM_STOPWORDS = new Set([
  "presale", "fair", "launch", "status", "listed", "moon", "moonsale",
  "live", "upcoming", "filled", "failed", "cancelled", "canceled", "ended",
  "current", "official", "listing", "source", "project", "projects", "token",
  "tokens", "app", "www", "https", "http", "details", "detail",
]);

const RESERVED_GENERIC_SINGLE_TERMS = new Set([
  "moonsale", "presale", "fairlaunch", "fair", "launch", "tokenomics",
  "fees", "refund", "refunds", "liquidity", "vesting", "audit", "kyc",
  "wallet", "metamask", "support", "help", "docs", "whitepaper", "link",
]);

const CHAT_CONTEXT = new Map();
const MAX_CHAT_CONTEXTS = 2000;
const FOLLOW_UP_CONTEXT_TTL_MS = 30 * 60 * 1000;
const GROUP_MENTION_ONLY = String(process.env.GROUP_MENTION_ONLY || "false").toLowerCase() === "true";

let engineSingleton;
let projectLookupTermsCache;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function getEngine() {
  if (!engineSingleton) {
    engineSingleton = new SearchEngine();
  }
  return engineSingleton;
}

function tokenizeSimple(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function getProjectLookupTerms() {
  if (projectLookupTermsCache) return projectLookupTermsCache;

  const terms = new Set();
  const engine = getEngine();

  for (const entry of (engine.entries || [])) {
    const tags = new Set(entry?.tags || []);
    if (!tags.has("project_lookup")) continue;

    const combined = `${entry?.title || ""} ${entry?.question || ""}`;
    for (const token of tokenizeSimple(combined)) {
      if (token.length < 3) continue;
      if (!/[a-z]/.test(token)) continue;
      if (PROJECT_TERM_STOPWORDS.has(token)) continue;
      terms.add(token);
    }

    const source = String(entry?.source || "").toLowerCase();
    const slugMatch = source.match(/\/(presale|fair-launch)\/([^/?#]+)/i);
    if (!slugMatch) continue;

    for (const token of slugMatch[2].split("-")) {
      if (token.length < 3) continue;
      if (!/[a-z]/.test(token)) continue;
      if (PROJECT_TERM_STOPWORDS.has(token)) continue;
      terms.add(token.toLowerCase());
    }
  }

  projectLookupTermsCache = terms;
  return projectLookupTermsCache;
}

function isSpecificPresaleQuery(query, topResult) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return false;

  const queryTokens = tokenizeSimple(q);
  if (!queryTokens.length) return false;

  // Allow core platform-level questions.
  if (/^what\s+is\s+moonsale\??$|^tell\s+me\s+about\s+moonsale\??$/.test(q)) {
    return false;
  }

  const terms = getProjectLookupTerms();
  const hasProjectToken = queryTokens.some(t => terms.has(t));
  const topIsProjectLookup = !!topResult && Array.isArray(topResult.tags) && topResult.tags.includes("project_lookup");

  const singleToken = queryTokens.length === 1;
  const singleTokenProjectLike = singleToken && !RESERVED_GENERIC_SINGLE_TERMS.has(queryTokens[0]);
  const asksSpecificDetail = /\b(status|details?|price|hardcap|softcap|buy|invest|claim|live|cancelled|canceled|upcoming|filled|failed)\b/.test(q);

  if (hasProjectToken) return true;
  if (singleTokenProjectLike && topIsProjectLookup) return true;
  if (topIsProjectLookup && asksSpecificDetail) return true;

  return false;
}

export function isGreeting(text) {
  return GREETINGS.has(String(text || "").toLowerCase().trim().replace(/[!?]+$/, ""));
}

export function isOffTopic(text) {
  return OFF_TOPIC_PATTERNS.some(p => p.test(String(text || "")));
}

export function isFollowUpLinkRequest(text) {
  const q = String(text || "").toLowerCase().trim();
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

export function escape(text) {
  return String(text || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export function formatAnswer(text) {
  let out = String(text || "");

  out = out.replace(
    /📄 (Source|More info): (https?:\/\/\S+)/g,
    "📄 [More info]($2)"
  );

  out = escape(out);

  out = out.replace(/📄 \[More info\]\((https?[^)]+)\)/g,
    (_, url) => `📄 [More info](${url})`
  );

  if (out.length > 3800) {
    out = out.slice(0, 3800) + "\\.\\.\\.\n\n📄 [Read more](https://www.moonsale.app)";
  }

  return out;
}

export function buildAssistantReply(chatId, query) {
  const q = String(query || "").trim();
  const context = getChatContext(chatId);

  if (isGreeting(q)) {
    return {
      kind: "greeting",
      text: escape("Hey! 👋 I'm the MoonSale Assistant. Ask me anything about the platform!\n\nTry: What is MoonSale? or How do I create a presale?"),
    };
  }

  if (isOffTopic(q)) {
    return { kind: "offtopic", text: OFF_TOPIC_REPLY };
  }

  const hasFreshContext = context.lastLink && (Date.now() - context.updatedAt <= FOLLOW_UP_CONTEXT_TTL_MS);

  if (isFollowUpLinkRequest(q) && hasFreshContext) {
    const topicText = context.lastTopic ? ` (${context.lastTopic})` : "";
    const raw = `Here is the exact link from your previous topic${topicText}:\n📄 Source: ${context.lastLink}`;
    const tone = detectTone(q);
    return { kind: "followup", text: formatAnswer(styleAnswer(raw, tone)) };
  }

  const engine = getEngine();
  const topResult = engine.search(q, 1)[0];

  if (isSpecificPresaleQuery(q, topResult)) {
    rememberChatContext(
      chatId,
      q,
      SPECIFIC_PRESALE_REPLY,
      { title: "Presale listings", source: "https://moonsale.app/presale" }
    );

    return { kind: "presale_guard", text: formatAnswer(SPECIFIC_PRESALE_REPLY) };
  }

  const raw = engine.answer(q);

  if (raw.includes("don't have specific info")) {
    return { kind: "fallback", text: FALLBACK };
  }

  rememberChatContext(chatId, q, raw, topResult);

  const tone = detectTone(q);
  const styled = styleAnswer(raw, tone);
  return { kind: "answer", text: formatAnswer(styled) };
}

export function resolveCommandText(command) {
  const cmd = String(command || "").toLowerCase();
  if (cmd === "/start") return WELCOME;
  if (cmd === "/help") return HELP;
  if (cmd === "/links") return LINKS;
  if (cmd === "/about") return ABOUT;
  return "";
}

export function parseTelegramCommand(text) {
  const m = String(text || "").trim().match(/^\/(start|help|links|about)(?:@[a-zA-Z0-9_]+)?\b/i);
  if (!m) return "";
  return `/${m[1].toLowerCase()}`;
}

function normalizeUsername(username) {
  return String(username || "").trim().replace(/^@/, "").toLowerCase();
}

function hasMention(text, username) {
  const u = normalizeUsername(username);
  if (!u) return false;

  const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`@${escaped}\\b`, "i");
  return re.test(String(text || ""));
}

export function shouldReplyToMessageByPolicy({
  chatType,
  text,
  command,
  botUsername,
  isReplyToBot = false,
  groupMentionOnly,
}) {
  const mentionOnly = typeof groupMentionOnly === "boolean" ? groupMentionOnly : GROUP_MENTION_ONLY;

  if (!mentionOnly) return true;

  const type = String(chatType || "").toLowerCase();
  const isGroup = type === "group" || type === "supergroup";
  if (!isGroup) return true;

  // Always allow explicit bot commands.
  if (command) return true;

  // In mention-only mode, replying to the bot is also allowed.
  if (isReplyToBot) return true;

  return hasMention(text, botUsername);
}
