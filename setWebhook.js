/**
 * Registers Telegram webhook to Vercel endpoint.
 *
 * Required env:
 * - TELEGRAM_TOKEN
 * - PUBLIC_WEBHOOK_BASE_URL (example: https://your-app.vercel.app)
 *
 * Optional env:
 * - TELEGRAM_WEBHOOK_SECRET
 */

import { loadDotEnvFile } from "./loadEnv.js";
import dns from "node:dns/promises";

loadDotEnvFile();

const token = process.env.TELEGRAM_TOKEN;
const baseUrlInput = process.env.PUBLIC_WEBHOOK_BASE_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";

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

if (!baseUrlInput) {
  console.error("Missing PUBLIC_WEBHOOK_BASE_URL (example: https://your-app.vercel.app).");
  console.error("PowerShell: $env:PUBLIC_WEBHOOK_BASE_URL=\"https://your-app.vercel.app\"");
  process.exit(1);
}

const normalizedBase = baseUrlInput.startsWith("http")
  ? baseUrlInput
  : `https://${baseUrlInput}`;

const webhookUrl = `${normalizedBase.replace(/\/+$/, "")}/api/telegram`;

const payload = {
  url: webhookUrl,
  allowed_updates: ["message", "edited_message"],
  drop_pending_updates: false,
};

if (secret) {
  payload.secret_token = secret;
}

let data;

try {
  await warnIfTelegramDnsLooksBlocked();

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  data = await res.json();
} catch (err) {
  printNetworkHint(err);
  process.exit(1);
}

console.log("setWebhook response:");
console.log(JSON.stringify(data, null, 2));

if (!data.ok) {
  process.exit(1);
}

console.log(`Webhook registered: ${webhookUrl}`);
