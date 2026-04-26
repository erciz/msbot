# Telegram Bot Setup Guide (Step by Step)

This file explains exactly how your MoonSale bot connects to Telegram API, how to deploy it, and how to add it to your group.

## 1. How the bot connects to Telegram API

You do not manually attach the bot to an API panel.
Connection is done with your bot token from BotFather.

The token is used in requests to Telegram Bot API endpoints:
- getUpdates (receive messages)
- sendMessage (send replies)
- setWebhook (webhook mode)

Your project supports 2 connection modes:

1. Webhook mode
- Telegram pushes updates to your deployed endpoint.
- Your endpoint is: /api/telegram
- Best for Vercel.

2. Direct polling mode (no webhook)
- Bot continuously calls getUpdates and replies with sendMessage.
- Best for VPS/local server, especially when webhook setup is difficult.

## 2. Important security first

Your token was exposed in chat.
Do this first:

1. Open BotFather
2. Regenerate token for MoonsaleAssistantBot
3. Replace old token everywhere (.env, Vercel env vars)

Never reuse the exposed token.

## 3. Prepare project

Run in project folder:

npm install
npm run build

## 4. Create .env file

Create or update .env in project root:

TELEGRAM_TOKEN=YOUR_NEW_TOKEN
BOT_USERNAME=MoonsaleAssistantBot
GROUP_MENTION_ONLY=true

Optional for webhook helper scripts:
PUBLIC_WEBHOOK_BASE_URL=https://your-project.vercel.app
TELEGRAM_WEBHOOK_SECRET=YOUR_RANDOM_SECRET

Optional for no-webhook mode:
REMOVE_WEBHOOK_ON_START=true
TELEGRAM_POLL_TIMEOUT=30
TELEGRAM_POLL_IDLE_MS=800
TELEGRAM_POLL_ERROR_MS=3000

## 5. Option A: Deploy on Vercel (webhook mode)

### Step A. Push code

git add .
git commit -m "telegram deployment setup"
git push

### Step B. Deploy on Vercel

1. Import repo in Vercel.
2. Framework preset: Other.
3. Build command: leave empty (or npm install).
4. Output directory: use project config.
5. Deploy.

### Step C. Add env vars in Vercel project settings

Add these:
- TELEGRAM_TOKEN
- TELEGRAM_WEBHOOK_SECRET
- GROUP_MENTION_ONLY=true
- BOT_USERNAME=MoonsaleAssistantBot

Redeploy after adding env vars.

### Step D. Register webhook

From a machine/network that can reach api.telegram.org:

PowerShell:
$env:TELEGRAM_TOKEN="YOUR_NEW_TOKEN"
$env:PUBLIC_WEBHOOK_BASE_URL="https://your-project.vercel.app"
$env:TELEGRAM_WEBHOOK_SECRET="YOUR_RANDOM_SECRET"
npm run webhook:set
npm run webhook:info

Expected:
- webhook URL ends with /api/telegram
- getWebhookInfo returns ok true

## 6. Option B: No webhook mode (direct API polling)

Use this if webhook is blocked or not needed.

Run:

npm run bot:api

This mode:
- calls Telegram API directly (getUpdates/sendMessage)
- auto tries deleteWebhook on startup
- works best on a VPS with unblocked Telegram access

If local network blocks Telegram, run this on VPS/cloud.

## 7. Keep bot running 24/7 (recommended for polling mode)

On Linux VPS:

npm install -g pm2
pm2 start npm --name msbot -- run bot:api
pm2 save
pm2 startup

Logs:

pm2 logs msbot

### Windows / local PC with PM2

Your previous command failed because PM2 on Windows did not interpret:

pm2 start npm --name msbot -- run bot:api

the way you expected.

Use the included PM2 ecosystem file instead:

npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 logs msbot

To restart after code/env changes:

pm2 restart msbot

To stop:

pm2 stop msbot

To delete:

pm2 delete msbot

### About `pm2 startup` on Windows

`pm2 startup` usually works on Linux systems with systemd/init.
On normal Windows PowerShell it commonly shows:

`Init system not found`

That is expected.

If you want auto-start on Windows, use one of these:

1. Run bot on a Linux VPS instead (recommended)
2. Use Windows Task Scheduler to run this at login/startup:

pm2 resurrect

Before that, save the current PM2 process list:

pm2 save

## 8. BotFather settings required for group replies

In BotFather:

1. /setprivacy -> select MoonsaleAssistantBot -> Disable
2. /setjoingroups -> Enable
3. Optional /setcommands:
   - start - Welcome
   - help - Help
   - links - Useful links
   - about - About bot

## 9. Add bot to Telegram group/community

1. Add @MoonsaleAssistantBot to group.
2. Ensure bot can send messages.
3. Because GROUP_MENTION_ONLY=true:
   - bot replies when tagged, for example:
     @MoonsaleAssistantBot what is moonsale
   - bot replies if user replies to a bot message
   - bot ignores unrelated group messages

If you want replies to every group message, set:

GROUP_MENTION_ONLY=false

## 10. Quick test checklist

Private chat test:
1. Send /start
2. Ask: what is moonsale

Group test:
1. Send: @MoonsaleAssistantBot tokenomics
2. Send: @MoonsaleAssistantBot link of that please

Expected: bot replies.

## 11. Troubleshooting

### Error: Missing TELEGRAM_TOKEN
- Set token in .env or shell environment.

### webhook:set fails with DNS warning localhost
- Your network resolves api.telegram.org to 127.0.0.1 or ::1.
- Use unblocked network/VPS.

### Bot works in DM but not group
- Privacy mode likely still enabled.
- Disable via BotFather /setprivacy.

### No reply in group while mention-only enabled
- You must mention @MoonsaleAssistantBot or reply to bot message.

### Running both webhook and polling together
- Avoid running both at same time for same token.
- Use one mode at a time.

### POLL ERROR 409 (another getUpdates request)
If you see:

`Conflict: terminated by other getUpdates request`

it means another polling client is using the same token.

Fix steps:

1. Keep only one poller.
2. On this machine run:

pm2 delete all
pm2 start ecosystem.config.cjs --only msbot
pm2 save

3. Do not run `npm run bot:api` in another terminal while PM2 is running.
4. Verify webhook is disabled:

npm run webhook:info

Expected: `"url": ""`

5. If 409 still appears, another server/device is polling with the same token.
   - Stop old bot instances everywhere, or
   - Rotate token in BotFather and update `.env`.

## 12. If you see your current error (DNS loopback)

If logs show:
- `api.telegram.org resolves to loopback`
- `Resolved: ::1, 127.0.0.1`
- `fetch failed`

Then this machine/network cannot reach Telegram API.
It is not a code bug.

### What to do immediately

1. Rotate bot token in BotFather (token was exposed).
2. Put the new token in `.env`.
3. Add in `.env`:

TELEGRAM_TOKEN=YOUR_NEW_TOKEN
BOT_USERNAME=MoonsaleAssistantBot
GROUP_MENTION_ONLY=true
REMOVE_WEBHOOK_ON_START=true

4. Run bot on a VPS or network where Telegram is reachable.

### Verify network before starting

PowerShell:

Resolve-DnsName api.telegram.org

Good result: public IP (example `149.154.x.x`), not localhost.

### Start no-webhook mode on server

npm install
npm run build
npm run bot:api

### Keep it alive

npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
Linux only: pm2 startup

### Final group checks

1. BotFather `/setprivacy` -> Disable
2. Add bot to group
3. Mention test:

@MoonsaleAssistantBot what is moonsale
