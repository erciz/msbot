/**
 * MoonSale Deep Scraper — Node.js + Puppeteer
 * =============================================
 * Uses a real Chrome browser so all React/JS-rendered
 * content loads properly before extracting text.
 *
 * Install:  npm install
 * Run:      npm run scrape
 *
 * Output:
 *   moonsale_data/pages/      ← one .txt per page
 *   moonsale_data/corpus.json ← all pages combined
 *   moonsale_data/report.txt  ← what was scraped
 */

import puppeteer from "puppeteer";
import fs        from "fs";
import path      from "path";
import { URL }   from "url";

// ── Output dirs ───────────────────────────────────────────────────────────────
const DATA_DIR  = "./moonsale_data";
const PAGES_DIR = "./moonsale_data/pages";
[DATA_DIR, PAGES_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ── All MoonSale pages to scrape ──────────────────────────────────────────────
const SEED_PAGES = [

  // Core
  { url: "https://www.moonsale.app/",                  category: "core"   },
  { url: "https://www.moonsale.app/presale",            category: "core"   },
  { url: "https://www.moonsale.app/investors",          category: "core"   },

  // Launch
  { url: "https://www.moonsale.app/create",             category: "launch" },
  { url: "https://www.moonsale.app/create-fair-launch", category: "launch" },
  { url: "https://www.moonsale.app/my-launches",        category: "launch" },
  { url: "https://www.moonsale.app/invested",           category: "launch" },

  // Documentation
  { url: "https://www.moonsale.app/investor-docs",      category: "docs"   },
  { url: "https://www.moonsale.app/developer-docs",     category: "docs"   },
  { url: "https://www.moonsale.app/fees",               category: "docs"   },
  { url: "https://www.moonsale.app/ca-audits",          category: "docs"   },
  { url: "https://www.moonsale.app/kyc-audit",          category: "docs"   },

  // Tools
  { url: "https://www.moonsale.app/create-token",       category: "tools"  },
  { url: "https://www.moonsale.app/lock",               category: "tools"  },
  { url: "https://www.moonsale.app/vesting",            category: "tools"  },
  { url: "https://www.moonsale.app/token-management",   category: "tools"  },
  { url: "https://www.moonsale.app/token-scanner",      category: "tools"  },
  { url: "https://www.moonsale.app/tokenomics-creator", category: "tools"  },
];

// ── Noise patterns to strip from text ────────────────────────────────────────
const NOISE = [
  /connect wallet/gi,
  /©\s*moonsale.*/gi,
  /v\s*\d+\.\d+\.\d+/gi,
  /light\s*dark/gi,
  /0x[a-f0-9]{4}[…\.]+[a-f0-9]{4}/gi,
  /^\s*[|•·▪►→]+\s*$/gm,
  /\n{3,}/g,
];

// ── Clean extracted text ──────────────────────────────────────────────────────
function cleanText(text) {
  for (const pattern of NOISE) {
    text = text.replace(pattern, pattern.source === "\\n{3,}" ? "\n\n" : " ");
  }
  return text.replace(/[ \t]{2,}/g, " ").trim();
}

// ── URL → safe filename ───────────────────────────────────────────────────────
function urlToFilename(urlStr) {
  const u    = new URL(urlStr);
  const slug = u.pathname.replace(/\//g, "__").replace(/^_+|_+$/g, "") || "index";
  return `${slug}.txt`;
}

// ── Delay helper ──────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Extract all structured content from page via browser ─────────────────────
async function extractPageContent(page, url, category) {
  return await page.evaluate((url, category) => {

    // Remove noise elements
    const REMOVE_SELECTORS = [
      "script", "style", "noscript", "svg", "img",
      "nav", "footer", "header", "iframe", "video",
      "[aria-hidden='true']",
      ".cookie-banner", ".modal-overlay",
    ];
    REMOVE_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });

    const result = {
      url,
      category,
      title:      document.title || "",
      headings:   [],
      paragraphs: [],
      lists:      [],
      tables:     [],
      faqs:       [],
      cards:      [],   // feature/info cards common on launchpad sites
      stats:      [],   // stat counters (e.g. "100+ projects launched")
    };

    // ── Headings ────────────────────────────────────────────────────────
    document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h => {
      const text = h.innerText?.trim();
      if (text && text.length > 2) {
        result.headings.push({
          level: parseInt(h.tagName[1]),
          text,
        });
      }
    });

    // ── Paragraphs ──────────────────────────────────────────────────────
    document.querySelectorAll("p").forEach(p => {
      const text = p.innerText?.trim();
      if (text && text.length > 20) {
        result.paragraphs.push(text);
      }
    });

    // ── Lists ───────────────────────────────────────────────────────────
    document.querySelectorAll("ul, ol").forEach(list => {
      const items = [];
      list.querySelectorAll("li").forEach(li => {
        const text = li.innerText?.trim();
        if (text && text.length > 3) items.push(text);
      });
      if (items.length > 0) {
        // Grab preceding heading for context
        let heading = "";
        let prev = list.previousElementSibling;
        while (prev) {
          if (/^H[1-6]$/.test(prev.tagName) || prev.tagName === "P") {
            heading = prev.innerText?.trim() || "";
            break;
          }
          prev = prev.previousElementSibling;
        }
        result.lists.push({ heading, items });
      }
    });

    // ── Tables ──────────────────────────────────────────────────────────
    document.querySelectorAll("table").forEach(table => {
      const headers = [];
      const rows    = [];

      table.querySelectorAll("th").forEach(th => {
        const text = th.innerText?.trim();
        if (text) headers.push(text);
      });

      table.querySelectorAll("tr").forEach(tr => {
        const cells = [];
        tr.querySelectorAll("td").forEach(td => {
          const text = td.innerText?.trim();
          if (text) cells.push(text);
        });
        if (cells.length > 0) rows.push(cells);
      });

      if (headers.length > 0 || rows.length > 0) {
        result.tables.push({ headers, rows });
      }
    });

    // ── FAQ / Accordion (details+summary pattern) ────────────────────────
    document.querySelectorAll("details").forEach(details => {
      const summary = details.querySelector("summary");
      if (summary) {
        const question = summary.innerText?.trim();
        const clone    = details.cloneNode(true);
        clone.querySelector("summary")?.remove();
        const answer = clone.innerText?.trim();
        if (question && answer) {
          result.faqs.push({ question, answer });
        }
      }
    });

    // ── Feature cards / info boxes ────────────────────────────────────
    // Picks up card-like divs that have both a heading and description
    const cardSelectors = [
      "[class*='card']",
      "[class*='feature']",
      "[class*='benefit']",
      "[class*='info-box']",
      "[class*='block']",
    ];
    cardSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(card => {
        const heading = card.querySelector("h1,h2,h3,h4,h5,h6,strong");
        const body    = card.querySelector("p,span,[class*='desc']");
        if (heading && body) {
          const h = heading.innerText?.trim();
          const b = body.innerText?.trim();
          if (h && b && h.length > 2 && b.length > 10) {
            result.cards.push({ heading: h, body: b });
          }
        }
      });
    });

    // ── Stat counters ─────────────────────────────────────────────────
    // e.g. "0+ BNB Raised", "100+ Projects"
    const statSelectors = [
      "[class*='stat']",
      "[class*='counter']",
      "[class*='metric']",
      "[class*='number']",
    ];
    statSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 2 && text.length < 100) {
          result.stats.push(text);
        }
      });
    });

    return result;

  }, url, category);
}

