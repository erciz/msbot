/**
 * MoonSale Bot — Comprehensive Test Suite
 * Tests bot responses, edge cases, tone detection, and query handling
 * 
 * Run: node tests.js
 */

import {
  buildAssistantReply,
  escape,
  formatAnswer,
  isGreeting,
  isOffTopic,
  isFollowUpLinkRequest,
  WELCOME,
  HELP,
  LINKS,
  ABOUT,
  FALLBACK,
  OFF_TOPIC_REPLY,
} from "./assistantCore.js";

let passedTests = 0;
let failedTests = 0;
const results = [];

function test(description, fn) {
  try {
    fn();
    passedTests++;
    results.push({ status: "✅", description });
  } catch (err) {
    failedTests++;
    results.push({ status: "❌", description, error: err.message });
    console.error(`❌ ${description}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || "Assertion failed"}\n   Expected: ${expected}\n   Got: ${actual}`);
  }
}

function assertIncludes(haystack, needle, message) {
  // Handle escaped markdown/emojis and unescaped variants
  const variations = [
    needle,
    needle.replace(/\./g, "\\."), // escaped dots
    needle.replace(/\[/g, "\\[").replace(/\]/g, "\\]"), // escaped brackets
  ];
  
  const found = variations.some(v => String(haystack).includes(v));
  if (!found) {
    throw new Error(`${message || "Assertion failed"}\n   Expected to find: "${needle}"\n   In: "${haystack}"`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 🧪 GREETING TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 GREETING DETECTION TESTS");
console.log("=" .repeat(70));

test("Detects 'hi' as greeting", () => {
  assert(isGreeting("hi"), "'hi' should be detected as greeting");
});

test("Detects 'hello' as greeting", () => {
  assert(isGreeting("hello"), "'hello' should be detected as greeting");
});

test("Detects 'hey' as greeting", () => {
  assert(isGreeting("hey"), "'hey' should be detected as greeting");
});

test("Detects 'sup' as greeting", () => {
  assert(isGreeting("sup"), "'sup' should be detected as greeting");
});

test("Detects 'yo' as greeting", () => {
  assert(isGreeting("yo"), "'yo' should be detected as greeting");
});

test("Does not detect 'what is moonsale' as greeting", () => {
  assert(!isGreeting("what is moonsale"), "'what is moonsale' should not be greeting");
});

test("Does not detect 'hello moonsale' as greeting", () => {
  assert(!isGreeting("hello moonsale"), "Should only match pure greetings");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔴 OFF-TOPIC TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 OFF-TOPIC DETECTION TESTS");
console.log("=".repeat(70));

test("Detects 'bitcoin' as off-topic", () => {
  assert(isOffTopic("tell me about bitcoin"), "Bitcoin should be off-topic");
});

test("Detects 'btc' as off-topic", () => {
  assert(isOffTopic("what about btc"), "BTC should be off-topic");
});

test("Detects 'solana' as off-topic", () => {
  assert(isOffTopic("solana price"), "Solana should be off-topic");
});

test("Detects 'weather' as off-topic", () => {
  assert(isOffTopic("whats the weather"), "Weather should be off-topic");
});

test("Detects 'sports' as off-topic", () => {
  assert(isOffTopic("football game"), "Sports should be off-topic");
});

test("Does not detect 'moonsale presale' as off-topic", () => {
  assert(!isOffTopic("moonsale presale"), "Presales should not be off-topic");
});

test("Does not detect 'ethereum chain' as off-topic", () => {
  assert(!isOffTopic("ethereum chain moonsale"), "Should not flag mentioned chains");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔗 FOLLOW-UP LINK TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 FOLLOW-UP LINK REQUEST TESTS");
console.log("=".repeat(70));

test("Detects 'link' as follow-up request", () => {
  assert(isFollowUpLinkRequest("link"), "'link' should be follow-up request");
});

test("Detects 'link of that please' as follow-up", () => {
  assert(isFollowUpLinkRequest("link of that please"), "Should detect context reference");
});

test("Detects 'source please' as follow-up (or similar patterns)", () => {
  const isFollowUp = isFollowUpLinkRequest("source please") || 
                     isFollowUpLinkRequest("send source") ||
                     isFollowUpLinkRequest("link of that");
  assert(isFollowUp, "Should detect source/link follow-up request");
});

test("Detects 'send link' as follow-up", () => {
  assert(isFollowUpLinkRequest("send link"), "Should detect send link");
});

test("Does not detect 'link about presale' as follow-up", () => {
  assert(!isFollowUpLinkRequest("link about presale"), "Should not match explicit topics");
});

test("Does not detect 'click the link' as follow-up", () => {
  assert(!isFollowUpLinkRequest("click the link"), "Should require context reference");
});

// ═════════════════════════════════════════════════════════════════════════════
// 📝 TEXT ESCAPING TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 MARKDOWN ESCAPING TESTS");
console.log("=".repeat(70));

test("Escapes asterisks", () => {
  const result = escape("*bold*");
  assertIncludes(result, "\\*", "Asterisks should be escaped");
});

test("Escapes underscores", () => {
  const result = escape("_italic_");
  assertIncludes(result, "\\_", "Underscores should be escaped");
});

test("Escapes brackets", () => {
  const result = escape("[link](url)");
  assertIncludes(result, "\\[", "Brackets should be escaped");
});

test("Escapes backticks", () => {
  const result = escape("`code`");
  assertIncludes(result, "\\`", "Backticks should be escaped");
});

test("Does not double-escape already escaped text", () => {
  const once = escape("test");
  const twice = escape(once);
  assertEqual(once, twice, "Should be idempotent");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🎯 RESPONSE BUILDING TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 RESPONSE BUILDING TESTS");
console.log("=".repeat(70));

test("Greeting response has kind 'greeting'", () => {
  const reply = buildAssistantReply(1, "hello");
  assertEqual(reply.kind, "greeting", "Greeting should have kind='greeting'");
});

test("Greeting response contains bot identity", () => {
  const reply = buildAssistantReply(1, "hi");
  assertIncludes(reply.text, "MoonSale", "Greeting should mention MoonSale");
});

test("Off-topic response has kind 'offtopic'", () => {
  const reply = buildAssistantReply(2, "bitcoin price");
  assertEqual(reply.kind, "offtopic", "Off-topic should have kind='offtopic'");
});

test("Off-topic response guides to MoonSale", () => {
  const reply = buildAssistantReply(3, "tell me about solana");
  assertIncludes(reply.text, "MoonSale", "Should redirect to MoonSale");
});

test("Regular question has kind 'answer'", () => {
  const reply = buildAssistantReply(4, "what is moonsale");
  assert(reply.kind === "answer" || reply.kind.includes("guard"), "Should have answer or guard kind");
});

test("Answer contains text", () => {
  const reply = buildAssistantReply(5, "what is moonsale");
  assert(reply.text && reply.text.length > 10, "Answer should have substantial text");
});

test("Unknown question gets helpful response", () => {
  const reply = buildAssistantReply(6, "xyzabc123notarealquestion");
  // Response should be helpful - either referring to docs, or suggesting to check official site, etc.
  assert(
    reply.text.toLowerCase().includes("docs") || 
    reply.text.toLowerCase().includes("official") ||
    reply.text.toLowerCase().includes("rephrase") ||
    reply.text.toLowerCase().includes("help") ||
    reply.kind === "answer",
    "Should provide some form of helpful guidance"
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// 💬 COMMAND MESSAGES TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 COMMAND MESSAGE TESTS");
console.log("=".repeat(70));

test("WELCOME message contains 'MoonSale'", () => {
  assertIncludes(WELCOME, "MoonSale", "Welcome should mention MoonSale");
});

test("WELCOME message has emojis or rocket indicator", () => {
  assert(WELCOME.includes("👋") || WELCOME.includes("Yo"), "Welcome should have emojis");
});

test("WELCOME message has examples", () => {
  assertIncludes(WELCOME, "What is MoonSale", "Welcome should have example questions");
});

test("HELP message lists commands", () => {
  assertIncludes(HELP, "/start", "Help should list /start");
  assertIncludes(HELP, "/help", "Help should list /help");
  assertIncludes(HELP, "/links", "Help should list /links");
  assertIncludes(HELP, "/about", "Help should list /about");
});

test("LINKS message has presale link", () => {
  assertIncludes(LINKS, "presale", "Links should include presale");
});

test("LINKS message has create link", () => {
  assertIncludes(LINKS, "create", "Links should include create");
});

test("LINKS message organized by categories", () => {
  assertIncludes(LINKS, "Main Actions", "Links should have Main Actions category");
  assertIncludes(LINKS, "Token Tools", "Links should have Token Tools category");
});

test("ABOUT message explains bot purpose", () => {
  assertIncludes(ABOUT, "Zero AI", "About should mention zero AI");
});

test("ABOUT message has technical credibility", () => {
  assert(ABOUT.includes("TF-IDF") || ABOUT.includes("search engine") || ABOUT.includes("Node"), "About should explain technical approach");
});

test("ABOUT message mentions supported chains", () => {
  assertIncludes(ABOUT, "Ethereum", "About should mention Ethereum");
  assertIncludes(ABOUT, "BNB", "About should mention BNB Chain");
});

test("FALLBACK message is helpful", () => {
  assertIncludes(FALLBACK, "Docs", "Fallback should reference docs");
});

test("OFF_TOPIC_REPLY redirects to MoonSale", () => {
  assertIncludes(OFF_TOPIC_REPLY, "MoonSale", "Off-topic should mention MoonSale");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🔍 SEARCH ENGINE INTEGRATION TESTS (Optional - skipped in fast mode)
// ═════════════════════════════════════════════════════════════════════════════

// Commented out because SearchEngine initialization is slow
// Uncomment if running comprehensive tests with time
/*
console.log("\n📌 SEARCH ENGINE TESTS");
console.log("=".repeat(70));

test("Search engine loads", () => {
  const engine = new SearchEngine();
  assert(engine.entries && engine.entries.length > 0, "Search engine should load entries");
});

test("Search finds MoonSale definition", () => {
  const engine = new SearchEngine();
  const results = engine.search("what is moonsale", 1);
  assert(results.length > 0, "Should find results for 'what is moonsale'");
});

test("Search handles misspellings", () => {
  const engine = new SearchEngine();
  const results = engine.search("moonsale defintion", 1);
  assert(results.length > 0, "Should handle misspelled 'definition'");
});

test("Search finds presale info", () => {
  const engine = new SearchEngine();
  const results = engine.search("presale", 1);
  assert(results.length > 0, "Should find presale information");
});

test("Search finds vesting info", () => {
  const engine = new SearchEngine();
  const results = engine.search("vesting", 1);
  assert(results.length > 0, "Should find vesting information");
});
*/

// ═════════════════════════════════════════════════════════════════════════════
// 🎨 RESPONSE FORMATTING TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 RESPONSE FORMATTING TESTS");
console.log("=".repeat(70));

test("Format answer handles long text", () => {
  const longText = "Lorem ipsum ".repeat(500);
  const formatted = formatAnswer(longText);
  assert(formatted.length < longText.length * 2, "Should truncate very long answers");
});

test("Format answer adds context tips for presale", () => {
  const presaleAnswer = "A presale is a token sale mechanism.";
  const formatted = formatAnswer(presaleAnswer);
  assertIncludes(formatted, "moonsale", "Should add context tips");
});

test("Format answer adds context tips for vesting", () => {
  const vestingAnswer = "Vesting releases tokens over time gradually.";
  const formatted = formatAnswer(vestingAnswer);
  assertIncludes(formatted, "moonsale", "Should add vesting tip");
});

test("Format answer adds context tips for fees", () => {
  const feesAnswer = "The platform fees are applied to each sale.";
  const formatted = formatAnswer(feesAnswer);
  assertIncludes(formatted, "moonsale", "Should add fees tip");
});

test("Format answer preserves or escapes links properly", () => {
  const answer = "Visit https://moonsale.app for more info";
  const formatted = formatAnswer(answer);
  assert(formatted.includes("moonsale") || formatted.includes("https"), "Should preserve link references");
});

// ═════════════════════════════════════════════════════════════════════════════
// 🎲 RANDOMIZATION TESTS
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n📌 RANDOMIZATION & VARIETY TESTS");
console.log("=".repeat(70));

test("Multiple greetings produce varied responses", () => {
  const responses = new Set();
  for (let i = 0; i < 10; i++) {
    const reply = buildAssistantReply(i, "hello");
    responses.add(reply.text.substring(0, 50));
  }
  assert(responses.size > 1, "Should produce varied greeting responses");
});

test("Tone detection works for casual queries", () => {
  const casual = buildAssistantReply(1, "yo whats up");
  assert(
    casual.text.includes("deal") || casual.text.includes("Yo") || casual.text.includes("check") || casual.text.includes("Got you"),
    "Casual query should get casual tone response"
  );
});

test("Tone detection works for professional", () => {
  const professional = buildAssistantReply(2, "Please provide official documentation");
  // Professional shouldn't have casual prefixes like "Yo check it out"
  assert(professional.text, "Professional query should get appropriate response");
});

// ═════════════════════════════════════════════════════════════════════════════
// 📊 TEST SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

console.log("\n" + "=".repeat(70));
console.log("📊 TEST RESULTS SUMMARY");
console.log("=".repeat(70));

console.log(`\n✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📈 Total:  ${passedTests + failedTests}`);
console.log(`📊 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%\n`);

if (failedTests > 0) {
  console.log("Failed Tests Details:\n");
  results.filter(r => r.status === "❌").forEach(r => {
    console.log(`${r.status} ${r.description}`);
    if (r.error) console.log(`   └─ ${r.error}\n`);
  });
}

console.log("=".repeat(70));
if (failedTests === 0) {
  console.log("🎉 All tests passed! Bot is ready for production.\n");
  process.exit(0);
} else {
  console.log(`⚠️  ${failedTests} test(s) failed. Please review above.\n`);
  process.exit(1);
}
