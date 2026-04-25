# MoonSale Telegram Bot

MoonSale support bot with smart retrieval from MoonSale data.

This project now supports two runtimes:
- Long polling runtime (local machine or VPS): bot.js
- Webhook runtime for Vercel: api/telegram.js

## 1. Local setup

### Install
```bash
npm install
```

### Build data
```bash
npm run scrape
npm run build
```

### Test answers locally
```bash
npm run search
```

### Run long polling bot locally
Windows:
```powershell
$env:TELEGRAM_TOKEN="your_token_here"
npm run bot
```

Mac/Linux:
```bash
export TELEGRAM_TOKEN=your_token_here
npm run bot
```

### Run no-webhook mode (direct Telegram API polling)
This mode uses `getUpdates` and `sendMessage` directly.

Windows PowerShell:
```powershell
$env:TELEGRAM_TOKEN="your_token_here"
npm run bot:api
```

Mac/Linux:
```bash
export TELEGRAM_TOKEN=your_token_here
npm run bot:api
```

Notes:
- This mode auto-disables webhook on startup (`deleteWebhook`) so polling can work.
- Keep the process running continuously (local machine/VPS).
- If Telegram is blocked on your network, run this on an unblocked VPS or different network.
- Optional: set `TELEGRAM_API_BASE_URL` if you use a reachable Telegram API proxy endpoint.

## 2. Deploy on Vercel (recommended)

Important: Vercel should use webhook mode, not long polling.

### Step A: Push code to GitHub
Commit and push your repository, including:
- api/telegram.js
- assistantCore.js
- moonsale_data/knowledge_base.json
- vercel.json

### Step B: Create Vercel project
1. Open Vercel dashboard.
2. Import your GitHub repository.
3. Framework preset: Other.
4. Build Command: leave empty (or npm install).
5. Output Directory: leave empty.
6. Deploy.

### Step C: Add environment variables in Vercel
Project Settings -> Environment Variables:
- TELEGRAM_TOKEN = your BotFather token
- TELEGRAM_WEBHOOK_SECRET = any strong random string (recommended)

Redeploy after adding variables.

### Step D: Register Telegram webhook
Use your Vercel production domain.

Windows PowerShell:
```powershell
$env:TELEGRAM_TOKEN="your_token_here"
$env:PUBLIC_WEBHOOK_BASE_URL="https://your-project.vercel.app"
$env:TELEGRAM_WEBHOOK_SECRET="your_secret_here"
npm run webhook:set
npm run webhook:info
```

Windows CMD:
```bat
set TELEGRAM_TOKEN=your_token_here
set PUBLIC_WEBHOOK_BASE_URL=https://your-project.vercel.app
set TELEGRAM_WEBHOOK_SECRET=your_secret_here
npm run webhook:set
npm run webhook:info
```

Mac/Linux:
```bash
export TELEGRAM_TOKEN=your_token_here
export PUBLIC_WEBHOOK_BASE_URL=https://your-project.vercel.app
export TELEGRAM_WEBHOOK_SECRET=your_secret_here
npm run webhook:set
npm run webhook:info
```

Expected result:
- webhook URL ends with /api/telegram
- getWebhookInfo shows no recent errors

## 3. Telegram bot integration checklist

1. Open @BotFather
2. /newbot (if not created yet)
3. Copy bot token
4. Optional: /setcommands and add:
   - start - Welcome
   - help - Help
   - links - Useful links
   - about - About bot

## 4. Add bot to community group and make it answer messages

### Step A: Add bot to group
- Open your group
- Add the bot as a member

### Step B: Disable privacy mode (critical)
If privacy mode is ON, the bot only sees commands/mentions.

In @BotFather:
- /setprivacy
- Select your bot
- Choose Disable

### Step C: Ensure message permission
- Group settings -> bot permissions
- Allow sending messages/replies

### Step D: Test in group
Send normal text messages like:
- What is MoonSale?
- tokenomics
- QUANTIFI
- link of that please

Bot will reply in group threads/messages when it receives text updates.

### Optional: Mention-only mode in groups
If you want less spam in large groups, enable mention-only mode.

Add in `.env`:
```env
GROUP_MENTION_ONLY=true
BOT_USERNAME=MoonsaleAssistantBot
```

Behavior:
- Private chat: replies normally
- Group chat: replies only when tagged (`@MoonsaleAssistantBot`) or when users reply directly to a bot message

## 5. Useful scripts

```bash
npm run scrape
npm run build
npm run search
npm run bot
npm run bot:api
npm run webhook:set
npm run webhook:info
```

## 6. How replies are generated

- searchEngine.js: retrieval and intent logic
- assistantCore.js: shared chat behavior, tone, follow-up link memory
- bot.js: polling runtime
- api/telegram.js: Vercel webhook runtime

## 7. Troubleshooting

### npm run bot exits with code 1
Usually TELEGRAM_TOKEN is missing.

### Webhook set works but bot does not answer
Check:
1. TELEGRAM_TOKEN in Vercel env
2. TELEGRAM_WEBHOOK_SECRET matches webhook requests
3. Bot privacy mode disabled
4. Group permissions allow bot messages
5. npm run webhook:info for last_error_message

### Bot replies in private chat but not group
Most common reason: privacy mode is still enabled.

### Telegram is blocked on local network
If `api.telegram.org` resolves to `127.0.0.1` or `::1`, Telegram API is blocked on your network.

Use one of these:
1. Run bot on an unblocked VPS (recommended)
2. Use a different network/hotspot
3. Use a reachable Telegram API proxy endpoint and set `TELEGRAM_API_BASE_URL`

## 8. Updating knowledge base later

Add future custom Q/A in:
- moonsale_data/custom_qa.json

Then rebuild and redeploy:
```bash
npm run build
```
