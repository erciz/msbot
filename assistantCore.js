/**
 * Shared MoonSale assistant logic used by both polling and webhook runtimes.
 */

import { SearchEngine } from "./searchEngine.js";

export const WELCOME = `
� *Welcome to the MoonSale Assistant\\!*

Yo\\! 👋 I'm your go\\-to bot for *everything* MoonSale — presales, fair launches, fees, vesting, token locks, KYC, audits, and all the crypto goodness\\!

No BS, no AI hallucinations — just straight\\-up answers powered by MoonSale's official data\\.

*Try asking me:*
• 🤔 What is MoonSale?
• ➕ How do I create a presale?
• 💰 What about platform fees?
• 🔒 Are LP tokens locked?
• ✅ How do fair launches work?
• 🌙 What happens if softcap fails?

Type /help for commands, or just *go ahead and ask\\!* 💬
`.trim();

export const HELP = `
*🤖 MoonSale Assistant — Full Command Menu*

/start — 👋 Show the welcome message
/help  — 📚 This help menu
/links — 🔗 All the cool MoonSale links
/about — ℹ️ About this awesome bot

*Or just vibe and ask:* 💬
• 💡 How does vesting work?
• ⏪ Can I withdraw my tokens early?
• 🌍 Which blockchains are supported?
• 🔐 How do I lock my tokens?
• ⚖️ What's a fair launch?
• 💸 What are the fees?
• 🎯 How's KYC handled?

Just type any question and I'll hit you with answers\\! 🚀
`.trim();

export const LINKS = `
*🔗 All MoonSale Links — Your Ultimate Launchpad Toolkit*

*🎯 Main Actions:*
🚀 [Browse Presales](https://www.moonsale.app/presale) — Explore live & upcoming presales
➕ [Create a Presale](https://www.moonsale.app/create) — Launch your token\\!
⚖️ [Create Fair Launch](https://www.moonsale.app/create-fair-launch) — No fixed price needed

*🛠️ Token Tools:*
🪙 [Token Generator](https://www.moonsale.app/create-token) — Deploy your ERC20
🔍 [Token Scanner](https://www.moonsale.app/token-scanner) — Check contract safety
📊 [Tokenomics Creator](https://www.moonsale.app/tokenomics-creator) — Plan your economics

*💰 Investors & Builders:*
🔒 [Token Lock](https://www.moonsale.app/lock) — Lock your liquidity safe
📅 [Token Vesting](https://www.moonsale.app/vesting) — Set up release schedules
✅ [KYC & Audit](https://www.moonsale.app/kyc-audit) — Verify legitimacy

*📖 Documentation:*
💎 [Investor Docs](https://www.moonsale.app/investor-docs) — Everything for investors
👨\\-💻 [Developer Docs](https://www.moonsale.app/developer-docs) — Technical integration
💰 [Platform Fees Info](https://www.moonsale.app/fees) — What's the cost?

*For more details, visit* 🌙 *[moonsale\\.app](https://moonsale.app)*
`.trim();

export const ABOUT = `
*🤖 About the MoonSale Assistant*

Built with 💜 for the MoonSale community, this bot is your 24/7 launchpad expert\\!

*What makes us cool:*
✅ *Zero AI BS* — Real answers from actual MoonSale docs, no hallucinations
⚡ *Instant replies* — No API calls or inference delays, pure speed
🎯 *Always accurate* — Verified against official platform data
🔍 *Smart search* — TF\\-IDF + fuzzy matching = finds what you need

*Quick facts:*
🏗️ Built on Node\\.js with a custom search engine
🌍 Supports both Ethereum & BNB Chain
💬 Works in DMs, groups, and channels

*Need more\\?*
📖 Check /links for all resources
🔗 Visit [moonsale\\.app](https://moonsale.app) for the full platform

Happy launching\\! 🚀
`.trim();

export const FALLBACK = `
Hmm, that one's got me scratching my circuits\\! 🤖 But no worries\\!

*Try these:*
📝 Rephrase your question — maybe I'll catch it\\!
📖 [Investor Docs](https://www.moonsale.app/investor-docs) — The ultimate guide
👨\\-💻 [Developer Docs](https://www.moonsale.app/developer-docs) — For the code\\-heads
🚀 [Browse Presales](https://www.moonsale.app/presale) — See live projects
🏠 [Visit moonsale\\.app](https://moonsale.app) — Home base

Or just ask me differently — I learn as we chat\\! 💬
`.trim();

