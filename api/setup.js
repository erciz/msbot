/**
 * One-time setup endpoint — call this after deploying to Vercel to register
 * the webhook with Telegram. Vercel's servers call Telegram directly, so no
 * local DNS block issue.
 *
 * GET  /api/setup?secret=<SETUP_SECRET>
 *   → registers the webhook and returns status
 *
 * Protect it with SETUP_SECRET env var on Vercel so only you can trigger it.
 */

const TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const SETUP_SECRET = process.env.SETUP_SECRET || "";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  if (!TOKEN) {
    res.status(500).json({ ok: false, error: "missing_TELEGRAM_TOKEN" });
    return;
  }

  // Guard with a secret query param so random visitors can't trigger this.
  if (SETUP_SECRET) {
    const provided = String(req.query?.secret || "");
    if (!provided || provided !== SETUP_SECRET) {
      res.status(401).json({ ok: false, error: "invalid_secret" });
      return;
    }
  }

  // Derive the webhook URL from the incoming request host.
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  const webhookUrl = `${protocol}://${host}/api/telegram`;

  const payload = {
    url: webhookUrl,
    allowed_updates: ["message", "edited_message"],
    drop_pending_updates: true,
  };

  if (WEBHOOK_SECRET) {
    payload.secret_token = WEBHOOK_SECRET;
  }

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await tgRes.json();

    if (data.ok) {
      res.status(200).json({
        ok: true,
        webhook_url: webhookUrl,
        telegram_response: data,
      });
    } else {
      res.status(502).json({ ok: false, telegram_response: data });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
