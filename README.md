# MoonSale Telegram Bot — Node.js

24/7 support bot for moonsale.app  
Smart search engine · No AI cost · No GPU · Runs free on Render

---

## Quick Start

### 1. Install
```
npm install
```

### 2. Scrape MoonSale (uses real Chrome via Puppeteer)
```
npm run scrape
```

### 3. Build knowledge base
```
npm run build
```

### 4. Test search engine
```
npm run search
```
Type questions and verify answers look correct.

### 5. Create Telegram bot
- Open Telegram → search @BotFather → /newbot
- Name it "MoonSale Assistant"
- Copy the token BotFather gives you

### 6. Run the bot
**Windows:**
```
set TELEGRAM_TOKEN=your_token_here
npm run bot
```

**Mac / Linux:**
```
export TELEGRAM_TOKEN=your_token_here
npm run bot
```

---

## Deploy on Render (free, 24/7)

1. Push this folder to a GitHub repo
2. Go to render.com → New → Web Service
3. Connect your repo
4. Set:
   - Build command: `npm install && npm run scrape && npm run build`
   - Start command: `npm run bot`
5. Add environment variable: `TELEGRAM_TOKEN = your_token`
6. Deploy

---

## File structure

```
moonsale-bot-js/
├── scraper.js            ← Scrapes moonsale.app with Puppeteer
├── buildKnowledgeBase.js ← Builds searchable knowledge_base.json
├── searchEngine.js       ← TF-IDF + fuzzy search (no AI)
├── bot.js                ← Telegram bot
├── package.json
├── README.md
└── moonsale_data/        ← Created after running scraper
    ├── pages/            ← One .txt file per scraped page
    ├── corpus.json       ← All scraped data combined
    ├── knowledge_base.json ← Optimised for search
    └── report.txt        ← Scrape summary
```

---

## Add more Q&A pairs

Open `buildKnowledgeBase.js` and add to the `MANUAL_QA` array:

```js
{
  question: "Your question here?",
  answer:   "Your accurate answer here.",
  tags:     ["presale"],
},
```

Then re-run `npm run build` and restart the bot.

---

## Keep data fresh

When MoonSale updates (new features, fee changes):
```
npm run setup   ← re-scrapes AND rebuilds in one command
npm run bot
```
