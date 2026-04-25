/**
 * MoonSale Knowledge Base Builder
 * =================================
 * Converts scraped corpus.json + manual Q&A pairs
 * into a structured knowledge_base.json optimised for fast search.
 *
 * Run: npm run build
 */

import fs   from "fs";
import path from "path";

const DATA_DIR = "./moonsale_data";
const KB_FILE  = path.join(DATA_DIR, "knowledge_base.json");
const CUSTOM_QA_FILE = path.join(DATA_DIR, "custom_qa.json");

const CUSTOM_QA_TEMPLATE = [];

function ensureCustomQAFile() {
  if (fs.existsSync(CUSTOM_QA_FILE)) return;

  fs.writeFileSync(
    CUSTOM_QA_FILE,
    JSON.stringify(CUSTOM_QA_TEMPLATE, null, 2),
    "utf8"
  );
  console.log(`  Created custom QA file: ${CUSTOM_QA_FILE}`);
}

function loadCustomQA() {
  ensureCustomQAFile();

  try {
    const raw = JSON.parse(fs.readFileSync(CUSTOM_QA_FILE, "utf8"));
    if (!Array.isArray(raw)) return [];

    return raw
      .filter(item => item && typeof item === "object")
      .map(item => ({
        question: String(item.question || "").trim(),
        answer: String(item.answer || "").trim(),
        tags: Array.isArray(item.tags) ? item.tags.map(t => String(t).trim()).filter(Boolean) : ["custom"],
      }))
      .filter(item => item.question && item.answer);
  } catch (err) {
    console.log(`  ⚠  Could not parse custom QA file: ${err.message}`);
    return [];
  }
}

