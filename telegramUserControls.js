/**
 * Telegram user-level AI controls:
 * - Ignore configured admin/community sender IDs.
 * - Pause AI replies for /stopAiBot duration.
 * - Resume AI replies via /startAiBot.
 * - Add stop/start hint from the 2nd AI reply onward.
 *
 * Storage mode:
 * - Supabase (if SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set)
 * - In-memory fallback
 */

import { createClient } from "@supabase/supabase-js";

const STOP_HOURS = Math.max(1, Number(process.env.AI_BOT_STOP_HOURS || 12) || 12);
const STOP_DURATION_MS = STOP_HOURS * 60 * 60 * 1000;

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ""
).trim();
const SUPABASE_TABLE = String(process.env.SUPABASE_BOT_USER_TABLE || "bot_user_controls").trim();

const COMMAND_STOP_AI = "/stopaibot";
const COMMAND_START_AI = "/startaibot";

const memoryState = new Map();

let supabaseUnavailable = false;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function normalizeUserId(userId) {
  if (userId === undefined || userId === null) return "";
  const value = String(userId).trim();
  return value;
}

function parseTelegramIdSet(raw) {
  const out = new Set();
  const text = String(raw || "").trim();
  if (!text) return out;

  for (const part of text.split(/[\s,]+/)) {
    const value = String(part || "").trim();
    if (!value) continue;
    out.add(value);
  }

  return out;
}

function getPrivilegedSenderIdSet() {
  const merged = [
    process.env.ADMIN_TELEGRAM_ID,
    process.env.ADMIN_TELEGRAM_IDS,
    process.env.COMMUNITY_ENGAGEMENT_TELEGRAM_ID,
    process.env.COMMUNITY_ENGAGEMENT_TELEGRAM_IDS,
    process.env.COMMUNITY_MANAGER_TELEGRAM_ID,
    process.env.COMMUNITY_MANAGER_TELEGRAM_IDS,
  ]
    .filter(Boolean)
    .join(",");

  return parseTelegramIdSet(merged);
}

function defaultRecord() {
  return {
    replyCount: 0,
    aiStoppedUntilMs: 0,
    updatedAt: 0,
  };
}

function getMemoryRecord(userKey) {
  const existing = memoryState.get(userKey);
  if (existing) return { ...existing };

  const fresh = defaultRecord();
  memoryState.set(userKey, fresh);
  return { ...fresh };
}

function setMemoryRecord(userKey, record) {
  memoryState.set(userKey, {
    replyCount: Math.max(0, Number(record.replyCount || 0) || 0),
    aiStoppedUntilMs: Math.max(0, Number(record.aiStoppedUntilMs || 0) || 0),
    updatedAt: Date.now(),
  });
}

function fromSupabaseRow(row) {
  if (!row || typeof row !== "object") return defaultRecord();

  const untilMs = row.ai_stopped_until ? Date.parse(String(row.ai_stopped_until)) : 0;
  return {
    replyCount: Math.max(0, Number(row.reply_count || 0) || 0),
    aiStoppedUntilMs: Number.isFinite(untilMs) ? Math.max(0, untilMs) : 0,
    updatedAt: row.updated_at ? Date.parse(String(row.updated_at)) || 0 : 0,
  };
}

function toSupabaseRow(userKey, record) {
  return {
    user_id: userKey,
    reply_count: Math.max(0, Number(record.replyCount || 0) || 0),
    ai_stopped_until: record.aiStoppedUntilMs ? new Date(record.aiStoppedUntilMs).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

function canUseSupabase() {
  return !!supabase && !supabaseUnavailable;
}

async function readRecord(userKey) {
  if (!canUseSupabase()) {
    return getMemoryRecord(userKey);
  }

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("user_id, reply_count, ai_stopped_until, updated_at")
      .eq("user_id", userKey)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const record = fromSupabaseRow(data);
    setMemoryRecord(userKey, record);
    return record;
  } catch (err) {
    supabaseUnavailable = true;
    console.error(`[AI CTRL] Supabase read failed, using memory fallback: ${err?.message || err}`);
    return getMemoryRecord(userKey);
  }
}

async function writeRecord(userKey, record) {
  setMemoryRecord(userKey, record);

  if (!canUseSupabase()) {
    return;
  }

  try {
    const payload = toSupabaseRow(userKey, record);
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      throw error;
    }
  } catch (err) {
    supabaseUnavailable = true;
    console.error(`[AI CTRL] Supabase write failed, using memory fallback: ${err?.message || err}`);
  }
}

export function isPrivilegedTelegramUser(userId) {
  const userKey = normalizeUserId(userId);
  if (!userKey) return false;
  return getPrivilegedSenderIdSet().has(userKey);
}

export function isAiControlCommand(command) {
  const cmd = String(command || "").toLowerCase();
  return cmd === COMMAND_STOP_AI || cmd === COMMAND_START_AI;
}

export async function runAiControlCommand(command, userId) {
  const cmd = String(command || "").toLowerCase();
  if (!isAiControlCommand(cmd)) return "";

  const userKey = normalizeUserId(userId);
  if (!userKey) return "";

  if (cmd === COMMAND_STOP_AI) {
    const record = await readRecord(userKey);
    record.aiStoppedUntilMs = Date.now() + STOP_DURATION_MS;
    await writeRecord(userKey, record);
    return `AI replies are paused for ${STOP_HOURS}h\\. Use /startAiBot to resume\\.`;
  }

  const record = await readRecord(userKey);
  record.aiStoppedUntilMs = 0;
  await writeRecord(userKey, record);
  return `AI replies are active again\\. Use /stopAiBot to pause for ${STOP_HOURS}h\\.`;
}

export async function isAiPausedForUser(userId) {
  const userKey = normalizeUserId(userId);
  if (!userKey) return false;

  const record = await readRecord(userKey);
  if (!record.aiStoppedUntilMs) return false;

  if (record.aiStoppedUntilMs <= Date.now()) {
    record.aiStoppedUntilMs = 0;
    await writeRecord(userKey, record);
    return false;
  }

  return true;
}

export async function getReplyHintForUser(userId) {
  const userKey = normalizeUserId(userId);
  if (!userKey) return "";

  const record = await readRecord(userKey);
  record.replyCount = Math.max(0, Number(record.replyCount || 0) || 0) + 1;
  await writeRecord(userKey, record);

  if (record.replyCount < 2) return "";

  return `\n\nUse /stopAiBot to pause AI replies for ${STOP_HOURS}h\\. Use /startAiBot to resume\\.`;
}

export function getAiStopHours() {
  return STOP_HOURS;
}

export function __resetTelegramUserControlsForTests() {
  memoryState.clear();
  supabaseUnavailable = false;
}
