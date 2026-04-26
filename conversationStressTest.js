/**
 * Multi-turn conversation stress test for follow-up memory handling.
 *
 * Run:
 *   node conversationStressTest.js
 */

import { buildAssistantReply } from "./assistantCore.js";

const CONNECTOR_PREFIXES = ["", "and ", "what about ", "and if "];
const ENDING_SUFFIXES = ["", "?"];

const MAX_CASES = Number(process.env.CONV_MAX_CASES || 120);
const PROGRESS_EVERY = Number(process.env.CONV_PROGRESS_EVERY || 25);

const FAILURE_PATTERNS = [
  "looking for a specific presale",
  "don't have details about individual projects",
  "i don't have a verified answer",
  "investor docs",
  "developer docs",
];

const ROOT_SCENARIOS = [
  {
    root: "what is presale rate",
    followUps: [
      {
        variants: ["withdraw penalty", "withdraw panelty", "withdraw penelty", "penalty for withdraw"],
        mustIncludeAny: ["penalty", "withdraw"],
      },
      {
        variants: ["refund deadline", "refund time limit", "money back deadline"],
        mustIncludeAny: ["refund", "deadline"],
      },
      {
        variants: ["if sale fails", "sale failed what happens", "when presale fail"],
        mustIncludeAny: ["refund", "fail"],
      },
    ],
  },
  {
    root: "what is fair launch",
    followUps: [
      {
        variants: ["no vesting", "without vesting", "if no vesting"],
        mustIncludeAny: ["no vesting", "claimable", "immediately"],
      },
      {
        variants: ["tokens for sale vs tokens for liquidity", "sale vs liquidity tokens difference"],
        mustIncludeAny: ["tokens for sale", "liquidity"],
      },
      {
        variants: ["what happens after deploy", "after deploy then what"],
        mustIncludeAny: ["after deploy", "finalizes", "liquidity"],
      },
    ],
  },
  {
    root: "liquidity lock",
    followUps: [
      {
        variants: ["can extend in live mode", "live mode extend lock", "if live mode"],
        mustIncludeAny: ["cannot", "live mode", "finaliz"],
      },
    ],
  },
  {
    root: "token scanner",
    followUps: [
      {
        variants: ["eligibility failed", "eligibility fail", "token eligibility failed"],
        mustIncludeAny: ["eligibility", "blocking"],
      },
      {
        variants: ["pair has existing liquidity", "existing liquidity blocked", "dex pair reserves existing liquidity"],
        mustIncludeAny: ["existing", "liquidity", "blocked"],
      },
    ],
  },
  {
    root: "claim tokens",
    followUps: [
      {
        variants: ["if sale fails", "if launch fails", "failed sale then"],
        mustIncludeAny: ["refund", "fail"],
      },
      {
        variants: ["deadline", "refund deadline", "time limit"],
        mustIncludeAny: ["refund", "deadline"],
      },
    ],
  },
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildFollowUpVariants(base) {
  const variants = new Set();
  for (const prefix of CONNECTOR_PREFIXES) {
    for (const suffix of ENDING_SUFFIXES) {
      variants.add(`${prefix}${base}${suffix}`.replace(/\s+/g, " ").trim());
    }
  }
  return [...variants];
}

function replyLooksWrong(answer) {
  const a = normalize(answer);
  return FAILURE_PATTERNS.some(p => a.includes(p));
}

function includesAny(answer, mustIncludeAny) {
  const a = normalize(answer);
  return mustIncludeAny.some(item => a.includes(normalize(item)));
}

function run() {
  let total = 0;
  let passed = 0;
  let failed = 0;
  const failures = [];
  let chatId = 700000;
  const startedAt = Date.now();

  // Warm-up call to load engine once before timed loop.
  buildAssistantReply(chatId, "what is moonsale", { format: "plain" });

  for (const scenario of ROOT_SCENARIOS) {
    for (const followSpec of scenario.followUps) {
      for (const baseFollow of followSpec.variants) {
        const generated = buildFollowUpVariants(baseFollow);

        for (const followText of generated) {
          if (total >= MAX_CASES) break;
          total++;
          chatId++;

          buildAssistantReply(chatId, scenario.root, { format: "plain" });
          const followReply = buildAssistantReply(chatId, followText, { format: "plain" });
          const answer = followReply.text;

          const semanticOk = includesAny(answer, followSpec.mustIncludeAny);
          const noWrongPattern = !replyLooksWrong(answer);

          if (semanticOk && noWrongPattern) {
            passed++;
          } else {
            failed++;
            failures.push({
              root: scenario.root,
              follow: followText,
              answer,
              expectedAny: followSpec.mustIncludeAny,
            });
          }

          if (total % PROGRESS_EVERY === 0) {
            console.log(`Progress: ${total} checks (passed ${passed}, failed ${failed})`);
          }
        }

        if (total >= MAX_CASES) break;
      }

      if (total >= MAX_CASES) break;
    }

    if (total >= MAX_CASES) break;
  }

  console.log("\n=== Conversation Stress Test Summary ===");
  console.log(`Total: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pass rate: ${((passed / Math.max(total, 1)) * 100).toFixed(1)}%`);
  console.log(`Duration: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);

  if (failures.length) {
    console.log("\nTop failures:\n");
    for (const row of failures.slice(0, 20)) {
      console.log(`Root: ${row.root}`);
      console.log(`Follow: ${row.follow}`);
      console.log(`Expected any: ${row.expectedAny.join(" | ")}`);
      console.log(`Answer: ${row.answer}`);
      console.log("---");
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
