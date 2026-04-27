#!/usr/bin/env node

import fs from "fs";
import path from "path";

const DEFAULT_OUTPUT = path.join("moonsale_data", "custom_qa_priority.jsonl");
const DEFAULT_TAGS = ["custom", "priority"];
const HEADER_LINES = [
  "# One JSON object per line.",
  "# Fields: question, answer, tags (optional)",
  "# {\"question\":\"sample question\",\"answer\":\"sample answer\",\"tags\":[\"custom\",\"priority\"]}",
];

function printUsage() {
  console.log([
    "Usage:",
    "  node scripts/importPriorityQA.js --input <file> [--output <file>] [--replace] [--dry-run]",
    "  npm run qa:priority:import -- <file> [replace|dry-run]",
    "",
    "Examples:",
    "  node scripts/importPriorityQA.js --input ./my-ai-qa.json",
    "  node scripts/importPriorityQA.js --input ./my-ai-qa.jsonl --replace",
    "  npm run qa:priority:import -- ./my-ai-qa.json",
    "  npm run qa:priority:import -- ./my-ai-qa.json dry-run",
  ].join("\n"));
}

function parseArgs(argv) {
  const args = {
    input: "",
    output: DEFAULT_OUTPUT,
    replace: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--replace") {
      args.replace = true;
      continue;
    }

    if (token === "replace") {
      args.replace = true;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "dry-run" || token === "dryrun") {
      args.dryRun = true;
      continue;
    }

    if (token === "--input" || token === "-i") {
      args.input = argv[i + 1] || "";
      i += 1;
      continue;
    }

    if (token === "--output" || token === "-o") {
      args.output = argv[i + 1] || DEFAULT_OUTPUT;
      i += 1;
      continue;
    }

    if (!token.startsWith("-") && !args.input) {
      args.input = token;
      continue;
    }

    if (!token.startsWith("-") && args.input && args.output === DEFAULT_OUTPUT) {
      args.output = token;
      continue;
    }
  }

  return args;
}

function normalizeForKey(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniquePreserveOrder(values) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const key = String(value || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

function parseTags(value, fallback = DEFAULT_TAGS) {
  if (Array.isArray(value)) {
    const tags = uniquePreserveOrder(value.map(v => String(v || "").trim()));
    return tags.length ? tags : [...fallback];
  }

  if (typeof value === "string") {
    const tags = uniquePreserveOrder(value.split(/[|,;]/g).map(v => v.trim()));
    return tags.length ? tags : [...fallback];
  }

  return [...fallback];
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") return null;

  const question = String(record.question ?? record.q ?? "").trim();
  const answer = String(record.answer ?? record.a ?? "").trim();
  if (!question || !answer) return null;

  return {
    question,
    answer,
    tags: parseTags(record.tags, DEFAULT_TAGS),
  };
}

function extractArrayFromObject(obj) {
  if (!obj || typeof obj !== "object") return null;

  const preferredKeys = ["items", "records", "data", "qa", "pairs", "entries"];
  for (const key of preferredKeys) {
    if (Array.isArray(obj[key])) return obj[key];
  }

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) return value;
  }

  return null;
}

function parseJsonlLines(rawText, sourceLabel) {
  const rows = [];
  const lines = String(rawText || "").split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    try {
      const parsed = JSON.parse(line);
      if (Array.isArray(parsed)) {
        rows.push(...parsed);
      } else {
        rows.push(parsed);
      }
    } catch (err) {
      throw new Error(`Invalid JSONL at ${sourceLabel}:${i + 1} (${err.message})`);
    }
  }

  return rows;
}

function parseFlexibleRecords(rawText, sourceLabel) {
  const text = String(rawText || "").trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);

    if (Array.isArray(parsed)) return parsed;

    if (parsed && typeof parsed === "object") {
      const arr = extractArrayFromObject(parsed);
      if (arr) return arr;

      if ((parsed.question || parsed.q) && (parsed.answer || parsed.a)) {
        return [parsed];
      }
    }
  } catch {
    // Fall through to JSONL parser.
  }

  return parseJsonlLines(text, sourceLabel);
}

