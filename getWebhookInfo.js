/**
 * Reads current Telegram webhook status.
 *
 * Required env:
 * - TELEGRAM_TOKEN
 */

const token = process.env.TELEGRAM_TOKEN;

if (!token) {
  console.error("Missing TELEGRAM_TOKEN.");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
const data = await res.json();

console.log("getWebhookInfo response:");
console.log(JSON.stringify(data, null, 2));

if (!data.ok) {
  process.exit(1);
}
