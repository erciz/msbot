/**
 * Reads current Telegram webhook status.
 *
 * Required env:
 * - TELEGRAM_TOKEN
 */

import { loadDotEnvFile } from "./loadEnv.js";
import dns from "node:dns/promises";

loadDotEnvFile();

const token = process.env.TELEGRAM_TOKEN;

function printNetworkHint(err) {
  const text = String(err?.stack || err || "");
  const looksLikeLocalhostResolution =
    text.includes("127.0.0.1") || text.includes("::1") || text.includes("ECONNREFUSED");

  console.error("Network error while calling Telegram API.");

  if (looksLikeLocalhostResolution) {
    console.error("It looks like api.telegram.org is resolving to localhost on this machine.");
    console.error("Check DNS settings/router filters and verify: Resolve-DnsName api.telegram.org");
    console.error("Expected public IPs (for example): 149.154.166.110");
  }

  console.error(`Details: ${err?.message || err}`);
}

async function warnIfTelegramDnsLooksBlocked() {
  try {
    const records = await dns.lookup("api.telegram.org", { all: true });
    const addresses = records.map(r => r.address);
    const hasLoopback = addresses.includes("127.0.0.1") || addresses.includes("::1");

    if (hasLoopback) {
      console.error("DNS warning: api.telegram.org resolves to loopback on this machine.");
      console.error(`Resolved: ${addresses.join(", ")}`);
    }
  } catch {
    // Ignore DNS pre-check failures.
  }
}

if (!token) {
  console.error("Missing TELEGRAM_TOKEN.");
  console.error("PowerShell: $env:TELEGRAM_TOKEN=\"your_token_here\"");
  console.error("CMD: set TELEGRAM_TOKEN=your_token_here");
  process.exit(1);
}

let data;

try {
  await warnIfTelegramDnsLooksBlocked();

  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  data = await res.json();
} catch (err) {
  printNetworkHint(err);
  process.exit(1);
}

console.log("getWebhookInfo response:");
console.log(JSON.stringify(data, null, 2));

if (!data.ok) {
  process.exit(1);
}