// ── Manual Q&A pairs — always included, highest priority ─────────────────────
// Add more here any time. These are guaranteed-accurate answers.
const MANUAL_QA = [
  {
    question: "What is MoonSale?",
    answer:   "MoonSale is an open, permissionless token launchpad for BNB Chain and Ethereum. It supports fixed-rate presales and fair launches with built-in security: auto liquidity locking, on-chain refunds, early withdrawal protection, token vesting — all enforced by audited smart contracts with an A+ score.",
    tags:     ["general", "how_it_works"],
  },
  {
    question: "Which blockchains does MoonSale support?",
    answer:   "MoonSale currently supports BNB Chain (BSC) and Ethereum. More chains are planned.",
    tags:     ["bnb", "ethereum", "chains"],
  },
  {
    question: "What happens if a presale doesn't reach its softcap?",
    answer:   "If the softcap is not reached, all contributors can claim a full refund directly from the smart contract — no admin needed, no delays. The refund is enforced on-chain automatically.",
    tags:     ["refund", "presale", "softcap", "security"],
  },
  {
    question: "Is liquidity locked after a presale finalizes?",
    answer:   "Yes. LP tokens are locked automatically the moment a presale or fair launch finalizes. Creators cannot withdraw LP tokens during the lock period. The admin also enforces minimum lock durations so creators can't set a 1-day lock to bypass protection.",
    tags:     ["liquidity", "security", "lp", "lock"],
  },
  {
    question: "Can I withdraw my contribution early?",
    answer:   "Yes. You can withdraw your contribution while the sale is still active. A small penalty applies to deter bad actors from manipulating the sale.",
    tags:     ["withdraw", "contributor", "presale"],
  },
  {
    question: "What is the difference between a presale and a fair launch?",
    answer:   "A presale is a fixed-rate sale — the token price is set in advance with a hardcap. A fair launch has no fixed price — the final price is determined by the total amount raised (price discovery model). Both are fully on-chain and permissionless.",
    tags:     ["presale", "fair_launch"],
  },
  {
    question: "Do I need approval to launch on MoonSale?",
    answer:   "No. MoonSale is fully permissionless. There is no approval process, no whitelist, and no KYC gate for project creators. Anyone can deploy a presale or fair launch directly without admin permission.",
    tags:     ["presale", "fair_launch", "how_it_works", "permissionless"],
  },
  {
    question: "What is a KYC badge on MoonSale?",
    answer:   "A KYC badge means the project creator's identity has been manually verified by MoonSale admins. The badge includes a link to the verification proof. KYC badges are NOT self-reported — every badge is reviewed by the team.",
    tags:     ["kyc", "security", "badge"],
  },
  {
    question: "What is an Audit badge?",
    answer:   "An Audit badge means the project's smart contract has been independently audited. The badge links to the full audit report. Like KYC badges, audit badges are manually reviewed — not self-reported.",
    tags:     ["audit", "security", "badge"],
  },
  {
    question: "Are MoonSale platform contracts audited?",
    answer:   "Yes. All MoonSale platform contracts were independently audited before mainnet deployment. The audit covers 7 contracts on both BSC and Ethereum — including presale, fair launch, token lock, token vesting, and token factory contracts. All received an A+ score with zero critical, high, or medium issues found.",
    tags:     ["audit", "security", "contracts"],
  },
  {
    question: "How do I create a presale on MoonSale?",
    answer:   "Go to moonsale.app/create, connect your wallet, enter your token address, set your presale rate, softcap, hardcap, liquidity percentage, and lock duration. Configure optional vesting, then deploy — all in a single transaction (atomic deploy).",
    tags:     ["presale", "create", "how_it_works"],
  },
  {
    question: "How do I create a fair launch on MoonSale?",
    answer:   "Go to moonsale.app/create-fair-launch, connect your wallet, and set your fair launch parameters. With a fair launch there is no fixed token price — the price is determined by the total BNB or ETH raised when the sale finalizes.",
    tags:     ["fair_launch", "create", "how_it_works"],
  },
  {
    question: "What is token vesting on MoonSale?",
    answer:   "Vesting releases tokens to contributors gradually over time instead of all at once. You can configure a TGE (Token Generation Event) unlock percentage, a cliff period, a vesting duration, and a start date. Standalone vesting contracts are available at moonsale.app/vesting.",
    tags:     ["vesting", "tge", "tokens"],
  },
  {
    question: "What is the token lock tool?",
    answer:   "The token lock tool at moonsale.app/lock lets you lock any ERC-20 token or LP token for a set period. Admin-enforced minimum durations prevent very short lock periods. It works independently of presales — you can lock any token.",
    tags:     ["lock", "token_lock", "tools"],
  },
  {
    question: "What happens when a presale finalizes?",
    answer:   "When a presale finalizes after hitting its softcap, liquidity automatically flows to PancakeSwap (BNB Chain) or Uniswap (Ethereum). LP tokens are locked instantly. Contributors receive their tokens. No manual steps are needed from the project creator.",
    tags:     ["presale", "finalize", "liquidity", "dex"],
  },
  {
    question: "Which DEXs does MoonSale list tokens on?",
    answer:   "MoonSale automatically lists on PancakeSwap for BNB Chain projects and Uniswap for Ethereum projects. Liquidity flows there automatically upon presale or fair launch finalization.",
    tags:     ["dex", "pancakeswap", "uniswap", "liquidity"],
  },
  {
    question: "What is the MoonSale token generator?",
    answer:   "The token generator at moonsale.app/create-token lets you deploy your own ERC-20 token with mint, burn, and ownership controls — no coding required. You can also use an existing token for your presale.",
    tags:     ["token_create", "erc20", "tools"],
  },
  {
    question: "What is the token scanner?",
    answer:   "The token scanner at moonsale.app/token-scanner lets investors analyse any token for potential risks — honeypots, ownership, tax, liquidity — before investing.",
    tags:     ["scanner", "security", "investor", "tools"],
  },
  {
    question: "What is the tokenomics creator?",
    answer:   "The tokenomics creator at moonsale.app/tokenomics-creator helps project creators design and visualise their token distribution before launching — showing how tokens are allocated across team, presale, liquidity, marketing, etc.",
    tags:     ["tokenomics", "tools", "create"],
  },
  {
    question: "What is MoonSale BuyBot?",
    answer:   "MoonSale BuyBot is a Telegram bot (@moonsale_buybot) that tracks and announces token purchases in real time for projects launched on MoonSale.",
    tags:     ["buybot", "telegram", "general"],
  },
  {
    question: "Who created MoonSale?",
    answer:   "MoonSale is a product of IGH (ICO Gem Hunters), a crypto project discovery and marketing platform.",
    tags:     ["general", "team"],
  },
  {
    question: "Where can I see all active presales?",
    answer:   "You can browse all active, upcoming, and ended presales at moonsale.app/presale.",
    tags:     ["presale", "browse", "investor"],
  },
  {
    question: "Is MoonSale safe to use?",
    answer:   "MoonSale is built on audited smart contracts with zero critical issues. All funds are held in verifiable on-chain contracts — not in a multisig or off-chain system. LP tokens lock at finalization and on-chain refunds are available if softcap isn't met. However, MoonSale is permissionless so anyone can launch — always check KYC and Audit badges before investing in any project.",
    tags:     ["security", "safe", "general"],
  },
  {
    question: "What is atomic deploy on MoonSale?",
    answer:   "Atomic deploy means your entire presale setup — token approval, contract creation, and configuration — happens in a single blockchain transaction. There is no multi-step setup process that could fail halfway.",
    tags:     ["presale", "atomic", "create", "how_it_works"],
  },
  {
    question: "What is the max creator unlock percentage?",
    answer:   "MoonSale admins enforce a maximum creator unlock percentage rule. This prevents project creators from setting vesting parameters that would let them dump all tokens immediately after launch.",
    tags:     ["vesting", "security", "creator"],
  },
  {
    question: "How do I invest in a presale on MoonSale?",
    answer:   "Go to moonsale.app/presale, find a project you want to invest in, connect your wallet, and contribute BNB (for BSC presales) or ETH (for Ethereum presales). Your contribution is held in the smart contract until the presale finalizes or fails.",
    tags:     ["investor", "presale", "contribute", "how_it_works"],
  },
  {
    question: "What is token management on MoonSale?",
    answer:   "The token management dashboard at moonsale.app/token-management lets you manage tokens you've created or launched — including ownership controls, mint/burn functions, and viewing your token's details.",
    tags:     ["token_management", "tools", "creator"],
  },
  {
    question: "What wallets work with MoonSale?",
    answer:   "MoonSale works with any Web3 wallet that supports BNB Chain and Ethereum — including MetaMask, Trust Wallet, WalletConnect-compatible wallets, and most popular browser extension wallets.",
    tags:     ["wallet", "metamask", "connect"],
  },
  {
    question: "Are testnets available on MoonSale?",
    answer:   "Yes. MoonSale supports BNB Smart Chain and Ethereum, including their testnets, as documented in the investor guide.",
    tags:     ["testnet", "bnb", "ethereum", "investor"],
  },
  {
    question: "How is fair launch price calculated?",
    answer:   "In a fair launch, final token price is determined at finalization by dividing the total amount raised by the total token pool.",
    tags:     ["fair_launch", "investor", "how_it_works"],
  },
  {
    question: "Do fair launches have a hardcap?",
    answer:   "No. Fair launches do not have a fixed token price or hardcap. The key parameters are token pool and softcap.",
    tags:     ["fair_launch", "softcap", "investor"],
  },
  {
    question: "How do I claim tokens after a successful sale?",
    answer:   "After a sale is finalized successfully, go to the sale page and click Claim where the Buy or Contribute button was, then confirm the transaction.",
    tags:     ["claim", "investor", "presale", "fair_launch"],
  },
  {
    question: "Is there a deadline for refunds?",
    answer:   "No. If a sale fails softcap or is cancelled, investors can claim a full refund at any time with no refund deadline.",
    tags:     ["refund", "investor", "softcap"],
  },
  {
    question: "What happens if my wallet is not whitelisted?",
    answer:   "If a sale has whitelist enabled and your wallet is not approved by the creator, your contribution transaction will be rejected.",
    tags:     ["whitelist", "investor", "presale", "fair_launch"],
  },
  {
    question: "How many presales are shown by default in browse page?",
    answer:   "The All Presales page shows 12 listings by default, and View More loads 8 additional listings per click.",
    tags:     ["presale", "investor", "browse"],
  },
  {
    question: "When does a creator need to pay listing fee?",
    answer:   "After deploying a presale or fair launch, the creator must pay the listing fee before the sale page becomes publicly visible.",
    tags:     ["fees", "listing_fee", "creator", "presale", "fair_launch"],
  },
  {
    question: "Can a creator cancel a pending sale and withdraw tokens?",
    answer:   "Yes. If listing fee is not paid and status is Pending, the creator can cancel and withdraw deposited tokens.",
    tags:     ["creator", "cancel", "presale", "fair_launch"],
  },
  {
    question: "Can a creator cancel an active sale?",
    answer:   "Yes. A creator can cancel an Active sale that has not reached softcap.",
    tags:     ["creator", "cancel", "softcap", "presale", "fair_launch"],
  },
  {
    question: "How do creators finalize sales?",
    answer:   "After sale end and softcap reached, creators finalize manually from My Launches. Finalization adds DEX liquidity and enables contributor claims.",
    tags:     ["creator", "finalize", "presale", "fair_launch", "liquidity"],
  },
  {
    question: "Is token lock the same as liquidity lock?",
    answer:   "No. Token Lock is a separate tool used to lock team or allocation tokens for a fixed period. Liquidity lock is handled in launch finalization flow.",
    tags:     ["lock", "token_lock", "liquidity", "creator"],
  },
  {
    question: "Where can I view token lock details?",
    answer:   "Each token lock has a shareable detail page at /token-lock/[lockId]. Active locks are visible under My Locks with a View Lock button.",
    tags:     ["token_lock", "tools", "creator"],
  },
  {
    question: "What is the fee for token lock?",
    answer:   "The token lock tool fee is 0.01 BNB.",
    tags:     ["fees", "token_lock", "tools"],
  },
  {
    question: "What is the fee for token vesting contract creation?",
    answer:   "The token vesting tool fee is 0.01 BNB.",
    tags:     ["fees", "vesting", "tools"],
  },
  {
    question: "What is the token management action fee?",
    answer:   "Token management actions charge a 0.005 BNB management fee per action.",
    tags:     ["fees", "token_management", "tools"],
  },
  {
    question: "What does the token scanner check?",
    answer:   "MoonSale token scanner checks for honeypots, hidden owners, dangerous mint functions, tax rates, and top-holder concentration.",
    tags:     ["scanner", "security", "tools", "investor"],
  },
  {
    question: "What does tokenomics creator produce?",
    answer:   "Tokenomics Creator generates an allocation table and donut chart and supports export as PDF to present token distribution clearly to investors.",
    tags:     ["tokenomics", "tools", "creator", "investor"],
  },
  {
    question: "How are platform fees described on MoonSale?",
    answer:   "Listing fee is paid once after deployment in the native chain token. Platform fees are enforced on-chain at finalization and are verifiable on-chain with no hidden fees.",
    tags:     ["fees", "listing_fee", "security"],
  },
  {
    question: "What is the listing fee in the whitepaper model?",
    answer:   "The whitepaper states a $100 listing fee per presale or fair launch.",
    tags:     ["fees", "listing_fee", "whitepaper"],
  },
  {
    question: "What is the raise fee in the whitepaper model?",
    answer:   "The whitepaper states a 2% fee on total funds raised, collected at finalization.",
    tags:     ["fees", "whitepaper", "presale", "fair_launch"],
  },
  {
    question: "How is revenue shared with MOON stakers?",
    answer:   "The whitepaper model allocates 60% of platform revenue to MOON stakers, distributed proportionally to stake.",
    tags:     ["moon", "staking", "revenue", "whitepaper"],
  },
  {
    question: "What are MOON token utilities?",
    answer:   "MOON utility is described as revenue sharing plus DAO governance voting power in the MoonSale ecosystem.",
    tags:     ["moon", "dao", "governance", "whitepaper"],
  },
  {
    question: "Do MOON stakers have fixed lock periods?",
    answer:   "In the whitepaper model, MOON stakers do not need fixed lock periods and can unstake at any time.",
    tags:     ["moon", "staking", "whitepaper"],
  },
  {
    question: "How does MoonSale DAO voting work?",
    answer:   "The whitepaper describes token-weighted voting at one staked MOON per vote, with a 7-day voting period.",
    tags:     ["dao", "governance", "moon", "whitepaper"],
  },
  {
    question: "What is required to submit a DAO proposal?",
    answer:   "The whitepaper states proposal submission requires at least 1,000,000 MOON.",
    tags:     ["dao", "governance", "moon", "whitepaper"],
  },
  {
    question: "What DAO participation is needed for proposals to pass?",
    answer:   "The whitepaper model requires a simple majority with at least 5% of total staked MOON participation.",
    tags:     ["dao", "governance", "moon", "whitepaper"],
  },
  {
    question: "Is MOON token supply inflationary?",
    answer:   "The whitepaper states fixed supply at 1,000,000,000 MOON with no inflation and no additional minting after deployment.",
    tags:     ["moon", "tokenomics", "whitepaper"],
  },
  {
    question: "What is Special Vetted Launch (SVL)?",
    answer:   "SVL is described as a community-driven quality signal where projects apply and the DAO votes on approval for a verified badge and priority placement.",
    tags:     ["svl", "dao", "governance", "whitepaper"],
  },
  {
    question: "Does SVL change the standard launch fee structure?",
    answer:   "No. The whitepaper states SVL does not change standard fees; approved projects still pay the normal raise fee.",
    tags:     ["svl", "fees", "whitepaper"],
  },
  {
    question: "What risk factors does MoonSale whitepaper mention?",
    answer:   "The whitepaper highlights market risk, smart contract risk, regulatory risk, and competition risk.",
    tags:     ["risk", "whitepaper", "security"],
  },
  {
    question: "Where is the MoonSale frontend hosted?",
    answer:   "The whitepaper architecture section states the frontend is hosted on Vercel and uses standard EVM wallet providers.",
    tags:     ["developer", "architecture", "whitepaper", "wallet"],
  },
  {
    question: "How is on-chain and off-chain data handled?",
    answer:   "MoonSale uses on-chain contracts as the source of truth for balances and contract state, while metadata and off-chain records are handled in Supabase.",
    tags:     ["developer", "architecture", "security", "whitepaper"],
  },
  {
    question: "Does each sale have its own contract?",
    answer:   "Yes. Each presale and fair launch deploys an isolated contract and factory contracts enforce standardized launch parameters.",
    tags:     ["contracts", "presale", "fair_launch", "developer"],
  },
  {
    question: "What settings do launch factories enforce?",
    answer:   "Factory contracts enforce standard parameters such as min and max contributions, caps, sale times, token distribution logic, and liquidity locking parameters.",
    tags:     ["contracts", "security", "presale", "fair_launch", "developer"],
  },
  {
    question: "What are current live roadmap capabilities?",
    answer:   "The whitepaper roadmap lists live capabilities including presale and fair launch contracts, token generator, locker, vesting, tokenomics creator, and token scanner.",
    tags:     ["roadmap", "tools", "whitepaper"],
  },
  {
    question: "What improvements are listed as in-progress roadmap?",
    answer:   "The whitepaper marks MOON deployment, staking contracts, on-chain revenue distribution, DAO governance module, and SVL voting as in progress.",
    tags:     ["roadmap", "moon", "staking", "dao", "whitepaper"],
  },
  {
    question: "What planned roadmap items are listed?",
    answer:   "The whitepaper planned roadmap includes multi-chain expansion, mobile app, project analytics dashboard, institutional tools, and MOON cross-chain bridge.",
    tags:     ["roadmap", "chains", "moon", "whitepaper"],
  },
];