function makeRecordKey(record) {
  return `${normalizeForKey(record.question)}::${normalizeForKey(record.answer)}`;
}

function loadExistingOutput(filePath) {
  if (!fs.existsSync(filePath)) return [];

  const rawText = fs.readFileSync(filePath, "utf8");
  const rows = parseFlexibleRecords(rawText, filePath);

  return rows
    .map(normalizeRecord)
    .filter(Boolean);
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    const q = a.question.localeCompare(b.question);
    if (q !== 0) return q;
    return a.answer.localeCompare(b.answer);
  });
}

function writeJsonl(filePath, records) {
  const body = [
    ...HEADER_LINES,
    ...sortRecords(records).map(row => JSON.stringify(row)),
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body, "utf8");
}

function mergeRecords(existing, incoming, replaceMode) {
  const merged = new Map();
  let added = 0;
  let updatedTags = 0;

  if (!replaceMode) {
    for (const row of existing) {
      merged.set(makeRecordKey(row), { ...row, tags: parseTags(row.tags, DEFAULT_TAGS) });
    }
  }

  for (const row of incoming) {
    const key = makeRecordKey(row);
    const current = merged.get(key);

    if (!current) {
      merged.set(key, { ...row, tags: parseTags(row.tags, DEFAULT_TAGS) });
      added += 1;
      continue;
    }

    const combinedTags = uniquePreserveOrder([...(current.tags || []), ...(row.tags || [])]);
    const changed = combinedTags.length !== (current.tags || []).length;
    if (changed) updatedTags += 1;

    merged.set(key, {
      question: current.question,
      answer: current.answer,
      tags: combinedTags.length ? combinedTags : [...DEFAULT_TAGS],
    });
  }

  return {
    records: [...merged.values()],
    added,
    updatedTags,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(process.cwd(), args.input);
  const outputPath = path.resolve(process.cwd(), args.output || DEFAULT_OUTPUT);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const inputRaw = fs.readFileSync(inputPath, "utf8");
  const parsedInput = parseFlexibleRecords(inputRaw, inputPath);

  const normalizedIncoming = parsedInput
    .map(normalizeRecord)
    .filter(Boolean);

  const incomingByKey = new Map();
  let duplicateInInput = 0;
  for (const row of normalizedIncoming) {
    const key = makeRecordKey(row);
    if (incomingByKey.has(key)) {
      duplicateInInput += 1;
      const current = incomingByKey.get(key);
      incomingByKey.set(key, {
        question: current.question,
        answer: current.answer,
        tags: uniquePreserveOrder([...(current.tags || []), ...(row.tags || [])]),
      });
      continue;
    }
    incomingByKey.set(key, row);
  }

  const incoming = [...incomingByKey.values()];
  const existing = args.replace ? [] : loadExistingOutput(outputPath);
  const { records, added, updatedTags } = mergeRecords(existing, incoming, args.replace);

  if (!args.dryRun) {
    writeJsonl(outputPath, records);
  }

  console.log("\nPriority Q&A import summary");
  console.log("=".repeat(50));
  console.log(`Input file: ${inputPath}`);
  console.log(`Output file: ${outputPath}`);
  console.log(`Mode: ${args.replace ? "replace" : "merge"}`);
  console.log(`Dry run: ${args.dryRun ? "yes" : "no"}`);
  console.log("-");
  console.log(`Parsed rows: ${parsedInput.length}`);
  console.log(`Valid rows: ${normalizedIncoming.length}`);
  console.log(`Duplicate rows in input: ${duplicateInInput}`);
  console.log(`Existing rows: ${existing.length}`);
  console.log(`Added rows: ${added}`);
  console.log(`Rows with merged tags: ${updatedTags}`);
  console.log(`Final rows: ${records.length}`);
  console.log("=".repeat(50));

  if (!args.dryRun) {
    console.log("Next steps:");
    console.log("1) npm run build");
    console.log("2) npm run test");
    console.log("3) Restart your bot process or redeploy webhook");
  }
}

main();