// ── Build full_text from extracted data ───────────────────────────────────────
function buildFullText(data) {
  const lines = [];

  lines.push(`PAGE: ${data.title}`);
  lines.push(`URL: ${data.url}`);
  lines.push(`CATEGORY: ${data.category}`);
  lines.push("=".repeat(60));

  if (data.headings.length > 0) {
    lines.push("\n=== HEADINGS ===");
    data.headings.forEach(h => {
      lines.push(`${"#".repeat(h.level)} ${h.text}`);
    });
  }

  if (data.paragraphs.length > 0) {
    lines.push("\n=== CONTENT ===");
    data.paragraphs.forEach(p => lines.push(p));
  }

  if (data.cards.length > 0) {
    lines.push("\n=== FEATURE CARDS ===");
    data.cards.forEach(c => {
      lines.push(`\n▸ ${c.heading}`);
      lines.push(`  ${c.body}`);
    });
  }

  if (data.lists.length > 0) {
    lines.push("\n=== LISTS ===");
    data.lists.forEach(lst => {
      if (lst.heading) lines.push(`\n${lst.heading}:`);
      lst.items.forEach(item => lines.push(`  • ${item}`));
    });
  }

  if (data.tables.length > 0) {
    lines.push("\n=== TABLES ===");
    data.tables.forEach(tbl => {
      if (tbl.headers.length > 0) {
        lines.push(tbl.headers.join(" | "));
        lines.push("-".repeat(60));
      }
      tbl.rows.forEach(row => lines.push(row.join(" | ")));
      lines.push("");
    });
  }

  if (data.stats.length > 0) {
    lines.push("\n=== PLATFORM STATS ===");
    [...new Set(data.stats)].forEach(s => lines.push(`  ${s}`));
  }

  if (data.faqs.length > 0) {
    lines.push("\n=== FREQUENTLY ASKED QUESTIONS ===");
    data.faqs.forEach(faq => {
      lines.push(`\nQ: ${faq.question}`);
      lines.push(`A: ${faq.answer}`);
    });
  }

  return cleanText(lines.join("\n"));
}

