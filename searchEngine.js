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
]);

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

  _detectIntent(query) {
    const q = (query || "").toLowerCase();
    return {
      asksFee: /\b(fee|fees|cost|costs|charge|charges|pricing|price)\b/.test(q),
      asksHow: /\b(how|workflow|steps|process|work|works)\b/.test(q),
      asksTestnet: /\b(testnet|testnets|sepolia)\b/.test(q),
      asksClaim: /\b(claim|claimable)\b/.test(q),
      asksRefund: /\b(refund|refunds|money\s*back)\b/.test(q),
      asksRoadmap: /\b(roadmap|phase\s*1|phase\s*2|phase\s*3|planned|in\s*progress)\b/.test(q),
      asksWallet: /\b(wallet|metamask|walletconnect|connect wallet)\b/.test(q),
      asksMetaMask: /\bmetamask\b/.test(q),
      asksMarketing: /\b(marketing|promote|partner|co-marketing)\b/.test(q),
      asksUrl: /\b(real url|official url|website|official site|moonsale url)\b/.test(q),
      asksRevenue: /\b(revenue|make money|earnings|stakers?)\b/.test(q),
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

  _intentAdjust(query, entry) {
    const intent = this._detectIntent(query);
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

    if (intent.asksClaim && tags.has("claim")) score += 0.5;
    if (intent.asksRefund && tags.has("refund")) score += 0.5;
    if (intent.asksRoadmap && (tags.has("roadmap") || tags.has("whitepaper"))) score += 0.55;

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
    const queryWords = tokenize(query);
    const queryTokens = [
      ...queryWords,
      ...bigrams(queryWords),
    ];
    if (!queryTokens.length) return [];

    const queryTokenSet = new Set(queryWords);

    const scores = this.entries.map((entry, i) => ({
      score: (
        this._tfidf(queryTokens, i)
        + this._fuzzyBonus(queryTokens, i)
        + this._tagBoost(queryTokens, entry)
        + this._questionTitleScore(queryTokenSet, i)
        + this._intentAdjust(query, entry)
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

  answer(query) {
    const normal = (query || "").toLowerCase().trim();

    const directRules = [
      {
        pattern: /\bsoft\s*cap|softcap\b.*\b(not\s+reached|not\s+met|fail|fails|failed)\b|\b(not\s+reached|not\s+met)\b.*\bsoft\s*cap|softcap\b/,
        answer: "If softcap is not reached, the sale fails and contributors can claim full refunds directly from the smart contract.",
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
        pattern: /\brug\s*pull\b.*\b(prevent|protection|avoid|safe)\b|\b(prevent|protection|avoid|safe)\b.*\brug\s*pull\b/,
        answer: "MoonSale reduces rug-risk with contract-enforced hard/soft caps, on-chain refunds on failed sales, and liquidity locking after successful finalization.",
      },
      {
        pattern: /^what\s+is\s+a\s+rug\s*pull\??$/,
        answer: "A rug pull is when project operators remove liquidity or abuse control to drain value, leaving investors exposed.",
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

    const results = this.search(query, 12);

    if (!results.length) {
      return (
        "I don't have specific info about that yet.\n\n" +
        "Check the official docs:\n" +
        "• Investor docs: moonsale.app/investor-docs\n" +
        "• Developer docs: moonsale.app/developer-docs"
      );
    }

    const top = results[0];

    const qaHit = [...results]
      .filter(r =>
      (r.type === "qa" || r.type === "qa_variant" || !!r.answer)
      && this._extractAnswerText(r).length > 20
      )
      .sort((a, b) => b._score - a._score)[0];

    if (qaHit && qaHit._score > 0.08) {
      let answer = this._extractAnswerText(qaHit);
      if (qaHit.source && qaHit.source.startsWith("http")) {
        answer += `\n\n📄 Source: ${qaHit.source}`;
      }
      return answer.trim();
    }

    const concise = this._cleanFallbackText(this._extractAnswerText(top));
    if (!concise) {
      return "Found some info but couldn't extract a clear answer. Check moonsale.app directly.";
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
if (process.argv[1] && process.argv[1].includes("searchEngine")) {
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
