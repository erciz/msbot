/**
 * MoonSale Smart Search Engine
 * ==============================
 * Pure Node.js — no AI, no API, no GPU.
 * TF-IDF scoring + fuzzy matching + tag boosting.
 *
 * Can be imported by bot.js or run standalone to test:
 *   npm run search
 */

import fs   from "fs";
import path from "path";
import readline from "readline";

const KB_FILE = "./moonsale_data/knowledge_base.json";

// ── Stop words ────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","is","it","in","on","of","to","do","be","was","are",
  "for","and","or","but","not","what","how","when","where","who","why",
  "can","i","my","me","you","your","we","they","this","that","will",
  "with","from","have","has","had","does","did","would","could","should",
  "at","by","up","so","if","as","no","yes","tell","about","please",
  "help","need","want","know","give","show","get","just","make","use",
  "am","been","its","also","then","than","there","their","which","more",
  "hey","yo","sup","pls","quick","question","wondering","curious","kindly",
  "bro","bruh","wtf","omg","idk","fr","gm","anon","pls","plz","wtfffff",
]);

const QUERY_NORMALIZATION_RULES = [
  [/\btokonomics\b|\btokanomics\b|\btokenomiks\b/gi, "tokenomics"],
  [/\bassistent\b|\bassitstant\b|\bassistent\b/gi, "assistant"],
  [/\bmoonsale\s+app\b/gi, "moonsale"],
  [/\bmoon\s+sale\b/gi, "moonsale"],
  [/\bwen\b/gi, "when"],
  [/\bwats\b|\bwhats\b|\bwat's\b|\bwhts\b/gi, "what is"],
  [/\bpanelty\b|\bpenelty\b|\bpanalty\b/gi, "penalty"],
  [/\beligiblity\b|\beligibility\b|\beligiblity\b|\beligibity\b/gi, "eligibility"],
  [/\bresrves\b|\breserves\b/gi, "reserves"],
  [/\bliq\s*pool\b/gi, "liquidity pool"],
  [/\bstart\s*over\b/gi, "start over"],
  [/\breview\s*&\s*deploy\b/gi, "review deploy"],
  [/\bcant\b|\bcan t\b/gi, "cannot"],
  [/\bdidnt\b|\bdidn t\b/gi, "did not"],
  [/\bdont\b|\bdon t\b/gi, "do not"],
  [/\bconected\b|\bconected\b|\bconect\b/gi, "connected"],
  [/\bparticipte\b/gi, "participate"],
  [/\bmetamaskk\b/gi, "metamask"],
  [/\bwalletconnect\b/gi, "wallet connect"],
  [/\bfairlaunch\b/gi, "fair launch"],
  [/\bpinksale\b/gi, "pinksale"],
  [/\bcntract\b|\bconract\b/gi, "contract"],
  [/\bwhtepaper\b|\bwhitepapr\b/gi, "whitepaper"],
  [/\bpresell\b|\bpre sale\b/gi, "presale"],
  [/\bhwo\b/gi, "how"],
  [/\bliquidty\b|\bliqudity\b|\bliqidity\b/gi, "liquidity"],
  [/\bwht\b/gi, "what"],
  [/\bwat\b/gi, "what"],
  [/\bthi\b|\bdis\b/gi, "this"],
  [/\bgrp\b|\bgrup\b/gi, "group"],
  [/\bchanel\b/gi, "channel"],
  [/\babt\b/gi, "about"],
  [/\bhow\s+r\s+u\b/gi, "how are you"],
  [/\bplz\b|\bpls\b/gi, "please"],
  [/\bwtf+\b|\bomg+\b|\bbruh\b|\bbro\b|\blmao\b|\blol\b|\bidk\b/gi, " "],
  [/\bur\b/gi, "your"],
  [/\bu\b/gi, "you"],
  [/\br\b/gi, "are"],
];

function normalizeUserQuery(text) {
  let out = String(text || "").toLowerCase();
  out = out.replace(/@[a-z0-9_]+/g, " ");
  for (const [pattern, replacement] of QUERY_NORMALIZATION_RULES) {
    out = out.replace(pattern, replacement);
  }
  return out
    .replace(/[^a-z0-9\s:/._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Tokeniser ─────────────────────────────────────────────────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function bigrams(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]} ${tokens[i+1]}`);
  }
  return out;
}

// ── Levenshtein (edit distance) ───────────────────────────────────────────────
function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length < b.length) [a, b] = [b, a];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j++) {
      curr.push(Math.min(
        prev[j + 1] + 1,
        curr[j] + 1,
        prev[j] + (a[i] !== b[j] ? 1 : 0),
      ));
    }
    prev = curr;
  }
  return prev[b.length];
}

function fuzzyScore(a, b) {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return Math.max(0, 1 - levenshtein(a, b) / maxLen);
}

const SOURCE_BASE_PRIORITY = Object.freeze({
  custom_qa: 0.95,
  manual_qa: 0.9,
  custom_variant: 0.78,
  manual_variant: 0.72,
  website_listing: 0.68,
  website_listing_variant: 0.62,
  website_faq: 0.56,
  website_card: 0.54,
  website_variant: 0.45,
  website_chunk: 0.1,
  scraped_chunk: 0.1,
  qa_other: 0.2,
  other: 0,
});

// ── SearchEngine class ────────────────────────────────────────────────────────
export class SearchEngine {
  constructor(kbPath = KB_FILE) {
    if (!fs.existsSync(kbPath)) {
      throw new Error(`Knowledge base not found at ${kbPath}. Run: npm run build`);
    }
    const raw      = JSON.parse(fs.readFileSync(kbPath, "utf8"));
    this.entries   = raw.entries;
    this.tagIndex  = raw.tagIndex;
    this._buildIndex();
  }

  _buildIndex() {
    // Tokenise all documents
    this.docTokens = this.entries.map(e => {
      const extraQuestions = Array.isArray(e.questions) ? e.questions.join("\n") : "";
      const combinedText = [e.text || "", extraQuestions].filter(Boolean).join("\n");
      const toks = tokenize(combinedText);
      return [...toks, ...bigrams(toks)];
    });

    // Document frequency
    const df = {};
    for (const toks of this.docTokens) {
      for (const tok of new Set(toks)) {
        df[tok] = (df[tok] || 0) + 1;
      }
    }

    // IDF
    const N = this.entries.length;
    this.idf = {};
    for (const [tok, freq] of Object.entries(df)) {
      this.idf[tok] = Math.log((N + 1) / (freq + 1)) + 1;
    }

    // Per-doc token sets (for fuzzy lookup)
    this.docTokenSets = this.docTokens.map(toks => new Set(toks));
    this.docTokenLists = this.docTokens.map(toks => [...new Set(toks)]);

    // Precompute title and question token sets for faster question matching
    this.titleTokenSets = this.entries.map(e => new Set(tokenize(e.title || "")));
    this.questionTokenSets = this.entries.map(e =>
      Array.isArray(e.questions)
        ? e.questions.map(q => new Set(tokenize(q)))
        : []
    );
  }

  _tfidf(queryTokens, docIdx) {
    const toks  = this.docTokens[docIdx];
    if (!toks.length) return 0;
    const freq  = {};
    for (const t of toks) freq[t] = (freq[t] || 0) + 1;
    const total = toks.length;
    let score   = 0;
    for (const qt of queryTokens) {
      const tf  = (freq[qt] || 0) / total;
      const idf = this.idf[qt] || 1;
      score += tf * idf;
    }
    return score;
  }

  _fuzzyBonus(queryTokens, docIdx) {
    const candidates = this.docTokenLists[docIdx];
    const docSet     = this.docTokenSets[docIdx];
    let bonus = 0;
    for (const qt of queryTokens) {
      if (docSet.has(qt)) continue;   // exact already handled
      if (qt.length < 4) continue;    // too short to fuzzy-match meaningfully
      let best = 0;
      for (const c of candidates) {
        if (Math.abs(qt.length - c.length) > 3) continue; // quick skip
        const s = fuzzyScore(qt, c);
        if (s > best) best = s;
        if (best >= 0.95) break;
      }
      if (best >= 0.75) bonus += best * 0.3;
    }
    return bonus;
  }

  _tagBoost(queryTokens, entry) {
    const entryTags  = new Set(entry.tags || []);
    const queryText  = queryTokens.join(" ");
    const TAG_SIGNALS = {
      presale:     ["presale","hardcap","softcap","raise","sale"],
      hardcap:     ["hardcap","hard cap","filled","max"],
      contribution:["contribute","contribution","buy","invest","min","max"],
      status:      ["status","live","upcoming","filled","finalized","failed","cancelled","pending"],
      portfolio:   ["portfolio","my contributions","invested","my launches"],
      fair_launch: ["fair","fairlaunch"],
      price_discovery: ["price discovery","token pool","estimate"],
      fees:        ["fee","fees","cost","charge"],
      refund:      ["refund","refunds","back","money"],
      liquidity:   ["liquidity","lp","pancakeswap","uniswap","dex"],
      vesting:     ["vest","vesting","tge","unlock","cliff"],
      cliff:       ["cliff"],
      lock:        ["lock","locked","locking"],
      kyc:         ["kyc","verified","identity"],
      audit:       ["audit","audited","security"],
      withdraw:    ["withdraw","withdrawal","early"],
      penalty:     ["penalty"],
      investor:    ["invest","investor","contribute","participant"],
      scanner:     ["scanner","scan","honeypot","risk"],
      testnet:     ["testnet","testnets","sepolia"],
      whitelist:   ["whitelist","whitelisted"],
      claim:       ["claim","claimable"],
      moon:        ["moon","moon token","staked moon"],
      staking:     ["stake","staking","unstake","staker"],
      dao:         ["dao","proposal","vote","voting"],
      governance:  ["governance","proposal","voting"],
      roadmap:     ["phase","roadmap","planned","in progress"],
      whitepaper:  ["whitepaper"],
      wallet:      ["wallet","metamask","connect"],
      walletconnect: ["walletconnect"],
      support:     ["support","help","contact"],
      marketing:   ["marketing","promote","partner"],
      url:         ["url","website","official","real"],
      revenue:     ["revenue","earnings","staker pool","make money"],
      project_lookup: ["project","ticker","symbol","status","presale","fair launch"],
      website_data: ["link","url","website","listing"],
      identity:    ["who are you","ai assistant","bot"],
      comparison:  ["vs","versus","compare"],
    };
    let boost = 0;
    for (const [tag, signals] of Object.entries(TAG_SIGNALS)) {
      if (entryTags.has(tag) && signals.some(s => queryText.includes(s))) {
        boost += 0.5;
      }
    }
    // Curated entries get a baseline boost
    if (entry.type === "qa" || entry.type === "qa_variant") boost += 0.35;
    if (entry.type === "card") boost += 0.1;
    if (entry.type === "scraped") boost -= 0.05;
    return boost;
  }

  _sourcePriorityBoost(entry, intent) {
    const sourceTier = this._resolveSourceTier(entry);
    const tags = new Set(entry.tags || []);
    const source = String(entry?.source || "");
    const isWebsite = /^https?:\/\//i.test(source);

    let score = SOURCE_BASE_PRIORITY[sourceTier] ?? 0;

    const asksDocsKnowledge =
      intent.asksHow
      || intent.asksFee
      || intent.asksClaim
      || intent.asksRefund
      || intent.asksRefundApproval
      || intent.asksRefundDeadline
      || intent.asksSoftcapFailure
      || intent.asksHardcapDefinition
      || intent.asksMetaMask
      || intent.asksWallet
      || intent.asksRugPull
      || intent.asksRugPrevention
      || intent.asksMarketing
      || intent.asksRevenue
      || intent.asksRoadmap
      || intent.asksComparison
      || intent.asksIdentity
      || intent.asksDeployToken
      || intent.asksPortfolio;

    const asksWebsiteLookup =
      intent.asksSingleToken
      || intent.asksStatus
      || intent.asksLink
      || intent.asksUrl;

    if (asksDocsKnowledge) {
      if (sourceTier === "manual_qa" || sourceTier === "custom_qa") score += 1.0;
      if (sourceTier === "manual_variant" || sourceTier === "custom_variant") score += 0.65;
      if (sourceTier === "website_listing" || sourceTier === "website_listing_variant") score -= 0.55;
      if (sourceTier === "website_chunk" || sourceTier === "scraped_chunk") score -= 0.3;
    }

    if (asksWebsiteLookup) {
      if (sourceTier === "website_listing" || sourceTier === "website_listing_variant") score += 1.2;
      if (sourceTier === "website_faq" || sourceTier === "website_card" || sourceTier === "website_variant") score += 0.55;
      if ((sourceTier === "manual_qa" || sourceTier === "custom_qa") && intent.asksSingleToken) score -= 0.35;
      if (sourceTier === "website_chunk" || sourceTier === "scraped_chunk") score -= 0.25;
    }

    if (intent.asksSingleToken && tags.has("project_lookup") && isWebsite) score += 1.2;
    if (intent.asksStatus && tags.has("status")) score += 0.35;
    if (intent.asksLink && isWebsite) score += 0.4;
    if (intent.asksComparison && !tags.has("comparison")) score -= 0.2;

    return score;
  }

  _resolveSourceTier(entry) {
    const explicit = String(entry?.sourceType || "").trim();
    if (explicit) return explicit;

    const source = String(entry?.source || "");
    const tags = new Set(entry?.tags || []);
    const isWebsite = /^https?:\/\//i.test(source);

    if (entry?.type === "scraped") return "scraped_chunk";

    if (source === "manual") {
      if (entry?.type === "qa_variant") return "manual_variant";
      return "manual_qa";
    }

    if (isWebsite) {
      if (tags.has("project_lookup") && tags.has("website_data")) {
        if (entry?.type === "qa_variant") return "website_listing_variant";
        return "website_listing";
      }
      if (entry?.type === "qa_variant") return "website_variant";
      return "website_faq";
    }

    if (entry?.type === "qa" || entry?.type === "qa_variant" || entry?.answer) return "qa_other";

    return "other";
  }

  _detectIntent(query) {
    const q = (query || "").toLowerCase();
    const trimmed = q.trim();
    const reservedSingleTerms = new Set([
      "moonsale",
      "presale",
      "fairlaunch",
      "fair-launch",
      "tokenomics",
      "fees",
      "refund",
      "refunds",
      "marketing",
      "whitepaper",
      "vesting",
      "lock",
      "audit",
      "kyc",
      "wallet",
      "metamask",
    ]);
    const singleToken = /^[a-z0-9_-]{3,20}$/.test(trimmed) && !reservedSingleTerms.has(trimmed);

    return {
      asksFee: /\b(fee|fees|cost|costs|charge|charges|pricing|price)\b/.test(q),
      asksHow: /\b(how|workflow|steps|process|work|works)\b/.test(q),
      asksTestnet: /\b(testnet|testnets|sepolia)\b/.test(q),
      asksClaim: /\b(claim|claimable)\b/.test(q),
      asksRefund: /\b(refund|refunds|money\s*back)\b/.test(q),
      asksStatus: /\b(status|live|upcoming|ended|failed|filled|cancelled|canceled|finalized|pending)\b/.test(q),
      asksRoadmap: /\b(roadmap|phase\s*1|phase\s*2|phase\s*3|planned|in\s*progress)\b/.test(q),
      asksWallet: /\b(wallet|metamask|walletconnect|connect wallet)\b/.test(q),
      asksMetaMask: /\bmetamask\b/.test(q),
      asksMarketing: /\b(marketing|promote|partner|co-marketing)\b/.test(q),
      asksUrl: /\b(real url|official url|website|official site|moonsale url)\b/.test(q),
      asksLink: /\b(link|url|website|official site|whitepaper link|presale link)\b/.test(q),
      asksRevenue: /\b(revenue|make money|earnings|stakers?)\b/.test(q),
      asksIdentity: /\b(who are you|who are u|who r you|who r u|are you ai|are you an ai|ai assistant|chatbot|bot)\b/.test(q),
      asksComparison: /\b(vs|versus|compare|difference between)\b/.test(q),
      asksSingleToken: singleToken,
      asksHardcapDefinition: /^\s*what\s+is\s+(a\s+|the\s+)?hard\s*cap\b|^\s*what\s+is\s+(a\s+|the\s+)?hardcap\b/.test(q),
      asksRefundApproval: /\b(admin|approve|approval)\b/.test(q) && /\brefund\b/.test(q),
      asksSoftcapFailure: /\bsoft\s*cap|softcap\b/.test(q) && /\b(not\s+reached|not\s+met|fail|fails|failed)\b/.test(q),
      asksRefundDeadline: /\brefund\b/.test(q) && /\b(how\s+long|deadline|time\s+limit)\b/.test(q),
      asksRugPull: /\brug\s*pull\b/.test(q),
      asksRugPrevention: /\brug\s*pull\b/.test(q) && /\b(prevent|protection|avoid|safe)\b/.test(q),
      asksPortfolio: /\b(my contributions|invested|portfolio|track my investments)\b/.test(q),
      asksDeployToken: /\b(deploy a token|create token|token generator)\b/.test(q),
    };
  }

  _intentAdjust(query, entry, intent = this._detectIntent(query)) {
    const tags = new Set(entry.tags || []);
    const answer = this._extractAnswerText(entry).toLowerCase();
    const hasFeeText = /\b(fee|fees|cost|costs|charge|charges|pricing|\$100|2%)\b/.test(answer);

    let score = 0;

    if (intent.asksFee) {
      if (tags.has("fees") || tags.has("listing_fee")) score += 0.8;
      else if (hasFeeText) score += 0.45;
    } else {
      if (tags.has("fees") || tags.has("listing_fee")) score -= 0.45;
      if (hasFeeText && intent.asksHow) score -= 0.55;
    }

    if (intent.asksHow) {
      if (tags.has("how_it_works") || tags.has("investor") || tags.has("creator")) score += 0.25;
      if (answer.length >= 100) score += 0.15;
      if (!intent.asksFee && answer.length < 70) score -= 0.12;
    }

    if (intent.asksSoftcapFailure) {
      if (tags.has("softcap") || tags.has("refund")) score += 1.0;
      if (tags.has("hardcap")) score -= 0.9;
    }

    if (intent.asksRefundDeadline) {
      if (tags.has("refund") && /no deadline|any time/i.test(answer)) score += 1.0;
      if (tags.has("claim") && !tags.has("refund")) score -= 0.6;
    }

    if (intent.asksWallet) {
      if (tags.has("wallet") || tags.has("walletconnect") || tags.has("connect")) score += 0.85;
      if (tags.has("testnet") && !tags.has("wallet")) score -= 0.3;
    }

    if (intent.asksMetaMask) {
      if (tags.has("metamask") || /metamask/i.test(answer)) score += 1.1;
      if (/walletconnect/i.test(answer) && !/metamask/i.test(answer)) score -= 0.45;
    }

    if (intent.asksRugPull) {
      if (tags.has("security") || tags.has("liquidity") || tags.has("lock") || tags.has("risk")) score += 0.55;
      if (intent.asksRugPrevention && tags.has("refund")) score += 0.25;
    }

    if (intent.asksRugPrevention) {
      if (/liquidity lock|hard\/?soft caps|on-chain refunds|contract-enforced|lock/i.test(answer)) score += 0.85;
      if (/refund action|open the failed/i.test(answer)) score -= 0.45;
    }

    if (intent.asksMarketing) {
      if (tags.has("marketing") || tags.has("support")) score += 0.9;
    }

    if (intent.asksUrl) {
      if (tags.has("url") || tags.has("security")) score += 0.85;
      if (tags.has("revenue")) score -= 0.4;
    }

    if (intent.asksRevenue) {
      if (tags.has("revenue") || tags.has("fees") || tags.has("whitepaper")) score += 0.8;
      if (tags.has("refund") && !tags.has("revenue")) score -= 0.45;
    }

    if (intent.asksHardcapDefinition) {
      if (tags.has("hardcap")) score += 1.0;
      if (tags.has("fair_launch") && /no\./i.test(answer)) score -= 0.5;
    }

    if (intent.asksRefundApproval) {
      if (tags.has("refund") && /no\.|does not require admin approval|do not require admin/i.test(answer)) score += 0.95;
    }

    if (intent.asksPortfolio) {
      if (tags.has("portfolio") || tags.has("contribution")) score += 0.9;
    }

    if (intent.asksDeployToken) {
      if (tags.has("token_create") || tags.has("creator")) score += 0.9;
      if (tags.has("atomic") && !tags.has("token_create")) score -= 0.35;
    }

    if (intent.asksTestnet) {
      if (tags.has("testnet") || tags.has("chains") || tags.has("bnb") || tags.has("ethereum")) score += 0.65;
      else score -= 0.2;
    }

    if (intent.asksIdentity) {
      if (tags.has("identity") || tags.has("support") || tags.has("general")) score += 0.55;
    }

    if (intent.asksComparison) {
      if (tags.has("comparison")) score += 1.0;
      else if (tags.has("general")) score += 0.15;
    }

    if (intent.asksLink) {
      if (tags.has("url") || tags.has("whitepaper") || tags.has("support") || tags.has("website_data")) score += 0.75;
      if (tags.has("marketing")) score += 0.2;
    }

    if (intent.asksStatus && tags.has("status")) score += 0.4;

    if (intent.asksSingleToken) {
      if (tags.has("project_lookup")) score += 1.15;
      if (tags.has("fees") || tags.has("revenue")) score -= 0.4;
    }

    if (intent.asksClaim && tags.has("claim")) score += 0.5;
    if (intent.asksRefund && tags.has("refund")) score += 0.5;
    if (intent.asksRoadmap && (tags.has("roadmap") || tags.has("whitepaper"))) score += 0.55;

    score += this._sourcePriorityBoost(entry, intent);

    return score;
  }

  _questionTitleScore(queryTokenSet, docIdx) {
    if (!queryTokenSet || !queryTokenSet.size) return 0;

    const titleSet = this.titleTokenSets[docIdx];
    const questionSets = this.questionTokenSets[docIdx] || [];

    let best = 0;

    const scorePair = (a, b) => {
      if (!a || !b || !a.size || !b.size) return 0;
      let intersection = 0;
      for (const t of a) if (b.has(t)) intersection++;
      const union = a.size + b.size - intersection;
      return union ? intersection / union : 0;
    };

    best = Math.max(best, scorePair(queryTokenSet, titleSet));

    for (const set of questionSets) {
      const s = scorePair(queryTokenSet, set);
      if (s > best) best = s;
      if (best >= 0.95) break;
    }

    return best * 3.0; // Jaccard × weight
  }

  search(query, topK = 3) {
    const normalizedQuery = normalizeUserQuery(query);
    const queryWords = tokenize(normalizedQuery);
    const queryTokens = [
      ...queryWords,
      ...bigrams(queryWords),
    ];
    if (!queryTokens.length) return [];

    const intent = this._detectIntent(normalizedQuery);

    const queryTokenSet = new Set(queryWords);

    const scores = this.entries.map((entry, i) => ({
      score: (
        this._tfidf(queryTokens, i)
        + this._fuzzyBonus(queryTokens, i)
        + this._tagBoost(queryTokens, entry)
        + this._questionTitleScore(queryTokenSet, i)
        + this._intentAdjust(normalizedQuery, entry, intent)
      ),
      idx: i,
    }));

    scores.sort((a, b) => b.score - a.score);

    return scores
      .slice(0, topK)
      .filter(s => s.score > 0.05)
      .map(s => ({ ...this.entries[s.idx], _score: Math.round(s.score * 1000) / 1000 }));
  }

  _extractAnswerText(entry) {
    const raw = (entry?.answer || entry?.text || "").replace(/^Q:.*?\nA:\s*/s, "");
    return raw.trim();
  }

  _hasLexicalOverlap(normalizedQuery, entry) {
    const queryTokens = tokenize(normalizedQuery);
    if (!queryTokens.length) return false;

    const entryText = [entry?.question, entry?.title, this._extractAnswerText(entry)]
      .filter(Boolean)
      .join(" ");
    const entryTokens = new Set(tokenize(entryText));

    for (const t of queryTokens) {
      if (entryTokens.has(t)) return true;
    }
    return false;
  }

  _cleanFallbackText(text) {
    const cleaned = (text || "")
      .replace(/^PAGE:.*$/gmi, "")
      .replace(/^URL:.*$/gmi, "")
      .replace(/^CATEGORY:.*$/gmi, "")
      .replace(/^={4,}$/gmi, "")
      .replace(/^===\s*[^=]+\s*===$/gmi, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!cleaned) return "";

    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    const concise = sentences.slice(0, 2).join(" ");
    return concise.length > 420 ? `${concise.slice(0, 417)}...` : concise;
  }

  _getAnswerBucket(entry) {
    const tier = this._resolveSourceTier(entry);
    if (["manual_qa", "custom_qa", "manual_variant", "custom_variant"].includes(tier)) return "manual";
    if (["website_listing", "website_listing_variant"].includes(tier)) return "website_listing";
    if (["website_faq", "website_card", "website_variant"].includes(tier)) return "website_structured";
    if (["website_chunk", "scraped_chunk"].includes(tier)) return "website_chunk";
    if (entry?.type === "qa" || entry?.type === "qa_variant" || entry?.answer) return "qa_other";
    return "other";
  }

  _getAnswerPriorityOrder(intent) {
    const docsFirst =
      intent.asksHow
      || intent.asksFee
      || intent.asksClaim
      || intent.asksRefund
      || intent.asksRefundDeadline
      || intent.asksSoftcapFailure
      || intent.asksDeployToken
      || intent.asksPortfolio
      || intent.asksIdentity
      || intent.asksComparison;

    const websiteFirst = intent.asksSingleToken || intent.asksStatus || intent.asksLink || intent.asksUrl;

    if (websiteFirst && !docsFirst) {
      return ["website_listing", "website_structured", "manual", "qa_other", "website_chunk", "other"];
    }

    return ["manual", "website_structured", "qa_other", "website_listing", "website_chunk", "other"];
  }

  _selectBestAnswerCandidate(results, normalizedQuery, intent) {
    const isSingleToken = /^[a-z0-9_-]{3,20}$/.test(normalizedQuery);
    const baseFloor = isSingleToken ? 0.01 : 0.08;

    const candidates = results
      .filter(r => this._extractAnswerText(r).length > 20)
      .map(r => ({ ...r, _bucket: this._getAnswerBucket(r) }));

    if (!candidates.length) return null;

    const floors = {
      manual: baseFloor,
      website_structured: Math.max(0.01, baseFloor - 0.01),
      qa_other: baseFloor + 0.03,
      website_listing: isSingleToken || intent.asksStatus ? 0.01 : baseFloor + 0.06,
      website_chunk: baseFloor + 0.16,
      other: baseFloor + 0.2,
    };

    const order = this._getAnswerPriorityOrder(intent);
    for (const bucket of order) {
      const inBucket = candidates
        .filter(c => c._bucket === bucket)
        .sort((a, b) => b._score - a._score);

      if (!inBucket.length) continue;

      const minScore = floors[bucket] ?? baseFloor;
      const passing = inBucket.find(c => c._score >= minScore);
      if (passing) return passing;
    }

    return candidates.sort((a, b) => b._score - a._score)[0];
  }

  answer(query) {
    const normal = normalizeUserQuery(query);
    const intent = this._detectIntent(normal);

    const isGroupAboutIntent =
      /\b(this\s+)?(group|chat|channel|community)\b/.test(normal)
      && /\b(about|info|purpose|topic)\b/.test(normal)
      || /^(group|chat|channel|community)\s+(about|info)/.test(normal)
      || /^(this\s+)?(group|chat|channel)\??$/.test(normal);

    if (isGroupAboutIntent) {
      return (
        "This group is for MoonSale community support and launch guidance.\n\n" +
        "Ask me about presale creation, fair launch setup, token generation, vesting, lock, fees, refunds, and audits.\n\n" +
        "Main links:\n" +
        "• https://moonsale.app\n" +
        "• https://moonsale.app/create\n" +
        "• https://moonsale.app/create-fair-launch"
      );
    }

    const directRules = [
      {
        pattern: /^how\s+are\s+you\??$|^how\s+are\s+you\s+doing\??$/,
        answer: "I'm doing great and ready to help with MoonSale. Ask me anything about presales, fair launches, token tools, fees, refunds, or security.",
      },
      {
        pattern: /\bhow\s+do\s+i\s+create\s+fair\s*launch\b|\bcreate\s+fair\s*launch\b|\bfair\s*launch\s+kaise\s+(banau|banao|banaye|create)\b|\b(gimana|cara)\b.*\b(bikin|buat|create)\b.*\bfair\s*launch\b/,
        answer: "Create a fair launch at https://moonsale.app/create-fair-launch. Connect wallet, set token pool and softcap, set min and max buy plus timeline, deploy, then complete listing fee to publish.",
      },
      {
        pattern: /\bhow\s+do\s+i\s+create\s+token\b|\bhwo\s+to\s+create\s+token\b|\bcreate\s+token\b|\btoken\s+generator\b|\btoken\s+kaise\s+(banau|banao|banaye|create)\b|\b(gimana|cara)\b.*\b(bikin|buat|create)\b.*\btoken\b/,
        answer: "Create token at https://moonsale.app/create-token. Set name, symbol, supply, and decimals, deploy from wallet, then create presale at https://moonsale.app/create if needed.",
      },
      {
        pattern: /could\s+not\s+extract\s+presale\s+address\s+from\s+receipt|extract\s+presale\s+address\s+from\s+receipt/,
        answer: "This error usually means deploy transaction parsing failed. Check both wallet confirmations were completed, wait for final tx confirmation, open explorer logs to verify presale creation event, then refresh My Launches. If still failing, share tx hash, token address, and wallet with support.",
      },
      {
        pattern: /^what\s+is\s+moonsale\??$|^moonsale\??$|^tell\s+me\s+about\s+moonsale\??$/,
        answer: "MoonSale is a permissionless launchpad for BNB Chain and Ethereum where projects run presales or fair launches with on-chain refunds, automatic liquidity locking, and audited smart-contract protections.",
      },
      {
        pattern: /^what\s+is\s+presale\s+rate\??$|^presale\s+rate\??$/,
        answer: "Presale rate is the fixed token price set by the creator for contributions before listing. Example: 1 BNB = X tokens based on sale configuration.",
      },
      {
        pattern: /^what\s+is\s+fair\s*launch\??$|^fair\s*launch\??$/,
        answer: "Fair launch is a sale model where final token price is discovered from total funds raised versus total token pool, instead of a fixed presale price.",
      },
      {
        pattern: /^liquidity\s*lock\??$/,
        answer: "Liquidity lock means LP tokens are locked for a defined duration after successful finalization, reducing rug-pull risk.",
      },
      {
        pattern: /^token\s*scanner\??$|^what\s+is\s+token\s+scanner\??$/,
        answer: "Token scanner checks token safety-related signals such as ownership, blacklist behavior, liquidity conditions, and other launch eligibility factors.",
      },
      {
        pattern: /^claim\s+tokens?\??$|^when\s+can\s+i\s+claim\s+tokens?\??$/,
        answer: "Tokens are claimable after successful finalization, according to vesting settings. In no-vesting setup, claims open immediately after finalize.",
      },
      {
        pattern: /(?:\bsoft\s*cap\b|\bsoftcap\b).*\b(not\s+reached|not\s+met|fail|fails|failed)\b|\b(not\s+reached|not\s+met)\b.*(?:\bsoft\s*cap\b|\bsoftcap\b)/,
        answer: "If softcap is not reached, the sale fails and contributors can claim full refunds directly from the smart contract.",
      },
      {
        pattern: /\b(if|when)\b.*\b(sale|presale|fair\s*launch|launch)\b.*\b(fail|fails|failed)\b|\b(sale|presale|launch)\b.*\b(fail|fails|failed)\b.*\bwhat\s+happens\b/,
        answer: "If a sale fails (typically softcap not reached), contributors can claim full refunds directly from the smart contract.",
      },
      {
        pattern: /\brefund\b.*\b(how\s+long|deadline|time\s+limit)\b|\b(how\s+long|deadline|time\s+limit)\b.*\brefund\b/,
        answer: "MoonSale investor documentation states there is no deadline on refunds for failed or cancelled sales.",
      },
      {
        pattern: /\bmetamask\b/,
        answer: "Yes. MoonSale supports MetaMask for wallet connection on supported EVM networks.",
      },
      {
        pattern: /\btoken\s+failed\s+eligibility\s+check\b|\beligibility\s+check\s+failed\b|\bfailed\s+eligibility\b|\beligibility\b.*\bfailed\b/,
        answer: "A blocking eligibility rule failed. Review scanner output and resolve the specific blocked item before deploying.",
      },
      {
        pattern: /\bdex\s+pair\s+reserves\b.*\bexisting\s+liquidity\b|\bpair\s+has\s+existing\s+liquidity\b|\bexisting\s+liquidity\b.*\bblocked\b/,
        answer: "Deployment is blocked because an existing DEX pair already has liquidity. Remove that liquidity first or use a token without an already-liquid pair.",
      },
      {
        pattern: /\bprice\s+at\s+softcap\b.*\b0\.0+\b|\bsoftcap\s+price\b.*\b0\.0+\b/,
        answer: "A displayed 0.00000000 softcap price is usually UI rounding for a very small value. Fair-launch final price is still determined at finalization.",
      },
      {
        pattern: /\bwhat\s+happens\s+after\s+deploy\b.*\bfair\s*launch\b|\bafter\s+deploy\b.*\bfair\s*launch\b/,
        answer: "After deploy, tokens stay in contract, investors contribute until end time, creator finalizes if softcap is met, liquidity is added at fair price, and claims open based on vesting setup.",
      },
      {
        pattern: /\btokens\s+for\s+sale\b.*\btokens\s+for\s+liquidity\b|\bdifference\b.*\btokens\s+for\s+sale\b/,
        answer: "Tokens for Sale are for contributors. Tokens for Liquidity are for DEX pool creation at finalization.",
      },
      {
        pattern: /\bwithdraw\b.*\bpenalt(y|ies)\b|\bpenalt(y|ies)\b.*\bwithdraw\b/,
        answer: "Yes. You can withdraw contribution while sale is active, and a small penalty applies to reduce manipulation.",
      },
      {
        pattern: /\bunlocked\s+tokens\s+within\s+limit\b|\bplatform\s+limit\b.*\b20\s*%\b/,
        answer: "Post-deploy unlocked wallet balance must remain within platform max threshold. If it exceeds the limit, deployment is blocked.",
      },
      {
        pattern: /\bno\s+vesting\b|\bwithout\s+vesting\b/,
        answer: "No vesting means tokens are claimable immediately after successful finalization, instead of gradual unlocks.",
      },
      {
        pattern: /\bdraft\s+saved\b.*\bstart\s+over\b|\bstart\s+over\b.*\bdraft\b/,
        answer: "Draft means current setup is temporarily saved. Start over resets builder flow, so review all fields before deploying.",
      },
      {
        pattern: /\b(connect|connected)\b.*\bwallet\b.*\b(cannot|can\s*not|can't)\b.*\b(buy|contribute|invest)\b|\bbuy\s*button\b.*\bmissing\b/,
        answer: "If wallet is connected but buy button is missing, check the correct chain, sale status (must be Live), whitelist requirement, and min-max rules. Refresh once and reconnect wallet. If still blocked, wait for admin support with sale link + wallet address.",
      },
      {
        pattern: /\b(sent|contributed|bought|buy)\b.*\b(bnb|eth)\b.*\b(tokens?)\b.*\b(not|did\s+not)\b.*\b(show|arrive|receive)\b|\bclaimed\b.*\b0\s*tokens\b/,
        answer: "Contributed funds do not appear as tokens instantly. Tokens are claimable only after successful finalization and based on vesting schedule. If claim tx succeeded but wallet still shows zero, add token contract to wallet and verify the same contribution wallet is connected.",
      },
      {
        pattern: /\brug\s*pull\b.*\b(prevent|protection|avoid|safe)\b|\b(prevent|protection|avoid|safe)\b.*\brug\s*pull\b/,
        answer: "MoonSale reduces rug-risk with contract-enforced hard/soft caps, on-chain refunds on failed sales, and liquidity locking after successful finalization.",
      },
      {
        pattern: /\b(dev|admin)\b.*\b(dm|direct\s*message|message)\b.*\b(send|transfer)\b.*\b(bnb|eth|usdt)\b.*\b(whitelist|allocation)\b|\bsend\s+bnb\s+for\s+whitelist\b/,
        answer: "Treat that as a scam risk. Never send funds in DMs for whitelist or allocation. Only contribute through the official MoonSale sale page with your wallet connected.",
      },
      {
        pattern: /\bextend\b.*\bliquidity\s*lock\b.*\b(live|running|active|mode)\b|\bliquidity\s*lock\b.*\bextend\b.*\b(live|running|active|mode)\b|\blive\s*mode\b.*\bliquidity\s*lock\b|\bliquidity\s*lock\b.*\blive\s*mode\b/,
        answer: "Once a presale or fair launch contract is deployed and live, liquidity lock cannot be extended during live mode. You can extend or adjust lock only after finalizing the sale.",
      },
      {
        pattern: /^what\s+is\s+a\s+rug\s*pull\??$/,
        answer: "A rug pull is when project operators remove liquidity or abuse control to drain value, leaving investors exposed.",
      },
      {
        pattern: /\bwho\s+are\s+you\b|\bare\s+you\s+(an\s+)?ai(\s+assistant)?\b|\bai\s+assistant\b/,
        answer: "I am MoonSale's docs-and-data assistant. I answer from MoonSale website content and the project knowledge base.",
      },
      {
        pattern: /\bpinksale\b.*\bmoonsale\b|\bmoonsale\b.*\bpinksale\b/,
        answer: "I can only provide reliable MoonSale information. If you want, I can break down MoonSale's launch flow, fees, refunds, and security model so you can compare objectively.",
      },
      {
        pattern: /^link$|^link\s+please$|^link\s+of\s+that\s+please$|^give\s+me\s+link$|^send\s+link$/,
        answer: "Quick MoonSale links:\n• Main app: https://moonsale.app\n• Presales: https://moonsale.app/presale\n• Fair launches: https://moonsale.app/fair-launch\n• Whitepaper: https://moonsale.app/investors/whitepaper\n• Docs: https://moonsale.app/investor-docs",
      },
      {
        pattern: /\b(whitepaper)\b.*\b(link|url|website)\b|\b(link|url)\b.*\bwhitepaper\b/,
        answer: "MoonSale whitepaper: https://moonsale.app/investors/whitepaper",
      },
      {
        pattern: /\b(presale)\b.*\b(link|url|website)\b|\b(link|url)\b.*\bpresale\b/,
        answer: "MoonSale presale page: https://moonsale.app/presale",
      },
      {
        pattern: /\btokenomics\b.*\b(create|creator|link|tool|design)\b|\b(create|design)\b.*\btokenomics\b/,
        answer: "Tokenomics Creator tool: https://moonsale.app/tokenomics-creator",
      },
      {
        pattern: /^tokenomics$/,
        answer: "Tokenomics Creator tool: https://moonsale.app/tokenomics-creator",
      },
      {
        pattern: /\b(marketing\s+contact|contact\s+marketing|marketing\s+team)\b/,
        answer: "For MoonSale marketing, contact @moonsalemarketing and @maxis0.",
      },
      {
        pattern: /\b(can\s+i\s+trust|is\s+moonsale\s+safe|is\s+moonsale\s+trusted|trusted\s+platform)\b/,
        answer: "MoonSale uses audited contracts, on-chain refunds for failed sales, and automatic liquidity locking. Always do your own research before investing in any project.",
      },
      {
        pattern: /\b(community\s+happy|users\s+happy|feedback|reviews)\b/,
        answer: "I can't measure live user sentiment directly, but you can verify project status and activity on MoonSale listings and official channels.",
      },
      {
        pattern: /\b(wen\s+moon|when\s+moon|wen\s+lambo|when\s+lambo|100x|buy\s+or\s+no\s+buy)\b/,
        answer: "I cannot give financial advice or profit guarantees. I can help with verified MoonSale facts like sale status, tokenomics, vesting, liquidity lock, and refund conditions so you can make your own decision.",
      },
    ];

    for (const rule of directRules) {
      if (rule.pattern.test(normal)) return rule.answer;
    }

    if (/^(hi|hello|hey|yo|sup|whats up|what's up)$/.test(normal)) {
      return "Hey! Ask me anything about MoonSale, like fees, refunds, testnets, vesting, or fair launch setup.";
    }

    if (/^what\s+is\s+this\s+about\??$/.test(normal) || /^what\s+is\s+this\??$/.test(normal)) {
      return "MoonSale is a permissionless launchpad for BNB Chain and Ethereum where projects run presales or fair launches with on-chain refunds, liquidity locking, and investor protection rules.";
    }

    const results = this.search(normal, 12);
    const isSingleToken = /^[a-z0-9_-]{3,20}$/.test(normal);

    if (!results.length) {
      if (isSingleToken) {
        return (
          `I couldn't find a reliable MoonSale listing match for \"${normal.toUpperCase()}\" yet.\n\n` +
          "Try the full project name or check: https://moonsale.app/presale\n\nIf this is urgent, please wait for the admin team to reply in chat."
        );
      }

      return (
        "I don't have a verified answer for that yet. Please wait for the admin team to reply in chat.\n\n" +
        "Check the official docs:\n" +
        "• Investor docs: moonsale.app/investor-docs\n" +
        "• Developer docs: moonsale.app/developer-docs"
      );
    }

    const top = this._selectBestAnswerCandidate(results, normal, intent) || results[0];

    const qaHit = top && (top.type === "qa" || top.type === "qa_variant" || !!top.answer)
      ? top
      : null;

    const hasOverlap = qaHit ? this._hasLexicalOverlap(normal, qaHit) : false;

    if (qaHit && qaHit._score > (isSingleToken ? 0.01 : 0.08) && (hasOverlap || isSingleToken)) {
      let answer = this._extractAnswerText(qaHit);
      if (qaHit.source && qaHit.source.startsWith("http")) {
        answer += `\n\n📄 Source: ${qaHit.source}`;
      }
      return answer.trim();
    }

    if (!isSingleToken && !hasOverlap) {
      return (
        "I don't have a verified answer for that yet. Please wait for the admin team to reply in chat.\n\n" +
        "Check the official docs:\n" +
        "• Investor docs: moonsale.app/investor-docs\n" +
        "• Developer docs: moonsale.app/developer-docs"
      );
    }

    const concise = this._cleanFallbackText(this._extractAnswerText(top));
    if (!concise) {
      return "Found related info but not a clean verified answer. Please wait for the admin team to reply, and check moonsale.app directly in the meantime.";
    }

    let combined = concise;
    const source = top.source;
    if (source && source.startsWith("http")) {
      combined += `\n\n📄 More info: ${source}`;
    }
    return combined;
  }
}