// ── Main scraper ──────────────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  MoonSale Deep Scraper — Node.js + Puppeteer");
  console.log(`  Pages to scrape: ${SEED_PAGES.length}`);
  console.log("=".repeat(60) + "\n");

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();

  // Block images, fonts, media to speed up scraping
  await page.setRequestInterception(true);
  page.on("request", req => {
    const type = req.resourceType();
    if (["image", "font", "media", "stylesheet"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.setViewport({ width: 1280, height: 900 });

  const results  = [];
  const failed   = [];
  const visited  = new Set();
  const discovered = new Set();

  // ── Phase 1: Seed pages ────────────────────────────────────────────────
  console.log("── Phase 1: Seeded pages ──\n");

  for (const seed of SEED_PAGES) {
    const { url, category } = seed;
    if (visited.has(url)) continue;
    visited.add(url);

    process.stdout.write(`  [${category}] ${url}\n`);

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for React to render
      await sleep(2500);

      // Try to expand any accordion/FAQ elements
      await page.evaluate(() => {
        document.querySelectorAll("details").forEach(d => d.setAttribute("open", ""));
        document.querySelectorAll("[aria-expanded='false']").forEach(btn => {
          try { btn.click(); } catch {}
        });
      });

      await sleep(500);

      const data    = await extractPageContent(page, url, category);
      data.fullText = buildFullText(data);

      // Collect internal links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a[href]"))
          .map(a => a.href)
          .filter(href => href.includes("moonsale.app") && !href.includes("#"))
          .map(href => new URL(href).origin + new URL(href).pathname);
      });

      links.forEach(link => {
        if (!visited.has(link)) discovered.add(link);
      });

      // Save .txt file
      const filename = urlToFilename(url);
      const filepath = path.join(PAGES_DIR, filename);
      fs.writeFileSync(filepath, data.fullText, "utf8");

      results.push(data);

      const chars = data.fullText.length;
      console.log(
        `    ✓  ${String(chars).padStart(6)} chars | ` +
        `H:${data.headings.length} ` +
        `P:${data.paragraphs.length} ` +
        `L:${data.lists.length} ` +
        `T:${data.tables.length} ` +
        `Cards:${data.cards.length} ` +
        `FAQ:${data.faqs.length} ` +
        `→ ${filename}`
      );

    } catch (err) {
      console.log(`    ✗  ${err.message}`);
      failed.push({ url, error: err.message, phase: 1 });
    }

    await sleep(1500);
  }

  // ── Phase 2: Discovered links ──────────────────────────────────────────
  if (discovered.size > 0) {
    console.log(`\n── Phase 2: Discovered links (${discovered.size} found) ──\n`);

    for (const url of discovered) {
      if (visited.has(url)) continue;
      visited.add(url);

      process.stdout.write(`  [discovered] ${url}\n`);

      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
        await sleep(2000);

        const data    = await extractPageContent(page, url, "discovered");
        data.fullText = buildFullText(data);

        if (data.fullText.length < 100) {
          console.log("    ⚠  Too little content — skipped");
          continue;
        }

        const filename = urlToFilename(url);
        fs.writeFileSync(path.join(PAGES_DIR, filename), data.fullText, "utf8");
        results.push(data);

        console.log(`    ✓  ${data.fullText.length} chars → ${filename}`);

      } catch (err) {
        console.log(`    ✗  ${err.message}`);
        failed.push({ url, error: err.message, phase: 2 });
      }

      await sleep(1500);
    }
  }

  await browser.close();

  // ── Save combined corpus ───────────────────────────────────────────────
  const corpusEntries = results.map(r => ({
    source:     r.url,
    title:      r.title,
    category:   r.category,
    headings:   r.headings.map(h => h.text),
    paragraphs: r.paragraphs,
    faqs:       r.faqs,
    tables:     r.tables,
    cards:      r.cards,
    fullText:   r.fullText,
    charCount:  r.fullText.length,
  }));

  fs.writeFileSync(
    path.join(DATA_DIR, "corpus.json"),
    JSON.stringify(corpusEntries, null, 2),
    "utf8"
  );

  // ── Save report ────────────────────────────────────────────────────────
  const totalChars = results.reduce((s, r) => s + r.fullText.length, 0);
  const totalFAQs  = results.reduce((s, r) => s + r.faqs.length, 0);
  const totalCards = results.reduce((s, r) => s + r.cards.length, 0);
  const reportLines = [
    "MoonSale Scrape Report",
    "=".repeat(60),
    `Pages scraped  : ${results.length}`,
    `Pages failed   : ${failed.length}`,
    `Total chars    : ${totalChars.toLocaleString()}`,
    `Approx tokens  : ~${Math.round(totalChars / 4).toLocaleString()}`,
    `FAQ entries    : ${totalFAQs}`,
    `Feature cards  : ${totalCards}`,
    "",
    "── Pages ──",
    ...results.map(r => `  ✓  ${String(r.fullText.length).padStart(6)} chars  ${r.url}`),
    ...(failed.length > 0 ? ["\n── Failed ──", ...failed.map(f => `  ✗  ${f.url}  (${f.error})`)] : []),
  ];
  fs.writeFileSync(path.join(DATA_DIR, "report.txt"), reportLines.join("\n"), "utf8");

  // ── Final summary ──────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  SCRAPING COMPLETE");
  console.log(`  Pages scraped    : ${results.length}`);
  console.log(`  Failed           : ${failed.length}`);
  console.log(`  Total chars      : ${totalChars.toLocaleString()}`);
  console.log(`  Approx tokens    : ~${Math.round(totalChars / 4).toLocaleString()}`);
  console.log(`  FAQ entries      : ${totalFAQs}`);
  console.log(`  Feature cards    : ${totalCards}`);
  console.log("=".repeat(60));
  console.log("\n  Files saved to: ./moonsale_data/");
  console.log("  Next step: npm run build\n");
}

main().catch(err => {
  console.error("\n FATAL ERROR:", err);
  process.exit(1);
});
