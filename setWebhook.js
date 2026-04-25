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

const token = process.env.TELEGRAM_TOKEN;
const baseUrlInput = process.env.PUBLIC_WEBHOOK_BASE_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";

if (!token) {
  console.error("Missing TELEGRAM_TOKEN.");
  process.exit(1);
}

if (!baseUrlInput) {
  console.error("Missing PUBLIC_WEBHOOK_BASE_URL (example: https://your-app.vercel.app).");
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

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
});

const data = await res.json();

console.log("setWebhook response:");
console.log(JSON.stringify(data, null, 2));

if (!data.ok) {
  process.exit(1);
}

console.log(`Webhook registered: ${webhookUrl}`);