const EXTENDED_MANUAL_QA = [
  {
    question: "What are MoonSale platform fees?",
    answer: "MoonSale charges a listing fee per launch plus a platform raise fee collected at finalization. Fees are shown transparently on the fees page and enforced on-chain.",
    tags: ["fees", "create", "presale"],
  },
  {
    question: "Are there hidden fees on MoonSale?",
    answer: "No. MoonSale states there are no hidden fees. Listing and platform fees are shown clearly and are verifiable on-chain.",
    tags: ["fees", "security", "general"],
  },
  {
    question: "When is the listing fee paid?",
    answer: "The listing fee is paid after deploying your sale and before the sale page becomes publicly visible.",
    tags: ["fees", "create", "presale"],
  },
  {
    question: "Which token do I use to pay MoonSale fees?",
    answer: "Fees are paid in the native token of the selected chain, such as BNB on BSC and ETH on Ethereum or Sepolia.",
    tags: ["fees", "bnb", "ethereum"],
  },
  {
    question: "Does MoonSale support testnets?",
    answer: "MoonSale documentation states support for BNB Smart Chain and Ethereum, including their testnets.",
    tags: ["chains", "bnb", "ethereum", "testnet"],
  },
  {
    question: "How is fair launch token price calculated?",
    answer: "In a fair launch, final token price is determined at finalization by dividing total raised funds by the token pool.",
    tags: ["fair_launch", "investor", "how_it_works"],
  },
  {
    question: "Do fair launches have a hardcap?",
    answer: "No. MoonSale fair launches are designed without a fixed token price and without a hardcap.",
    tags: ["fair_launch", "hardcap", "investor"],
  },
  {
    question: "When can I claim bought tokens?",
    answer: "After a successful sale is finalized, contributors can claim tokens from the sale page using the Claim button.",
    tags: ["investor", "presale", "finalize", "tokens"],
  },
  {
    question: "Is there a refund deadline on MoonSale?",
    answer: "Investor documentation states there is no deadline on refunds for failed or cancelled sales.",
    tags: ["refund", "investor", "security"],
  },
  {
    question: "What happens if I am not whitelisted?",
    answer: "If a sale is whitelist-only and your wallet is not approved, the contribution transaction is rejected.",
    tags: ["investor", "presale", "security"],
  },
  {
    question: "What does finalizing a sale do?",
    answer: "Finalization adds liquidity to the DEX and makes contributor tokens claimable for successful sales.",
    tags: ["finalize", "liquidity", "presale", "fair_launch"],
  },
  {
    question: "Can I cancel a pending launch?",
    answer: "Yes. If listing fee is not paid and status is Pending, creators can cancel and withdraw deposited tokens.",
    tags: ["create", "presale", "fair_launch", "fees"],
  },
  {
    question: "Can I cancel an active launch?",
    answer: "Developer docs state an active sale can be cancelled if it has not yet reached softcap.",
    tags: ["create", "presale", "softcap"],
  },
  {
    question: "What are sale status badges for?",
    answer: "Sale status badges indicate the current lifecycle stage of each presale or fair launch.",
    tags: ["investor", "presale", "fair_launch"],
  },
  {
    question: "How many listings are shown per page on All Presales?",
    answer: "MoonSale investor docs state 12 listings appear by default, and View More loads 8 additional listings each time.",
    tags: ["investor", "presale", "browse"],
  },
  {
    question: "Do creators need KYC to launch?",
    answer: "No. MoonSale is permissionless and does not require KYC for project creators to deploy sales.",
    tags: ["permissionless", "kyc", "create"],
  },
  {
    question: "How are contributor protections enforced?",
    answer: "Contributor protections are enforced at smart contract level, including softcap refunds and on-chain liquidity locking rules.",
    tags: ["security", "refund", "liquidity", "contracts"],
  },
  {
    question: "What is MOON token used for?",
    answer: "MOON has two documented core functions: revenue sharing for stakers and DAO governance voting power.",
    tags: ["tokenomics", "dao", "governance", "revenue"],
  },
  {
    question: "How much platform revenue goes to MOON stakers?",
    answer: "The MoonSale whitepaper states 60% of platform revenue is distributed to MOON stakers.",
    tags: ["revenue", "staking", "tokenomics"],
  },
  {
    question: "What is the remaining platform revenue used for?",
    answer: "The remaining share is allocated to operations, development, treasury, and related ecosystem functions per MoonSale allocations.",
    tags: ["revenue", "tokenomics", "dao"],
  },
  {
    question: "What listing fee does the whitepaper mention?",
    answer: "The whitepaper describes a $100 listing fee per presale or fair launch in its documented fee model.",
    tags: ["fees", "whitepaper", "create"],
  },
  {
    question: "What raise fee does MoonSale document?",
    answer: "The MoonSale whitepaper describes a 2% fee on funds raised at finalization.",
    tags: ["fees", "revenue", "whitepaper"],
  },
  {
    question: "Is MOON supply fixed?",
    answer: "MoonSale documentation states MOON has a fixed total supply of 1,000,000,000 with no inflationary minting after deployment.",
    tags: ["tokenomics", "moon", "whitepaper"],
  },
  {
    question: "Can MOON stakers unstake anytime?",
    answer: "The whitepaper states unstaking is available at any time and does not require a fixed lock period.",
    tags: ["staking", "moon", "whitepaper"],
  },
  {
    question: "How is DAO voting power calculated?",
    answer: "MoonSale governance documentation describes one staked MOON token as one vote.",
    tags: ["dao", "governance", "moon"],
  },
  {
    question: "What are proposal requirements in MoonSale DAO?",
    answer: "The whitepaper documents proposal and voting parameters including a minimum proposer balance, voting window, and participation threshold.",
    tags: ["dao", "governance", "whitepaper"],
  },
  {
    question: "What is the Special Vetted Launch program?",
    answer: "Special Vetted Launch is a DAO-governed quality signal where community voting can grant a verified badge to selected projects.",
    tags: ["dao", "governance", "marketing", "investor"],
  },
  {
    question: "What are Special Vetted Launch benefits?",
    answer: "Documented SVL benefits include a visible verified badge, priority listing placement, and eligibility for co-marketing.",
    tags: ["dao", "marketing", "investor"],
  },
  {
    question: "Does Special Vetted Launch change fee structure?",
    answer: "No. Whitepaper text states approved SVL projects still pay the standard raise fee model.",
    tags: ["dao", "fees", "whitepaper"],
  },
  {
    question: "Which mainnets does MoonSale run on right now?",
    answer: "MoonSale operates on BNB Chain mainnet and Ethereum mainnet, with raises in native chain tokens.",
    tags: ["chains", "bnb", "ethereum"],
  },
  {
    question: "What does token scanner check?",
    answer: "The token scanner checks common risk indicators such as honeypots, hidden ownership, mint privileges, taxes, and holder concentration.",
    tags: ["scanner", "security", "investor", "tools"],
  },
  {
    question: "What powers the MoonSale token scanner?",
    answer: "The tool is presented as a scanner powered by MoonSale AI in platform documentation.",
    tags: ["scanner", "tools"],
  },
  {
    question: "How much does token lock cost?",
    answer: "The lock tool page lists a 0.01 BNB fee for locking ERC-20 tokens for a fixed period.",
    tags: ["lock", "fees", "tools", "bnb"],
  },
  {
    question: "How much does token vesting cost?",
    answer: "The vesting tool page lists a 0.01 BNB fee for creating vesting schedules.",
    tags: ["vesting", "fees", "tools", "bnb"],
  },
  {
    question: "How much does token management cost per action?",
    answer: "The token management page states each management action charges a 0.005 BNB fee.",
    tags: ["token_management", "fees", "tools", "bnb"],
  },
  {
    question: "What vesting model does MoonSale support?",
    answer: "MoonSale vesting supports TGE unlock, optional cliff, and linear release over the configured duration.",
    tags: ["vesting", "tge", "tokens", "tools"],
  },
  {
    question: "Is token lock different from liquidity lock?",
    answer: "Yes. Token Lock secures chosen token allocations, while liquidity lock refers to LP token locking after sale finalization.",
    tags: ["lock", "liquidity", "security", "tools"],
  },
  {
    question: "What does the tokenomics creator generate?",
    answer: "Developer docs describe tokenomics creator output as a token allocation table and donut chart exportable as PDF.",
    tags: ["tokenomics", "tools", "marketing"],
  },
  {
    question: "What is in MoonSale Phase 1 roadmap?",
    answer: "The whitepaper Phase 1 section lists live features including presale contracts, fair launch contracts, token generator, locker, vesting, tokenomics creator, and token scanner.",
    tags: ["roadmap", "whitepaper", "tools", "presale"],
  },
  {
    question: "What is in MoonSale Phase 2 roadmap?",
    answer: "Phase 2 is documented as including MOON token deployment, staking contracts, on-chain revenue distribution, DAO module, and SVL voting.",
    tags: ["roadmap", "whitepaper", "dao", "staking"],
  },
  {
    question: "What is in MoonSale Phase 3 roadmap?",
    answer: "Phase 3 plans include multi-chain expansion, launchpad mobile app, analytics dashboard, institutional tools, and cross-chain bridge features.",
    tags: ["roadmap", "whitepaper", "chains", "marketing"],
  },
  {
    question: "What risks does MoonSale whitepaper mention?",
    answer: "Documented risk factors include market conditions, smart contract vulnerabilities, regulatory changes, and competition in launchpad markets.",
    tags: ["risk", "whitepaper", "security", "investor"],
  },
  {
    question: "How does MoonSale connect wallets?",
    answer: "MoonSale frontend connects through common EVM wallet providers like MetaMask and WalletConnect-compatible options.",
    tags: ["wallet", "metamask", "connect", "how_it_works"],
  },
  {
    question: "Where is on-chain data used on MoonSale?",
    answer: "On-chain contract state is used as source of truth for balances, contribution amounts, and sale state during platform operations.",
    tags: ["security", "contracts", "how_it_works"],
  },
  {
    question: "What does permissionless listing mean on MoonSale?",
    answer: "Permissionless listing means projects can create launches without admin approval, while contributor protections remain enforced by smart contracts.",
    tags: ["permissionless", "security", "create"],
  },
  {
    question: "Why do KYC and Audit badges matter to investors?",
    answer: "KYC and Audit badges are visible trust signals reviewed by the team and are intended to improve investor confidence.",
    tags: ["kyc", "audit", "investor", "security"],
  },
  {
    question: "What is MOON staker revenue distribution frequency?",
    answer: "The whitepaper describes staker distribution on a scheduled cadence such as weekly or per epoch, subject to governance settings.",
    tags: ["staking", "revenue", "governance", "whitepaper"],
  },
  {
    question: "Can contributors verify fee logic on-chain?",
    answer: "Yes. MoonSale documentation states fee behavior is enforced by contracts and can be verified on-chain.",
    tags: ["fees", "security", "contracts"],
  },
  {
    question: "What is MoonSale investor value proposition?",
    answer: "MoonSale positions itself as permissionless launches with contract-enforced protections and a revenue-sharing model for MOON stakers.",
    tags: ["investor", "general", "revenue", "security"],
  },
];

