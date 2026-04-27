/**
 * Dedicated SearchEngine regression suite.
 *
 * Run directly:
 *   node searchEngine.regression.js
 *
 * It is also executed from tests.js so interactive-mode behavior
 * is validated in the main suite.
 */

import { SearchEngine } from "./searchEngine.js";

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesNone(haystack, needles) {
  const h = normalizeText(haystack);
  return needles.every(n => !h.includes(normalizeText(n)));
}

const REGRESSION_CASES = [
  {
    name: "Mention greeting should stay greeting-like",
    query: "@moonsaleassistantbot hello",
    mustIncludeAny: ["hey", "ask me anything about moonsale"],
    mustNotInclude: ["investor docs", "developer docs"],
  },
  {
    name: "Small-talk shorthand",
    query: "how r u",
    mustIncludeAny: ["doing great", "ready to help with moonsale"],
  },
  {
    name: "Group about intent",
    query: "what is this group about",
    mustIncludeAny: ["group is for moonsale community support", "launch guidance"],
  },
  {
    name: "Create token typo",
    query: "hwo to create token?",
    mustIncludeAny: ["create-token", "create token at"],
  },
  {
    name: "Receipt extraction troubleshooting",
    query: "Could not extract presale address from receipt",
    mustIncludeAny: ["deploy transaction parsing failed", "tx hash"],
  },
  {
    name: "Hinglish fair launch create",
    query: "fairlaunch kaise banau",
    mustIncludeAny: ["create-fair-launch", "fair launch at"],
  },
  {
    name: "Hinglish token create",
    query: "token kaise banau",
    mustIncludeAny: ["create-token", "create token at"],
  },
  {
    name: "Indo token create",
    query: "gimana bikin token",
    mustIncludeAny: ["create-token", "create token at"],
  },
  {
    name: "English token launch intent",
    query: "how to launch a token",
    mustIncludeAny: ["create-token", "create token at"],
    mustNotInclude: ["sale countdown", "buy is still locked"],
  },
  {
    name: "How-to token launch avoids status countdown",
    query: "how can i start token launch process",
    mustIncludeAny: ["create token", "create-token", "token generator", "deploy token"],
    mustNotInclude: ["sale countdown", "buy is still locked", "timezone on the sale countdown"],
  },
  {
    name: "Group typo normalization",
    query: "what is thi group about",
    mustIncludeAny: ["group is for moonsale community support", "launch guidance"],
  },
  {
    name: "Manual/docs priority for platform overview",
    query: "what is moonsale",
    mustIncludeAny: ["permissionless launchpad", "bnb chain", "ethereum"],
    mustNotInclude: ["official listing:"],
  },
  {
    name: "Website listing priority for single token lookups",
    query: "bester",
    mustIncludeAny: ["official listing:", "listed on moonsale"],
  },
  {
    name: "Custom workflow QA should answer directly",
    query: "if i change token after filling info will values reset",
    mustIncludeAny: ["changing token can alter dependent values", "re-check config"],
    mustNotInclude: ["browse all presales", "official listing:"],
  },
];

export function runSearchEngineRegressionSuite({ verbose = true } = {}) {
  const engine = new SearchEngine();

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const testCase of REGRESSION_CASES) {
    const answer = engine.answer(testCase.query);

    const anyList = testCase.mustIncludeAny || [];
    const notList = testCase.mustNotInclude || [];

    const anyOk = anyList.length === 0 || anyList.some(x => normalizeText(answer).includes(normalizeText(x)));
    const notOk = includesNone(answer, notList);

    if (anyOk && notOk) {
      passed++;
      if (verbose) console.log(`✅ ${testCase.name}`);
      continue;
    }

    failed++;
    failures.push({
      name: testCase.name,
      query: testCase.query,
      answer,
      mustIncludeAny: anyList,
      mustNotInclude: notList,
      anyOk,
      notOk,
    });

    if (verbose) {
      console.log(`❌ ${testCase.name}`);
      console.log(`   Query: ${testCase.query}`);
      console.log(`   Answer: ${answer}`);
      if (!anyOk) {
        console.log(`   Expected answer to include one of: ${anyList.join(" | ")}`);
      }
      if (!notOk) {
        console.log(`   Expected answer to avoid: ${notList.join(" | ")}`);
      }
      console.log("");
    }
  }

  const total = passed + failed;
  return { passed, failed, total, failures };
}

if (process.argv[1] && process.argv[1].includes("searchEngine.regression")) {
  console.log("\n📌 SEARCH ENGINE INTERACTIVE REGRESSION");
  console.log("=".repeat(70));

  const result = runSearchEngineRegressionSuite({ verbose: true });

  console.log("\n" + "=".repeat(70));
  console.log("📊 SEARCH ENGINE REGRESSION SUMMARY");
  console.log("=".repeat(70));
  console.log(`\n✅ Passed: ${result.passed}`);
  console.log(`❌ Failed: ${result.failed}`);
  console.log(`📈 Total:  ${result.total}`);
  console.log(`📊 Success Rate: ${((result.passed / Math.max(1, result.total)) * 100).toFixed(1)}%\n`);

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}