export const OFF_TOPIC_REPLY =
  "Yo, I'm laser\\-focused on MoonSale only\\! 🌙\n\n" +
  "I can't help with Bitcoin, Solana, sports, or weather\\. But ask me anything about presales, fair launches, token vesting, KYC, fees, or token tools — and I'll be all in\\! 🚀\n\n" +
  "What MoonSale question can I help with\\?";

const SPECIFIC_PRESALE_REPLY = [
  "🔍 Looking for a specific presale\\? You got it\\!",
  "",
  "I don't have details about individual projects in my brain — but MoonSale's platform does\\!",
  "",
  "👉 [Browse all presales on moonsale\\.app/presale](https://moonsale.app/presale)",
  "",
  "You can search by token name, contract, or project there\\. Check the status, hardcap, softcap, and team all in one place\\!",
  "",
  "⚠️ *Always DYOR* — Do your own research before investing\\. Check audits, team info, and community vibes\\!",
  "",
  "Need general presale info\\? Just ask me something like 'What is a presale\\?' and I'll drop the knowledge\\! 🚀",
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
  // Add tone-aware prefixes and formatting
  if (tone === "casual") {
    const prefixes = [
      "Yo, check it out: ",
      "Real quick: ",
      "Got you: ",
      "Here's the deal: ",
    ];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return prefix + answer;
  } else if (tone === "professional") {
    return answer;
  } else {
    // friendly - add emoji or casual opener
    const friendlyPrefixes = [
      "Happy to help: ",
      "Here's the scoop: ",
      "This should help: ",
      "Got it, here's what I know: ",
      "This is what you need to know: ",
    ];
    const prefix = friendlyPrefixes[Math.floor(Math.random() * friendlyPrefixes.length)];
    return prefix + answer;
  }
}

const GREETING_RESPONSES = [
  "Hey\\! 👋 I'm the MoonSale Assistant\\. Ask me anything about the platform\\!\\n\\nTry: What is MoonSale\\? or How do I create a presale\\?",
  "Yo\\! 🌙 MoonSale Assistant here\\. Ready to talk presales, fair launches, vesting, fees — you name it\\!",
  "Sup\\! 🚀 Let's chat about MoonSale\\. What do you want to know\\?",
  "Hey there\\! 💬 I'm your MoonSale bot\\. Ask me about launches, tokens, locks, or anything launchpad\\!",
  "Hola\\! 👋 MoonSale Assistant at your service\\. What's on your mind\\?",
];

function getRandomGreeting() {
  return GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
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

  // Add context-aware tips at the end
  const lowerText = String(text || "").toLowerCase();
  let tip = "";
  
  if (lowerText.includes("presale") && !lowerText.includes("fair")) {
    tip = "\n\n💡 *Pro tip:* Want to create your own presale\\? Go to [moonsale\\.app/create](https://www.moonsale.app/create)";
  } else if (lowerText.includes("fair launch")) {
    tip = "\n\n💡 *Pro tip:* Ready to launch fair\\? Check [moonsale\\.app/create\\-fair\\-launch](https://www.moonsale.app/create-fair-launch)";
  } else if (lowerText.includes("fee") || lowerText.includes("cost")) {
    tip = "\n\n💡 *For details:* See the full [fee breakdown](https://www.moonsale.app/fees)";
  } else if (lowerText.includes("vesting") || lowerText.includes("release")) {
    tip = "\n\n💡 *For creators:* Set up vesting with the [Token Vesting tool](https://www.moonsale.app/vesting)";
  } else if (lowerText.includes("lock") || lowerText.includes("liquidity")) {
    tip = "\n\n💡 *Lock tokens safely:* Use the [Token Lock tool](https://www.moonsale.app/lock)";
  } else if (lowerText.includes("kyc") || lowerText.includes("audit")) {
    tip = "\n\n💡 *Verify projects:* Check [KYC & Audit status](https://www.moonsale.app/kyc-audit)";
  } else if (lowerText.includes("token")) {
    tip = "\n\n💡 *Need to create a token\\?* Try the [Token Generator](https://www.moonsale.app/create-token)";
  }
  
  if (tip) {
    out = out + tip;
  }

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
      text: escape(getRandomGreeting()),
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