const COVERAGE_QA = [
  {
    question: "What is a presale?",
    answer: "A presale is a token sale with a fixed token price set by the creator, plus softcap and hardcap limits managed by the smart contract.",
    tags: ["presale", "investor", "how_it_works"],
  },
  {
    question: "How do I buy tokens on MoonSale?",
    answer: "Open the sale page, connect your wallet to the correct chain, enter your contribution, confirm the transaction, then claim tokens after successful finalization.",
    tags: ["investor", "presale", "fair_launch", "contribution"],
  },
  {
    question: "How do I contribute to a presale?",
    answer: "Go to moonsale.app/presale, choose a live sale, connect wallet, enter amount within min/max limits, and confirm contribution on-chain.",
    tags: ["investor", "presale", "contribution"],
  },
  {
    question: "What is a softcap?",
    answer: "Softcap is the minimum amount a sale must raise to succeed. If softcap is not met, contributors can refund.",
    tags: ["softcap", "presale", "investor"],
  },
  {
    question: "What is a hardcap?",
    answer: "Hardcap is the maximum amount a sale can raise. Once hardcap is reached, no more contributions are accepted.",
    tags: ["hardcap", "presale", "investor"],
  },
  {
    question: "What happens if hardcap is reached?",
    answer: "When hardcap is reached, the sale is filled and additional contributions are blocked by contract rules.",
    tags: ["hardcap", "presale", "status"],
  },
  {
    question: "Do I get a refund if the presale fails?",
    answer: "Yes. If softcap is not reached or sale is cancelled, contributors can claim full refunds directly from the contract.",
    tags: ["refund", "presale", "investor", "softcap"],
  },
  {
    question: "How do I get a refund on MoonSale?",
    answer: "Open the failed or cancelled sale page and use the refund action. The contract returns your contribution on-chain.",
    tags: ["refund", "investor", "presale", "fair_launch"],
  },
  {
    question: "What is an on-chain refund?",
    answer: "An on-chain refund means your refund is processed by smart contract logic, not by manual admin approval.",
    tags: ["refund", "security", "contracts"],
  },
  {
    question: "Is the refund automatic?",
    answer: "Yes. Refund eligibility is contract-based. If a sale fails softcap or is cancelled, refund can be claimed directly.",
    tags: ["refund", "security", "investor"],
  },
  {
    question: "Does admin need to approve my refund?",
    answer: "No. Refunds are handled by smart contracts and do not require admin approval.",
    tags: ["refund", "security", "contracts"],
  },
  {
    question: "Can the project team take my money?",
    answer: "Funds are managed by on-chain sale contracts with success/failure rules. If softcap fails, contributors can claim refunds.",
    tags: ["security", "refund", "investor", "contracts"],
  },
  {
    question: "What is a min contribution?",
    answer: "Min contribution is the minimum amount a wallet must contribute per transaction or participation, based on sale settings.",
    tags: ["contribution", "investor", "presale", "fair_launch"],
  },
  {
    question: "What is a max contribution?",
    answer: "Max contribution is the cap a wallet can contribute to a sale, set by creator and enforced by contract limits.",
    tags: ["contribution", "investor", "presale", "fair_launch"],
  },
  {
    question: "Can I contribute multiple times to the same presale?",
    answer: "Usually yes, while sale is active, as long as your total stays within the wallet max contribution setting.",
    tags: ["contribution", "investor", "presale"],
  },
  {
    question: "Can I add more to my contribution later?",
    answer: "Yes, if sale is still live and your cumulative amount remains within contribution limits.",
    tags: ["contribution", "investor", "presale", "fair_launch"],
  },
  {
    question: "What wallet does MoonSale support?",
    answer: "MoonSale supports common EVM wallets including MetaMask, Trust Wallet, and WalletConnect-compatible wallets.",
    tags: ["wallet", "metamask", "walletconnect", "support"],
  },
  {
    question: "Does MoonSale support WalletConnect?",
    answer: "Yes. MoonSale supports WalletConnect-compatible wallets.",
    tags: ["wallet", "walletconnect", "support"],
  },
  {
    question: "How do I connect my wallet?",
    answer: "Use the Connect Wallet button, choose your wallet provider, approve the connection, and switch to the required network.",
    tags: ["wallet", "connect", "investor", "support"],
  },
  {
    question: "Which network should I connect to?",
    answer: "Connect to the same chain as the sale: BNB Chain sales use BNB, Ethereum sales use ETH.",
    tags: ["wallet", "bnb", "ethereum", "investor"],
  },
  {
    question: "What is a contribution summary?",
    answer: "Contribution summary shows your invested amount and expected/claimable tokens based on current sale state.",
    tags: ["contribution", "investor", "portfolio"],
  },
  {
    question: "When can I claim my tokens?",
    answer: "After successful sale finalization. Once finalized, Claim becomes available on the sale page.",
    tags: ["claim", "investor", "presale", "fair_launch"],
  },
  {
    question: "Where is the claim button?",
    answer: "After successful finalization, Claim appears on the sale page where Buy or Contribute was shown before.",
    tags: ["claim", "investor", "presale", "fair_launch"],
  },
  {
    question: "Does the claim button appear automatically?",
    answer: "Yes. After finalization, the sale UI switches from contribution mode to claim mode.",
    tags: ["claim", "status", "investor"],
  },
  {
    question: "How long after finalization can I claim?",
    answer: "Claim is available after finalization according to sale tokenomics and vesting settings.",
    tags: ["claim", "vesting", "investor"],
  },
  {
    question: "What is TGE?",
    answer: "TGE means Token Generation Event, the point when token claiming/distribution starts.",
    tags: ["tge", "vesting", "tokens", "investor"],
  },
  {
    question: "What is TGE unlock?",
    answer: "TGE unlock is the initial percentage of tokens claimable at TGE before any cliff or linear vesting release.",
    tags: ["tge", "vesting", "tokens"],
  },
  {
    question: "What is a vesting cliff?",
    answer: "A vesting cliff is an initial waiting period before linear vesting releases begin.",
    tags: ["vesting", "cliff", "tokens"],
  },
  {
    question: "What is linear vesting?",
    answer: "Linear vesting releases remaining tokens gradually over the configured vesting duration.",
    tags: ["vesting", "tokens", "how_it_works"],
  },
  {
    question: "How do I check my vesting schedule?",
    answer: "Check the sale details and MoonSale vesting interfaces to view unlock timing, cliff, and claimable amounts.",
    tags: ["vesting", "investor", "portfolio"],
  },
  {
    question: "Can the project cancel my vesting?",
    answer: "Vesting behavior is contract-defined by schedule settings. Review vesting parameters before investing.",
    tags: ["vesting", "security", "investor"],
  },
  {
    question: "Is vesting revocable?",
    answer: "Whether vesting can be cancelled depends on contract design and settings. Always verify vesting terms before participating.",
    tags: ["vesting", "security", "investor"],
  },
  {
    question: "What is a whitelist presale?",
    answer: "A whitelist presale allows only approved wallet addresses to contribute.",
    tags: ["whitelist", "presale", "investor"],
  },
  {
    question: "How do I check if I am whitelisted?",
    answer: "Try contribution with your connected wallet or check sale details. Non-whitelisted wallets are rejected on-chain.",
    tags: ["whitelist", "investor", "presale", "fair_launch"],
  },
  {
    question: "What if I am not on the whitelist?",
    answer: "Your contribution will fail. You need creator approval before you can participate in whitelist-only sales.",
    tags: ["whitelist", "investor", "presale", "fair_launch"],
  },
  {
    question: "How do I get whitelisted?",
    answer: "Contact the project team directly. Only the creator can add wallet addresses to a sale whitelist.",
    tags: ["whitelist", "investor", "presale", "support"],
  },
  {
    question: "What is a liquidity lock?",
    answer: "Liquidity lock means LP tokens are locked for a period, reducing risk of immediate liquidity removal.",
    tags: ["liquidity", "lock", "lp", "security"],
  },
  {
    question: "Can the project pull liquidity?",
    answer: "While LP lock is active, liquidity cannot be removed by the project from that locked position.",
    tags: ["liquidity", "lock", "security", "lp"],
  },
  {
    question: "Is LP locked automatically?",
    answer: "Yes. MoonSale finalization includes automatic LP locking according to sale settings and admin rules.",
    tags: ["liquidity", "lp", "lock", "finalize"],
  },
  {
    question: "Where is the View Lock button?",
    answer: "In Token Lock pages, your lock cards include View Lock linking to lock detail proof pages.",
    tags: ["token_lock", "lock", "tools", "support"],
  },
  {
    question: "What does Live status mean?",
    answer: "Live means the sale is currently accepting contributions.",
    tags: ["status", "presale", "fair_launch", "investor"],
  },
  {
    question: "What does Upcoming status mean?",
    answer: "Upcoming means the sale is created but has not started yet.",
    tags: ["status", "presale", "fair_launch", "investor"],
  },
  {
    question: "What does Filled status mean?",
    answer: "Filled means contribution target limit is reached and the sale cannot accept more funds.",
    tags: ["status", "presale", "fair_launch", "hardcap"],
  },
  {
    question: "What does Finalized status mean?",
    answer: "Finalized means liquidity and claim flow are completed and contributors can claim according to tokenomics settings.",
    tags: ["status", "finalize", "claim", "investor"],
  },
  {
    question: "What does Failed status mean?",
    answer: "Failed means sale did not meet softcap, so contributors can claim refunds.",
    tags: ["status", "softcap", "refund", "investor"],
  },
  {
    question: "What does Cancelled status mean?",
    answer: "Cancelled means creator cancelled sale according to contract conditions, and eligible contributors can refund.",
    tags: ["status", "cancel", "refund", "investor"],
  },
  {
    question: "How do I filter presales by status?",
    answer: "Use All Presales filters to switch between Live, Upcoming, and Ended sale states.",
    tags: ["browse", "status", "presale", "investor"],
  },
  {
    question: "How do I filter by chain?",
    answer: "Use chain filters on listing pages to show only BNB Chain or Ethereum sales.",
    tags: ["browse", "chains", "presale", "investor"],
  },
  {
    question: "How do I load more presales?",
    answer: "Click View More on All Presales. MoonSale loads additional listings each click.",
    tags: ["browse", "presale", "investor", "support"],
  },
  {
    question: "What is the early withdrawal option?",
    answer: "Early withdrawal lets contributors exit during active sale with a penalty designed to deter abuse.",
    tags: ["withdraw", "presale", "fair_launch", "investor"],
  },
  {
    question: "What is the early withdrawal penalty?",
    answer: "Early withdrawal includes a small penalty applied by sale logic.",
    tags: ["withdraw", "penalty", "investor", "presale"],
  },
  {
    question: "Do I need to reload the page to see status changes?",
    answer: "MoonSale UI refreshes sale state periodically, but manual refresh can help if wallet/provider data looks stale.",
    tags: ["status", "support", "investor"],
  },
  {
    question: "What is My Contributions page?",
    answer: "My Contributions is the investor tracking view where you can review sales you joined, contribution amounts, and claim/refund state.",
    tags: ["portfolio", "investor", "contribution", "support"],
  },
  {
    question: "How do I find presales I invested in?",
    answer: "Use the invested/My Contributions area to view joined sales and current position status.",
    tags: ["portfolio", "investor", "contribution"],
  },
  {
    question: "What is a fair launch?",
    answer: "Fair launch is a sale model without fixed token price. Final price is discovered from total raised and token pool at finalization.",
    tags: ["fair_launch", "price_discovery", "investor", "how_it_works"],
  },
  {
    question: "What is price discovery?",
    answer: "Price discovery means token price is determined by market participation, not pre-set fixed sale price.",
    tags: ["fair_launch", "price_discovery", "investor"],
  },
  {
    question: "Do all contributors get the same price in a fair launch?",
    answer: "Yes. Fair launch final price applies proportionally to all contributors based on final raise and token pool.",
    tags: ["fair_launch", "investor", "price_discovery"],
  },
  {
    question: "Can a fair launch be whitelisted?",
    answer: "Yes. Fair launches can also be configured with whitelist restrictions by creators.",
    tags: ["fair_launch", "whitelist", "investor"],
  },
  {
    question: "How do I launch a presale on MoonSale?",
    answer: "Go to Create Presale, configure token + sale parameters, deploy, then pay listing fee to make it publicly visible.",
    tags: ["creator", "presale", "create", "how_it_works"],
  },
  {
    question: "How do I create a fair launch?",
    answer: "Go to Create Fair Launch, set token pool and softcap settings, deploy the contract, then complete listing fee step.",
    tags: ["creator", "fair_launch", "create", "how_it_works"],
  },
  {
    question: "How do I deploy a token on MoonSale?",
    answer: "Use the Token Generator at moonsale.app/create-token to deploy an ERC-20/BEP-20 token, then use it in your sale setup.",
    tags: ["creator", "token_create", "tools", "create"],
  },
  {
    question: "Can I bring my own token to MoonSale?",
    answer: "Yes. You can launch using an existing compatible token contract address.",
    tags: ["creator", "token_create", "presale", "fair_launch"],
  },
  {
    question: "What is the listing fee?",
    answer: "MoonSale documentation includes listing fee and raise fee in the fee model. Listing fee is paid before public visibility.",
    tags: ["fees", "listing_fee", "creator", "presale", "fair_launch"],
  },
  {
    question: "What is status Pending?",
    answer: "Pending usually means launch is deployed but listing fee/payment step is not completed yet.",
    tags: ["status", "creator", "listing_fee", "presale", "fair_launch"],
  },
  {
    question: "How do I make my presale go live?",
    answer: "Complete required listing/payment setup after deployment, then your launch becomes visible in public listings.",
    tags: ["creator", "presale", "listing_fee", "status"],
  },
  {
    question: "What is the Token Vesting tool?",
    answer: "Token Vesting tool creates schedules using TGE unlock + cliff + linear release for long-term allocations.",
    tags: ["vesting", "tools", "creator", "tokens"],
  },
  {
    question: "What is the Token Scanner?",
    answer: "Token Scanner analyzes token risk signals like honeypot behavior, ownership risk, tax parameters, and concentration.",
    tags: ["scanner", "security", "tools", "investor"],
  },
  {
    question: "What is reentrancy protection?",
    answer: "Reentrancy protection is a smart contract security pattern to block malicious nested calls. Check audit reports for exact implementation details.",
    tags: ["security", "contracts", "audit"],
  },
  {
    question: "How does MoonSale make money?",
    answer: "MoonSale revenue model includes listing fees plus a percentage raise fee at finalization, as described in docs/whitepaper.",
    tags: ["revenue", "fees", "whitepaper", "general"],
  },
  {
    question: "Has MOON token launched?",
    answer: "MoonSale roadmap marks MOON deployment in the in-progress phase. Check official channels for latest live launch status.",
    tags: ["moon", "roadmap", "whitepaper", "status"],
  },
  {
    question: "How do I stake MOON?",
    answer: "Staking is part of MoonSale MOON roadmap and revenue-share model. Follow official updates for live staking contract links.",
    tags: ["moon", "staking", "roadmap", "revenue"],
  },
  {
    question: "What is the real MoonSale URL?",
    answer: "Use the official site only: https://www.moonsale.app 🔒 Bookmark it to avoid phishing copies.",
    tags: ["security", "url", "support", "general"],
  },
  {
    question: "Does MoonSale offer marketing services?",
    answer: "Yes. For marketing discussions, join @moonsalemarketing 🚀",
    tags: ["marketing", "support", "general"],
  },
  {
    question: "How to contact marketing partner?",
    answer: "For marketing partner listing/contact, message @maxis0 📣",
    tags: ["marketing", "support", "general"],
  },
  {
    question: "What is BSC?",
    answer: "BSC means BNB Smart Chain, an EVM-compatible blockchain where MoonSale supports token launches.",
    tags: ["bnb", "chains", "investor", "support"],
  },
  {
    question: "What is Sepolia testnet?",
    answer: "Sepolia is an Ethereum test network used for testing contracts and transactions without using real mainnet ETH.",
    tags: ["testnet", "ethereum", "support", "developer"],
  },
  {
    question: "What happens if softcap is not reached?",
    answer: "If softcap is not reached, the sale fails and contributors can claim full refunds directly from the smart contract.",
    tags: ["softcap", "refund", "presale", "fair_launch", "investor"],
  },
  {
    question: "How long do I have to claim a refund?",
    answer: "MoonSale investor documentation states there is no deadline on refunds for failed or cancelled sales.",
    tags: ["refund", "investor", "softcap", "support"],
  },
  {
    question: "Does MoonSale support MetaMask?",
    answer: "Yes. MoonSale supports MetaMask for wallet connection on supported EVM networks.",
    tags: ["wallet", "metamask", "connect", "support"],
  },
  {
    question: "What is a rug pull?",
    answer: "A rug pull is when project operators remove liquidity or abuse control to drain value, leaving investors exposed.",
    tags: ["security", "liquidity", "investor", "risk"],
  },
  {
    question: "How does MoonSale prevent rug pulls?",
    answer: "MoonSale reduces rug-risk with contract-enforced hard/soft caps, on-chain refunds on failed sales, and liquidity locking after successful finalization.",
    tags: ["security", "liquidity", "refund", "softcap", "hardcap", "lock"],
  },
  {
    question: "How long is liquidity locked?",
    answer: "Liquidity lock duration depends on sale configuration, and MoonSale enforces minimum lock constraints to prevent extremely short lock periods.",
    tags: ["liquidity", "lock", "lp", "security", "investor"],
  },
  {
    question: "What is the connection between MoonSale and ICO Gem Hunters?",
    answer: "MoonSale is a product from IGH (ICO Gem Hunters), a crypto discovery and marketing ecosystem.",
    tags: ["marketing", "general", "team", "ecosystem"],
  },
  {
    question: "What is icogemhunters.com?",
    answer: "ICO Gem Hunters is a crypto project discovery and marketing platform connected with the MoonSale ecosystem.",
    tags: ["marketing", "general", "ecosystem", "support"],
  },
  {
    question: "Should I share my seed phrase with MoonSale?",
    answer: "No. Never share your seed phrase or private key with anyone. Legit MoonSale support will never ask for it.",
    tags: ["security", "support", "wallet", "risk"],
  },
  {
    question: "What is the difference between testnet and mainnet?",
    answer: "Testnet is for testing with non-production tokens; mainnet is live and uses real value tokens like BNB or ETH.",
    tags: ["testnet", "developer", "investor", "chains"],
  },
];