// ── CLI test mode ─────────────────────────────────────────────────────────────
const IS_SEARCH_ENGINE_CLI =
  !!process.argv[1]
  && path.basename(process.argv[1]).toLowerCase() === "searchengine.js";

if (IS_SEARCH_ENGINE_CLI) {
  console.log("\n MoonSale Search Engine — Test Mode");
  console.log("=".repeat(50));

  let engine;
  try {
    engine = new SearchEngine();
    console.log(`  Loaded ${engine.entries.length} KB entries\n`);
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
    process.exit(1);
  }

  const testQuestions = [
    "What is MoonSale?",
    "how do i get refund if presale fails",
    "what fees do i pay to launch",
    "is liquidity locked",
    "how does vesting work",
    "can i withdraw early",
    "what chains are supported",
    "what is fair launch",
    "how do i create a token",
    "is moonsale audited",
  ];

  console.log("── Auto-testing sample questions ──\n");
  for (const q of testQuestions) {
    console.log(`Q: ${q}`);
    console.log(`A: ${engine.answer(q)}`);
    console.log("─".repeat(50));
  }

  // Interactive mode
  console.log("\n── Interactive mode (type quit to exit) ──\n");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => {
    rl.question("Your question: ", q => {
      if (!q || q.toLowerCase() === "quit") { rl.close(); return; }
      console.log(`\n${engine.answer(q)}\n`);
      ask();
    });
  };
  ask();
}
