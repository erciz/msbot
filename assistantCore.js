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
/stopAiBot — ⏸️ Pause AI replies for 12h
/startAiBot — ▶️ Resume AI replies

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

If I still miss your exact case, please wait for the admin team to reply in chat.

*Try these:*
📝 Rephrase your question — maybe I'll catch it
📖 [Investor Docs](https://www.moonsale.app/investor-docs)
👨\\-💻 [Developer Docs](https://www.moonsale.app/developer-docs)
🚀 [Browse Presales](https://www.moonsale.app/presale)
🏠 [Visit moonsale\\.app](https://moonsale.app)

Or just ask me differently — I learn as we chat\\! 💬
`.trim();

export const OFF_TOPIC_REPLY =
  "Yo, I'm laser\\-focused on MoonSale only\\! 🌙\n\n" +
  "I can't help with Bitcoin, Solana, sports, or weather\\. But ask me anything about presales, fair launches, token vesting, KYC, fees, or token tools — and I'll be all in\\! 🚀\n\n" +
  "What MoonSale question can I help with\\?";

const SPECIFIC_PRESALE_REPLY = [
  "🔍 Looking for a specific presale\\? You got it\\!",
  "",
  "I don't have details about individual projects in my brain, but MoonSale's platform does\\!",
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

const SMALL_TALK_PATTERNS = [
  /^how\s*(are|r)\s*you\??$/i,
  /^how\s*(are|r)\s*(you|u)\??$/i,
  /^how\s*ru\??$/i,
  /^kya\s+haal\s+hai\??$/i,
  /^kaise\s+ho\??$/i,
  /^gimana\s+kabar\??$/i,
  /^apa\s+kabar\??$/i,
];

const CONTEXT_CARRY_PREFIX_RE = /^(and|also|then|plus|so|now|ok|okay|alright|and if|if so|what about|how about|and what about)\b[,:]?\s*/i;
const CONTEXT_CARRY_HINT_RE = /\b(withdraw|penalty|refund|deadline|claim|fee|fees|rate|price|softcap|hardcap|liquidity|lock|live|vesting|eligibility|scanner|deploy|finalize|failed|fail|whitelist|min|max)\b/i;



const PROJECT_TERM_STOPWORDS = new Set([
  "presale", "fair", "launch", "status", "listed", "moon", "moonsale",
  "live", "upcoming", "filled", "failed", "cancelled", "canceled", "ended",
  "current", "official", "listing", "source", "project", "projects", "token",
  "tokens", "app", "www", "https", "http", "details", "detail",
]);

const GENERIC_QUERY_STOPWORDS = new Set([
  "what", "is", "this", "thi", "that", "about", "tell", "me", "please",
  "can", "you", "i", "it", "we", "do", "how", "why", "when", "where",
  "which", "who", "are", "am", "to", "for", "of", "on", "in", "a", "an",
  "the", "group", "grp", "chat", "channel", "chanel", "community", "purpose", "topic",
]);

const RESERVED_GENERIC_SINGLE_TERMS = new Set([
  "moonsale", "presale", "fairlaunch", "fair", "launch", "tokenomics",
  "fees", "refund", "refunds", "liquidity", "vesting", "audit", "kyc",
  "wallet", "metamask", "support", "help", "docs", "whitepaper", "link",
]);

const DOMAIN_TOPIC_TERMS = new Set([
  "sale", "presale", "launch", "fair", "rate", "price", "softcap", "hardcap",
  "refund", "refunds", "deadline", "claim", "claims", "withdraw", "penalty",
  "liquidity", "lock", "vesting", "token", "tokens", "scanner", "eligibility",
  "failed", "fails", "failure", "difference", "vs", "min", "max", "fee", "fees",
]);

const GENERIC_PRESALE_BROWSE_RESPONSE = `
🚀 *Browse Live Presales on MoonSale*

Instead of listing specific projects, I'm pointing you to the official marketplace where you can explore all presales yourself:

👉 [Browse All Presales](https://www.moonsale.app/presale) — Live & upcoming launches
👉 [Browse Fair Launches](https://www.moonsale.app) — No fixed price launches

*What you'll find there:*
✅ Real-time status (live, upcoming, ended)
✅ Hard & soft caps for each project
✅ Team info & audit status
✅ Community links & tokenomics
✅ One-click investment interface

💡 *Pro tip:* Always DYOR before investing. Check audits, team credentials, and community sentiment!

🔍 *Want specific presale info?* Give me a project name and I'll help you find details!
`.trim();

const GROUP_INFO_REPLY = [
  "Welcome\\! 👋 This group is for the *MoonSale Community*\\.",
  "",
  "🚀 *What is MoonSale\\?*",
  "MoonSale is a launchpad for presales, fair launches, token lock, vesting, and token tools\\.",
  "",
  "*Quick links:*",
  "🏠 [moonsale\\.app](https://moonsale.app)",
  "📖 [Investor Docs](https://www.moonsale.app/investor-docs)",
  "",
  "Ask me anything about MoonSale features and I will help\\! 💬",
].join("\n");

const MOONSALE_OVERVIEW_REPLY = [
  "MoonSale is a crypto launchpad for presales and fair launches\\.",
  "",
  "It also includes token lock, token vesting, token generator, token scanner, and KYC\\/audit resources\\.",
  "",
  "🔗 Start here: [moonsale\\.app](https://moonsale.app)",
].join("\n");

const SMALL_TALK_REPLY = [
  "I'm doing great and ready to help with MoonSale\\!",
  "",
  "Ask me anything about:",
  "• Creating a presale",
  "• Creating a fair launch",
  "• Token generator",
  "• Vesting, lock, and fees",
].join("\n");

const CREATE_FAIR_LAUNCH_GUIDE_REPLY = [
  "To create a fair launch:",
  "",
  "1\\) Open [moonsale\\.app/create\\-fair\\-launch](https://www.moonsale.app/create-fair-launch)",
  "2\\) Connect wallet and select token",
  "3\\) Set token pool, softcap, min\\/max buy, liquidity, and timeline",
  "4\\) Deploy contract and pay listing fee",
  "5\\) Share listing and finalize after sale end",
].join("\n");

const CREATE_TOKEN_GUIDE_REPLY = [
  "To create a token on MoonSale:",
  "",
  "1\\) Open [moonsale\\.app/create\\-token](https://www.moonsale.app/create-token)",
  "2\\) Set token name, symbol, supply, and decimals",
  "3\\) Deploy token contract from your wallet",
  "4\\) Then create a presale at [moonsale\\.app/create](https://www.moonsale.app/create)",
].join("\n");

const RECEIPT_EXTRACTION_ERROR_REPLY = [
  "If you see *Could not extract presale address from receipt*:",
  "",
  "1\\) Ensure both wallet confirmations were completed",
  "2\\) Wait for final transaction confirmation on chain",
  "3\\) Check explorer logs for presale creation event",
  "4\\) Refresh My Launches and try again",
  "5\\) If still missing, share tx hash + token address with support",
  "",
  "Helpful pages:",
  "• [Create Presale](https://www.moonsale.app/create)",
  "• [Developer Docs](https://www.moonsale.app/developer-docs)",
].join("\n");

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

function normalizeLoose(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIncomingQuery(text) {
  return String(text || "")
    .replace(/@[a-zA-Z0-9_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSmallTalkQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;
  return SMALL_TALK_PATTERNS.some(p => p.test(q));
}

function isContextCarryForwardQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;
  if (/^\/[a-z0-9_]+/.test(q)) return false;
  if (isFollowUpLinkRequest(q)) return false;
  if (CONTEXT_CARRY_PREFIX_RE.test(q)) return true;

  const tokens = tokenizeSimple(q);
  if (tokens.length <= 4 && CONTEXT_CARRY_HINT_RE.test(q)) return true;
  if (tokens.length <= 3 && /\b(it|that|this|same)\b/.test(q)) return true;

  return false;
}

function buildContextualizedQuery(query, context) {
  const q = normalizeIncomingQuery(query);
  const topic = normalizeIncomingQuery(context?.lastTopic || "");
  if (!q || !topic) return q;

  const tail = q.replace(CONTEXT_CARRY_PREFIX_RE, "").trim() || q;
  return `${topic} ${tail}`.replace(/\s+/g, " ").trim();
}

function isCreateFairLaunchQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (/\bhow\s+do\s+i\s+create\s+fair\s*launch\b/.test(q)) return true;
  if (/\bcreate\s+fair\s*launch\b/.test(q)) return true;
  if (/\bfair\s*launch\s+kaise\s+(banau|banao|banaye|create)\b/.test(q)) return true;
  if (/\b(gimana|cara)\b.*\b(bikin|buat|create)\b.*\bfair\s*launch\b/.test(q)) return true;

  return false;
}

function isCreateTokenQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (/\bhwo\s+to\s+create\s+token\b/.test(q)) return true;
  if (/\bhow\s+do\s+i\s+create\s+token\b/.test(q)) return true;
  if (/\bcreate\s+token\b/.test(q)) return true;
  if (/\btoken\s+generator\b/.test(q)) return true;
  if (/\btoken\s+kaise\s+(banau|banao|banaye|create)\b/.test(q)) return true;
  if (/\b(gimana|cara)\b.*\b(bikin|buat|create)\b.*\btoken\b/.test(q)) return true;

  return false;
}

function isReceiptExtractionErrorQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  return /could\s+not\s+extract\s+presale\s+address\s+from\s+receipt/.test(q)
    || /extract\s+presale\s+address/.test(q)
    || /presale\s+address\s+from\s+receipt/.test(q);
}

function isGroupAboutQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (/^(group|grp|chat|channel|chanel|community)\s+about\??$/.test(q)) return true;
  if (/^(this|thi|dis)?\s*(group|grp|chat|channel|chanel|community)\??$/.test(q)) return true;
  if (/^(group|grp|chat|channel|chanel|community)\s+info\b/.test(q)) return true;
  if (/^tell\s+me\s+about\s+(this\s+)?(group|grp|chat|channel|chanel|community)\??$/.test(q)) return true;
  if (/^what\s+(is\s+)?(this|thi|dis)?\s*(group|grp|chat|channel|chanel|community)\s+about\??$/.test(q)) return true;
  if (/^(what|wht|wat|whats|wats)\s+(is\s+)?(this|thi|dis)?\s*(group|grp|chat|channel|chanel|community)\??$/.test(q)) return true;
  if (/^what\s+(is\s+)?this\s+about\??$/.test(q)) return true;

  const tokens = q.split(" ");
  const hasGroupWord = tokens.some(t => ["group", "grp", "chat", "channel", "chanel", "community"].includes(t));
  const hasAboutWord = tokens.some(t => ["about", "purpose", "topic", "abt"].includes(t));
  const hasQuestionCue = tokens.some(t => [
    "what", "wht", "wat", "whats", "wats", "this", "thi", "dis",
    "about", "abt", "info", "purpose", "topic", "intro", "pls", "please",
  ].includes(t));

  if (hasGroupWord && hasQuestionCue && tokens.length <= 6) return true;

  return hasGroupWord && hasAboutWord;
}

function isMoonSaleOverviewQuery(query) {
  const q = normalizeLoose(query);
  if (!q) return false;

  if (
    /^what\s+is\s+moonsale(\s+about)?\??$/.test(q)
    || /^tell\s+me\s+about\s+moonsale\??$/.test(q)
    || /^what\s+is\s+moon\s+sale(\s+about)?\??$/.test(q)
  ) {
    return true;
  }

  const tokens = q.split(" ");
  const hasMoonSale = tokens.includes("moonsale") || (tokens.includes("moon") && tokens.includes("sale"));
  const hasOverviewCue = tokens.some(t => [
    "about", "abt", "info", "intro", "overview", "what", "tell", "pls", "please",
  ].includes(t));

  if (hasMoonSale && hasOverviewCue) return true;
  if (hasMoonSale && tokens.length <= 2) return true;

  return false;
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

  // Don't treat generic presale/launch terms as specific queries
  // These should go to browse page instead
  const isGenericBrowseQuery = /^(launch|presale|fair\s*launch?|fair|browse|show|list)$/i.test(q);
  if (isGenericBrowseQuery) return false;

  // Don't match queries that are clearly community/about context.
  if (isGroupAboutQuery(query)) return false;
  if (isMoonSaleOverviewQuery(query)) return false;

  const terms = getProjectLookupTerms();
  const meaningfulTokens = queryTokens.filter(t => (
    t.length >= 3
    && !PROJECT_TERM_STOPWORDS.has(t)
    && !RESERVED_GENERIC_SINGLE_TERMS.has(t)
    && !GENERIC_QUERY_STOPWORDS.has(t)
  ));
  if (!meaningfulTokens.length) return false;

  const projectCandidateTokens = meaningfulTokens.filter(t => !DOMAIN_TOPIC_TERMS.has(t));
  if (!projectCandidateTokens.length) return false;

  const hasProjectToken = projectCandidateTokens.some(t => terms.has(t));
  const topIsProjectLookup = !!topResult && Array.isArray(topResult.tags) && topResult.tags.includes("project_lookup");

  const singleToken = queryTokens.length === 1;
  const singleTokenProjectLike =
    singleToken
    && !RESERVED_GENERIC_SINGLE_TERMS.has(queryTokens[0])
    && !DOMAIN_TOPIC_TERMS.has(queryTokens[0]);
  const asksSpecificDetail = /\b(status|details?|price|hardcap|softcap|buy|invest|claim|live|cancelled|canceled|upcoming|filled|failed)\b/.test(q);

  if (hasProjectToken) return true;
  if (singleTokenProjectLike && terms.has(queryTokens[0])) return true;
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
      lastEffectiveQuery: "",
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

function rememberChatContext(chatId, query, answer, topResult, effectiveQuery = "") {
  const ctx = getChatContext(chatId);

  const links = [];
  if (topResult?.source && /^https?:\/\//i.test(topResult.source)) {
    links.push(topResult.source);
  }
  links.push(...extractUrls(answer));

  const uniqueLinks = [...new Set(links)];

  const normalizedQuery = normalizeLoose(query);
  const topTags = new Set(topResult?.tags || []);
  const topIsProjectLookup = topTags.has("project_lookup");
  const queryLooksProjectToken = /^[a-z0-9_-]{3,20}$/.test(normalizedQuery);
  const useTopTitle = !!topResult?.title && (!topIsProjectLookup || queryLooksProjectToken);

  ctx.lastQuery = query;
  ctx.lastEffectiveQuery = effectiveQuery || query;
  ctx.lastTopic = (useTopTitle ? topResult.title : query || "").trim();
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

function sanitizeReplyText(text) {
  return String(text || "").replace(/[—–]/g, ",");
}

const GREETING_RESPONSES = [
  "Hey\\! 👋 I'm the MoonSale Assistant\\. Ask me anything about the platform\\!\\n\\nTry: What is MoonSale\\? or How do I create a presale\\?",
  "Yo\\! 🌙 MoonSale Assistant here\\. Ready to talk presales, fair launches, vesting, fees — you name it\\!",
  "Sup\\! 🚀 Let's chat about MoonSale\\. What do you want to know\\?",
  "Hey there\\! 💬 I'm your MoonSale bot\\. Ask me about launches, tokens, locks, or anything launchpad\\!",
  "Hola\\! 👋 MoonSale Assistant at your service\\. What's on your mind\\?",
];

export function getRandomGreeting() {
  return GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
}

function getContextualTip(query, answerKind) {
  const q = String(query || "").toLowerCase();
  
  // Only add tips for answer/presale_guard responses, not greetings, off-topic, etc.
  if (!["answer", "presale_guard"].includes(answerKind)) return "";
  
  // Check what the user is asking about to determine relevant tip
  const isAskingAboutCreating = /\b(create|how\s+to\s+make|how\s+do\s+i|start|launch)\b/.test(q);
  const isAskingAboutPresale = /\bpresale\b/i.test(q);
  const isAskingAboutFairLaunch = /\b(fair\s*launch|fairaunch)\b/i.test(q);
  const isAskingAboutFees = /\b(fee|cost|price)\b/i.test(q);
  const isAskingAboutVesting = /\bvesting\b/i.test(q);
  const isAskingAboutLock = /\b(lock|liquidity)\b/i.test(q);
  const isAskingAboutToken = /\b(token|create.*token)\b/i.test(q) && !isAskingAboutCreating;
  
  if (isAskingAboutCreating && isAskingAboutPresale) {
    return "\n\n💡 Ready to create\\? Go to [moonsale\\.app/create](https://www.moonsale.app/create)";
  }
  if (isAskingAboutCreating && isAskingAboutFairLaunch) {
    return "\n\n💡 Ready to launch\\? Check [moonsale\\.app/create\\-fair\\-launch](https://www.moonsale.app/create-fair-launch)";
  }
  if (isAskingAboutFees) {
    return "\n\n💡 See the full [fee breakdown](https://www.moonsale.app/fees)";
  }
  if (isAskingAboutVesting) {
    return "\n\n💡 Set up vesting with the [Token Vesting tool](https://www.moonsale.app/vesting)";
  }
  if (isAskingAboutLock) {
    return "\n\n💡 Use the [Token Lock tool](https://www.moonsale.app/lock)";
  }
  if (isAskingAboutToken) {
    return "\n\n💡 Create tokens with the [Token Generator](https://www.moonsale.app/create-token)";
  }
  
  return "";
}


export function escape(text) {
  return String(text || "").replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

export function formatAnswer(text) {
  let out = String(text || "");

  // Normalize typographic dashes so Telegram output looks cleaner.
  out = out.replace(/[—–]/g, ",");

  out = out.replace(
    /📄 (Source|More info): (https?:\/\/\S+)/g,
    "📄 [More info]($2)"
  );

  out = escape(out);

  out = out.replace(/📄 \[More info\]\((https?[^)]+)\)/g,
    (_, url) => `📄 [More info](${url})`
  );

  // Note: Pro tips are now added in buildAssistantReply instead, 
  // so formatAnswer doesn't add them automatically

  if (out.length > 3800) {
    out = out.slice(0, 3800) + "\\.\\.\\.\n\n📄 [Read more](https://www.moonsale.app)";
  }

  return out;
}

function markdownToPlainText(text) {
  let out = String(text || "");

  out = out.replace(/\\([_*[\]()~`>#+\-=|{}.!\\])/g, "$1");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1: $2");
  out = out.replace(/[*_~`]/g, "");
  out = out.replace(/\r/g, "");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

function renderReplyText(text, outputFormat = "telegram") {
  const safe = sanitizeReplyText(text);
  if (outputFormat === "plain") {
    return markdownToPlainText(safe);
  }
  return safe;
}

export function buildAssistantReply(chatId, query, options = {}) {
  const outputFormat = String(options?.format || "telegram").toLowerCase() === "plain"
    ? "plain"
    : "telegram";
  const respond = (kind, text) => ({ kind, text: renderReplyText(text, outputFormat) });

  const q = normalizeIncomingQuery(query);
  const context = getChatContext(chatId);
  const hasFreshContext = context.updatedAt && (Date.now() - context.updatedAt <= FOLLOW_UP_CONTEXT_TTL_MS);

  const shouldCarryContext = hasFreshContext && context.lastTopic && isContextCarryForwardQuery(q);
  const effectiveQuery = shouldCarryContext
    ? buildContextualizedQuery(q, context)
    : q;
  const lastTopicLooksProjectToken = /^[a-z0-9_-]{3,20}$/.test(normalizeLoose(context.lastTopic || ""));
  const shouldBypassPresaleGuard = shouldCarryContext && !lastTopicLooksProjectToken;
  const isGenericWorkflowQuestion = /\b(if|when)\b.*\b(sale|presale|launch)\b.*\b(fail|fails|failed)\b|\b(sale|presale|launch)\b.*\bfailed\b.*\bwhat\s+happens\b|\btokens\s+for\s+sale\b.*\btokens\s+for\s+liquidity\b|\bsale\s+vs\s+liquidity\s+tokens?\s+difference\b/.test(normalizeLoose(effectiveQuery));

  if (!q) {
    return respond("greeting", getRandomGreeting());
  }

  if (isGreeting(q)) {
    return respond("greeting", getRandomGreeting());
  }

  if (isSmallTalkQuery(q)) {
    return respond("smalltalk", escape(SMALL_TALK_REPLY));
  }

  if (isReceiptExtractionErrorQuery(q)) {
    return respond("deploy_troubleshoot", RECEIPT_EXTRACTION_ERROR_REPLY);
  }

  if (isCreateTokenQuery(q)) {
    return respond("token_create_guide", CREATE_TOKEN_GUIDE_REPLY);
  }

  if (isCreateFairLaunchQuery(q)) {
    return respond("fair_launch_create_guide", CREATE_FAIR_LAUNCH_GUIDE_REPLY);
  }

  if (isOffTopic(q)) {
    return respond("offtopic", OFF_TOPIC_REPLY);
  }

  if (isGroupAboutQuery(q)) {
    return respond("group_info", GROUP_INFO_REPLY);
  }

  if (isMoonSaleOverviewQuery(q)) {
    return respond("overview", MOONSALE_OVERVIEW_REPLY);
  }

  if (isFollowUpLinkRequest(q) && hasFreshContext && context.lastLink) {
    const topicText = context.lastTopic ? ` (${context.lastTopic})` : "";
    const raw = `Here is the exact link from your previous topic${topicText}:\n📄 Source: ${context.lastLink}`;
    const tone = detectTone(q);
    return respond("followup", formatAnswer(styleAnswer(raw, tone)));
  }

  // Check for generic presale/launch browse queries
  const isGenericBrowseQuery = /^(launch|presale|fair\s*launch?|fair|browse|show|list)$/i.test(q);
  if (isGenericBrowseQuery) {
    rememberChatContext(
      chatId,
      q,
      GENERIC_PRESALE_BROWSE_RESPONSE,
      { title: "Browse presales", source: "https://moonsale.app/presale" },
      effectiveQuery
    );
    return respond("presale_browse", GENERIC_PRESALE_BROWSE_RESPONSE);
  }

  if (!shouldBypassPresaleGuard && !isGenericWorkflowQuestion && isSpecificPresaleQuery(effectiveQuery, null)) {
    rememberChatContext(
      chatId,
      q,
      SPECIFIC_PRESALE_REPLY,
      { title: "Presale listings", source: "https://moonsale.app/presale" },
      effectiveQuery
    );

    return respond("presale_guard", SPECIFIC_PRESALE_REPLY);
  }

  const engine = getEngine();
  const raw = engine.answer(effectiveQuery);

  // Final safety net: never expose specific listing details directly.
  const leaksSpecificListing = /\bis listed on moonsale as\b|\bcurrent status:\b|\bofficial listing:\b/i.test(raw);
  if (leaksSpecificListing) {
    rememberChatContext(
      chatId,
      q,
      SPECIFIC_PRESALE_REPLY,
      { title: "Presale listings", source: "https://moonsale.app/presale" }
    );
    return respond("presale_guard", SPECIFIC_PRESALE_REPLY);
  }

  if (raw.includes("don't have specific info")) {
    return respond("fallback", FALLBACK);
  }

  rememberChatContext(chatId, q, raw, null, effectiveQuery);

  const tone = detectTone(q);
  const styled = styleAnswer(raw, tone);
  const formattedText = formatAnswer(styled);
  const tip = getContextualTip(effectiveQuery, "answer");
  
  return respond("answer", formattedText + tip);
}

export function resolveCommandText(command, options = {}) {
  const outputFormat = String(options?.format || "telegram").toLowerCase() === "plain"
    ? "plain"
    : "telegram";

  const cmd = String(command || "").toLowerCase();
  if (cmd === "/start") return renderReplyText(WELCOME, outputFormat);
  if (cmd === "/help") return renderReplyText(HELP, outputFormat);
  if (cmd === "/links") return renderReplyText(LINKS, outputFormat);
  if (cmd === "/about") return renderReplyText(ABOUT, outputFormat);
  return "";
}

export function parseTelegramCommand(text) {
  const m = String(text || "").trim().match(/^\/(start|help|links|about|stopaibot|startaibot)(?:@[a-zA-Z0-9_]+)?\b/i);
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