const ALL_MANUAL_QA = [...MANUAL_QA, ...EXTENDED_MANUAL_QA, ...COVERAGE_QA];

// ── Question variant generator (many human-style questions, same facts) ─────
const VARIANT_CONFIG = {
  enable: true,
  targetTotalQuestions: 25000,
  minVariantsPerEntry: 24,
  maxVariantsPerEntry: 160,
  maxQuestionLength: 180,
};

const QUESTION_PREFIXES = [
  "quick question: ",
  "hey, ",
  "please ",
  "pls ",
  "i want to know: ",
  "i need to know: ",
  "just wondering: ",
  "can you tell me: ",
  "help me with: ",
  "curious: ",
  "for investors: ",
];

const QUESTION_SUFFIXES = [
  "on MoonSale",
  "on the MoonSale platform",
  "on MoonSale app",
];

const PHRASE_SYNONYMS = [
  ["presale", ["presale", "pre-sale", "pre sale", "token presale"]],
  ["fair launch", ["fair launch", "fairlaunch"]],
  ["token lock", ["token lock", "token locking", "lock tokens"]],
  ["tokenomics", ["tokenomics", "token distribution"]],
  ["kyc", ["kyc", "know your customer"]],
  ["audit", ["audit", "security audit"]],
  ["liquidity", ["liquidity", "lp", "lp tokens", "liquidity pool"]],
  ["bnb chain", ["bnb chain", "bsc", "binance smart chain"]],
  ["ethereum", ["ethereum", "eth"]],
  ["fees", ["fees", "cost", "pricing", "charges"]],
  ["refund", ["refund", "refunds", "money back"]],
  ["softcap", ["softcap", "soft cap"]],
  ["hardcap", ["hardcap", "hard cap"]],
  ["wallet", ["wallet", "web3 wallet", "crypto wallet"]],
  ["token", ["token", "coin"]],
];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normaliseQuestion(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureQuestionMark(text) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return /\?$/.test(trimmed) ? trimmed : `${trimmed}?`;
}

function addVariant(variants, seen, text) {
  const clean = ensureQuestionMark(text.replace(/\s+/g, " ").trim());
  if (!clean || clean.length > VARIANT_CONFIG.maxQuestionLength) return;
  const key = normaliseQuestion(clean);
  if (seen.has(key)) return;
  seen.add(key);
  variants.push(clean);
}

function expandWithSynonyms(text) {
  const out = new Set([text]);
  for (const [phrase, alts] of PHRASE_SYNONYMS) {
    const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
    const current = Array.from(out);
    for (const q of current) {
      if (!regex.test(q)) continue;
      for (const alt of alts) {
        out.add(q.replace(regex, alt));
      }
    }
  }
  return Array.from(out);
}

function buildCoreTemplates(question) {
  const templates = [];
  const base = question.trim().replace(/[?]+$/, "");
  if (!base) return templates;

  const whatIs = base.match(/^what\s+(?:is|are)\s+(.+)$/i);
  const whats  = base.match(/^what's\s+(.+)$/i);
  const howDoI = base.match(/^how\s+do\s+i\s+(.+)$/i);
  const howCanI = base.match(/^how\s+can\s+i\s+(.+)$/i);
  const howDoes = base.match(/^how\s+does\s+(.+?)\s+work$/i);
  const whereCanI = base.match(/^where\s+can\s+i\s+(.+)$/i);
  const canI = base.match(/^can\s+i\s+(.+)$/i);
  const isAre = base.match(/^(is|are)\s+(.+)$/i);
  const whatHappensIf = base.match(/^what\s+happens\s+if\s+(.+)$/i);

  if (whatIs || whats) {
    const subject = (whatIs ? whatIs[1] : whats[1]).trim();
    templates.push(
      `What is ${subject}`,
      `What's ${subject}`,
      `Define ${subject}`,
      `Explain ${subject}`,
      `Tell me about ${subject}`,
      `Can you explain ${subject}`,
      `Quick overview of ${subject}`,
      `${subject} - what is it`,
      `In simple terms, what is ${subject}`,
      `What does ${subject} mean`,
    );
  } else if (howDoI || howCanI) {
    const action = (howDoI ? howDoI[1] : howCanI[1]).trim();
    templates.push(
      `How do I ${action}`,
      `How can I ${action}`,
      `How to ${action}`,
      `What's the process to ${action}`,
      `Steps to ${action}`,
      `Guide to ${action}`,
      `Walk me through how to ${action}`,
      `Can you show me how to ${action}`,
      `Best way to ${action}`,
    );
  } else if (howDoes) {
    const subject = howDoes[1].trim();
    templates.push(
      `How does ${subject} work`,
      `How ${subject} works`,
      `Explain how ${subject} works`,
      `What is the workflow for ${subject}`,
    );
  } else if (whereCanI) {
    const action = whereCanI[1].trim();
    templates.push(
      `Where can I ${action}`,
      `Where do I ${action}`,
      `Where is the page to ${action}`,
      `Where do I go to ${action}`,
      `Link for ${action}`,
    );
  } else if (canI) {
    const action = canI[1].trim();
    templates.push(
      `Can I ${action}`,
      `Is it possible to ${action}`,
      `Am I allowed to ${action}`,
      `Do you allow me to ${action}`,
      `Is ${action} allowed`,
    );
  } else if (isAre) {
    const subject = isAre[2].trim();
    templates.push(
      `${isAre[1]} ${subject}`,
      `Is it true that ${subject}`,
      `Can you confirm ${subject}`,
    );
  } else if (whatHappensIf) {
    const condition = whatHappensIf[1].trim();
    templates.push(
      `What happens if ${condition}`,
      `If ${condition}, what happens`,
      `What occurs if ${condition}`,
      `What happens when ${condition}`,
    );
  } else {
    templates.push(
      base,
      `Can you explain ${base}`,
      `Tell me about ${base}`,
      `Info about ${base}`,
      `Quick overview of ${base}`,
    );
  }

  return templates;
}

function generateQuestionVariants(question, maxVariants) {
  const variants = [];
  const seen = new Set();

  addVariant(variants, seen, question);

  const coreTemplates = buildCoreTemplates(question);
  for (const t of coreTemplates) addVariant(variants, seen, t);

  const synonymExpanded = [];
  for (const v of variants) {
    synonymExpanded.push(...expandWithSynonyms(v));
  }
  for (const t of synonymExpanded) addVariant(variants, seen, t);

  const prefixed = [];
  for (const v of variants) {
    for (const prefix of QUESTION_PREFIXES) {
      prefixed.push(`${prefix}${v}`);
    }
  }
  for (const t of prefixed) addVariant(variants, seen, t);

  const suffixed = [];
  for (const v of variants) {
    if (/\bmoonsale\b/i.test(v)) continue;
    for (const suffix of QUESTION_SUFFIXES) {
      const base = v.replace(/[?]+$/, "").trim();
      suffixed.push(`${base} ${suffix}`);
    }
  }
  for (const t of suffixed) addVariant(variants, seen, t);

  return variants.slice(0, maxVariants);
}

// ── Topic keyword map for auto-tagging scraped content ────────────────────────
const TOPIC_KEYWORDS = {
  presale:       ["presale", "pre-sale", "hardcap", "softcap", "hard cap", "soft cap", "raise"],
  hardcap:       ["hardcap", "hard cap", "filled", "max raise"],
  contribution:  ["contribution", "contribute", "invest", "buy", "min contribution", "max contribution"],
  status:        ["status", "live", "upcoming", "filled", "finalized", "failed", "cancelled", "pending"],
  portfolio:     ["my contributions", "invested", "portfolio", "my launches", "my schedules"],
  fair_launch:   ["fair launch", "fairlaunch", "price discovery"],
  price_discovery: ["price discovery", "estimated price", "token pool"],
  fees:          ["fee", "fees", "cost", "charge", "listing fee", "platform fee", "bnb fee"],
  refund:        ["refund", "refunds", "claim back"],
  liquidity:     ["liquidity", "lp token", "pancakeswap", "uniswap", "dex"],
  vesting:       ["vesting", "vest", "tge", "unlock", "cliff"],
  cliff:         ["cliff", "vesting cliff"],
  lock:          ["token lock", "lock", "locked", "locking"],
  kyc:           ["kyc", "know your customer", "verified", "identity"],
  audit:         ["audit", "audited", "security", "smart contract"],
  token_create:  ["create token", "token generator", "erc-20", "erc20", "mint", "burn"],
  how_it_works:  ["how it works", "how to", "steps", "process", "guide"],
  bnb:           ["bnb", "binance", "bsc", "bnb chain"],
  ethereum:      ["ethereum", "eth", "uniswap"],
  withdraw:      ["withdraw", "withdrawal", "early withdrawal", "penalty"],
  penalty:       ["penalty", "early withdrawal penalty"],
  investor:      ["contributor", "invest", "investor", "participate"],
  finalize:      ["finalize", "finalise", "launch", "complete"],
  wallet:        ["wallet", "connect wallet", "metamask", "web3"],
  walletconnect: ["walletconnect"],
  support:       ["support", "help", "contact", "community", "telegram", "discord"],
  marketing:     ["marketing", "promote", "partner", "co-marketing", "icogemhunters"],
  url:           ["url", "website", "official site", "real moonsale url", "moonsale.app"],
  security:      ["security", "safe", "protect", "rug", "scam", "on-chain", "on chain"],
  scanner:       ["scanner", "scan", "honeypot", "risk"],
  tokenomics:    ["tokenomics", "distribution", "allocation"],
  testnet:       ["testnet", "testnets", "sepolia"],
  whitelist:     ["whitelist", "whitelisted"],
  claim:         ["claim", "claimable"],
  listing_fee:   ["listing fee", "$100"],
  moon:          ["moon token", "moon staker", "staked moon", "1,000,000,000 moon"],
  staking:       ["stake", "staking", "staker", "unstake"],
  dao:           ["dao", "proposal", "vote", "voting"],
  governance:    ["governance", "proposal", "voting period", "majority"],
  whitepaper:    ["whitepaper", "executive summary", "roadmap", "risk factors"],
  svl:           ["special vetted launch", "svl", "verified by dao"],
  roadmap:       ["phase 1", "phase 2", "phase 3", "planned", "in progress"],
  architecture:  ["vercel", "supabase", "frontend", "factory contracts"],
  revenue:       ["revenue", "60%", "staker pool", "distribution"],
  cancel:        ["cancel", "cancelled", "pending"],
};

function detectTags(text) {
  const lower = text.toLowerCase();
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some(kw => lower.includes(kw)))
    .map(([tag]) => tag);
}

// ── Split scraped text into paragraph-sized chunks ────────────────────────────
function chunkText(text, maxChars = 700) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 40);

  const chunks = [];
  let current  = "";

  for (const para of paragraphs) {
    if ((current + para).length < maxChars) {
      current += (current ? "\n\n" : "") + para;
    } else {
      if (current) chunks.push(current);
      current = para;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function isHighQualitySource(page) {
  const source = (page.source || page.url || "").toLowerCase();
  const category = (page.category || "").toLowerCase();

  if (!source.includes("moonsale.app")) return false;

  // Exclude noisy, project-specific sale pages.
  if (/\/presale\//.test(source) || /\/fair-launch\//.test(source)) {
    if (!/\/investors\/whitepaper/.test(source)) return false;
  }

  if (category !== "discovered") return true;
  return /\/investors\/whitepaper/.test(source);
}

function cleanSearchText(text) {
  return (text || "")
    .replace(/^PAGE:.*$/gmi, "")
    .replace(/^URL:.*$/gmi, "")
    .replace(/^CATEGORY:.*$/gmi, "")
    .replace(/^={4,}$/gmi, "")
    .replace(/^===\s*[^=]+\s*===$/gmi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildPageSearchText(page) {
  const lines = [];

  for (const p of (page.paragraphs || [])) {
    if (typeof p === "string" && p.trim().length > 30) lines.push(p.trim());
  }

  for (const c of (page.cards || [])) {
    if (c?.heading && c?.body) {
      lines.push(`${c.heading}. ${c.body}`.trim());
    }
  }

  for (const lst of (page.lists || [])) {
    const heading = (lst?.heading || "").trim();
    for (const item of (lst?.items || [])) {
      const val = `${heading ? `${heading}: ` : ""}${item}`.trim();
      if (val.length > 25) lines.push(val);
    }
  }

  for (const tbl of (page.tables || [])) {
    for (const row of (tbl?.rows || [])) {
      const val = row.filter(Boolean).join(" | ").trim();
      if (val.length > 25) lines.push(val);
    }
  }

  const joined = lines.join("\n\n");
  if (joined.trim()) return cleanSearchText(joined);
  return cleanSearchText(page.fullText || "");
}

function parseListingMetadata(page) {
  const source = String(page?.source || page?.url || "").trim();
  const title = String(page?.title || "").trim();

  if (!source || !title) return null;
  if (!/\/presale\//i.test(source) && !/\/fair-launch\//i.test(source)) return null;

  const cleanTitle = title
    .replace(/\s*[|\-]\s*MoonSale.*$/i, "")
    .replace(/\s+[|\-]\s*Moonsale.*$/i, "")
    .trim();

  const match = cleanTitle.match(
    /^(.+?)\s*\(([^)]+)\)\s*(Presale|Fair Launch)\s*-\s*([A-Za-z0-9\s\/-]+?)$/i
  );
  if (!match) return null;

  const [, projectNameRaw, symbolRaw, saleTypeRaw, statusRaw] = match;
  const projectName = projectNameRaw.trim();
  const symbol = symbolRaw.trim().toUpperCase();
  const saleType = /fair launch/i.test(saleTypeRaw) ? "Fair Launch" : "Presale";
  const status = statusRaw.replace(/\s+/g, " ").trim();

  if (!projectName || !symbol || !status) return null;

  return { projectName, symbol, saleType, status, source };
}

// ── Build the knowledge base ──────────────────────────────────────────────────
function build() {
  console.log("\n" + "=".repeat(60));
  console.log("  MoonSale Knowledge Base Builder");
  console.log("=".repeat(60) + "\n");

  const entries   = [];
  const tagIndex  = {};
  const customQA = loadCustomQA();
  const curatedManual = [...ALL_MANUAL_QA, ...customQA];
  const manualSeen = new Set();
  const listingSeen = new Set();
  let manualAdded = 0;
  let listingAdded = 0;

  // ── 1. Manual Q&A (highest priority) ──────────────────────────────────
  for (const qa of curatedManual) {
    const key = `${normaliseQuestion(qa.question || "")}::${normaliseQuestion(qa.answer || "")}`;
    if (!qa.question || !qa.answer || manualSeen.has(key)) continue;
    manualSeen.add(key);

    const id = `manual_${entries.length}`;
    entries.push({
      id,
      type:     "qa",
      title:    qa.question,
      question: qa.question,
      answer:   qa.answer,
      text:     `Q: ${qa.question}\nA: ${qa.answer}`,
      tags:     qa.tags,
      source:   "manual",
    });
    manualAdded++;
  }
  console.log(`  Manual Q&A pairs : ${manualAdded}`);
  console.log(`  Custom Q&A pairs : ${customQA.length}`);

  // ── 2. Scraped corpus ─────────────────────────────────────────────────
  const corpusPath = path.join(DATA_DIR, "corpus.json");
  let scrapedChunks = 0;

  if (fs.existsSync(corpusPath)) {
    const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));

    for (const page of corpus) {
      const listingMeta = parseListingMetadata(page);
      if (listingMeta) {
        const listingKey = `${listingMeta.projectName.toLowerCase()}::${listingMeta.symbol.toLowerCase()}::${listingMeta.saleType.toLowerCase()}::${listingMeta.source}`;

        if (!listingSeen.has(listingKey)) {
          const isPresale = listingMeta.saleType === "Presale";
          entries.push({
            id:       `listing_${entries.length}`,
            type:     "qa",
            title:    `${listingMeta.projectName} (${listingMeta.symbol}) ${listingMeta.saleType} status`,
            question: `${listingMeta.projectName} (${listingMeta.symbol})`,
            answer:   `${listingMeta.projectName} (${listingMeta.symbol}) is listed on MoonSale as a ${listingMeta.saleType}. Current status: ${listingMeta.status}. Official listing: ${listingMeta.source}`,
            text:     `Q: ${listingMeta.projectName} (${listingMeta.symbol})\nA: ${listingMeta.projectName} (${listingMeta.symbol}) is listed on MoonSale as a ${listingMeta.saleType}. Current status: ${listingMeta.status}. Official listing: ${listingMeta.source}`,
            tags:     ["project_lookup", "website_data", "status", isPresale ? "presale" : "fair_launch"],
            source:   listingMeta.source,
          });

          listingSeen.add(listingKey);
          listingAdded++;
        }
      }

      if (!isHighQualitySource(page)) continue;

      const pageText = buildPageSearchText(page);
      if (!pageText || pageText.length < 80) continue;

      // Add each FAQ as its own high-quality entry
      for (const faq of (page.faqs || [])) {
        if (faq.question && faq.answer) {
          entries.push({
            id:       `faq_${entries.length}`,
            type:     "qa",
            title:    faq.question,
            question: faq.question,
            answer:   faq.answer,
            text:     `Q: ${faq.question}\nA: ${faq.answer}`,
            tags:     detectTags(faq.question + " " + faq.answer),
            source:   page.source,
          });
          scrapedChunks++;
        }
      }

      // Add feature cards as entries
      for (const card of (page.cards || [])) {
        if (card.heading && card.body) {
          entries.push({
            id:       `card_${entries.length}`,
            type:     "qa",
            title:    card.heading,
            question: card.heading,
            answer:   card.body,
            text:     `Q: ${card.heading}\nA: ${card.body}`,
            tags:     detectTags(card.heading + " " + card.body),
            source:   page.source,
          });
          scrapedChunks++;
        }
      }

      // Chunk the full page text
      const chunks = chunkText(pageText, 520);
      for (const chunk of chunks) {
        entries.push({
          id:     `scraped_${entries.length}`,
          type:   "scraped",
          title:  page.title,
          text:   chunk,
          tags:   detectTags(chunk),
          source: page.source,
        });
        scrapedChunks++;
      }

      console.log(`  Loaded ${String(chunks.length).padStart(3)} chunks + ${(page.faqs||[]).length} FAQs + ${(page.cards||[]).length} cards ← ${page.source}`);
    }

    console.log(`  Website listings  : ${listingAdded}`);
  } else {
    console.log("  ⚠  corpus.json not found — building with manual Q&A only.");
    console.log("     Run: npm run scrape  first for better results.");
  }

  // ── 2b. Question variants (many phrasings, same answers) ──────────────────
  let totalQuestions = entries.reduce((sum, e) => sum + (e.question ? 1 : 0), 0);
  let materializedVariants = 0;

  if (VARIANT_CONFIG.enable) {
    const eligible = entries.filter(e => e.type === "qa" && (e.question || e.title));

    const desiredPerEntry = Math.ceil(
      VARIANT_CONFIG.targetTotalQuestions / Math.max(1, eligible.length)
    );
    const perEntryLimit = Math.min(
      VARIANT_CONFIG.maxVariantsPerEntry,
      Math.max(VARIANT_CONFIG.minVariantsPerEntry, desiredPerEntry)
    );

    const variantEntries = [];
    const pairKeys = new Set();

    for (const entry of eligible) {
      const baseQuestion = entry.question || `What is ${entry.title}?`;
      const answer = (entry.answer || entry.text || "")
        .replace(/^Q:.*?\nA:\s*/s, "")
        .trim();

      entry.questions = generateQuestionVariants(baseQuestion, perEntryLimit);

      for (const q of entry.questions) {
        const key = `${normaliseQuestion(q)}::${normaliseQuestion(answer)}`;
        if (!answer || pairKeys.has(key)) continue;
        pairKeys.add(key);

        variantEntries.push({
          id:       `variant_${entries.length + variantEntries.length}`,
          type:     "qa_variant",
          title:    q,
          question: q,
          answer,
          text:     `Q: ${q}\nA: ${answer}`,
          tags:     entry.tags || [],
          source:   entry.source,
          parentId: entry.id,
        });
      }
    }

    if (variantEntries.length) {
      entries.push(...variantEntries);
      materializedVariants = variantEntries.length;
    }

    totalQuestions = entries.reduce((sum, e) => sum + (e.question ? 1 : 0), 0);

    console.log(`  Question variants : ${totalQuestions}`);
    console.log(`  Materialized Q&A  : ${materializedVariants}`);
    if (totalQuestions < VARIANT_CONFIG.targetTotalQuestions) {
      console.log(
        `  Note: Generated ${totalQuestions} questions from current verified MoonSale corpus.`
      );
    }
  }

  // ── 3. Build tag index ─────────────────────────────────────────────────
  for (const entry of entries) {
    for (const tag of (entry.tags || [])) {
      if (!tagIndex[tag]) tagIndex[tag] = [];
      tagIndex[tag].push(entry.id);
    }
  }

  // ── 4. Save ────────────────────────────────────────────────────────────
  const kb = {
    meta: {
      totalEntries:  entries.length,
      totalQuestions,
      manualQA:      manualAdded,
      customQA:      customQA.length,
      websiteListings: listingAdded,
      materializedVariants,
      scrapedChunks,
      tags:          Object.keys(tagIndex),
      builtAt:       new Date().toISOString(),
    },
    entries,
    tagIndex,
  };

  fs.writeFileSync(KB_FILE, JSON.stringify(kb, null, 2), "utf8");

  console.log(`\n  Total KB entries : ${entries.length}`);
  console.log(`  Manual Q&A       : ${manualAdded}`);
  console.log(`  Custom Q&A       : ${customQA.length}`);
  console.log(`  Website listings : ${listingAdded}`);
  console.log(`  Scraped chunks   : ${scrapedChunks}`);
  console.log(`  Tags indexed     : ${Object.keys(tagIndex).length}`);
  console.log(`\n  Saved → ${KB_FILE}`);
  console.log("=".repeat(60));
  console.log("  Done! Run: npm run search  to test");
  console.log("=".repeat(60) + "\n");
}

build();
