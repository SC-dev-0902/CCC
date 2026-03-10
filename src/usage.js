/**
 * src/usage.js — Claude Code Usage Scanner
 *
 * Reads ~/.claude/projects/ JSONL session files to calculate
 * real-time token and message usage within the 5-hour window.
 *
 * Token counting:
 * - totalTokens = input_tokens + cache_creation_input_tokens + output_tokens
 * - cache_read_input_tokens excluded (Anthropic: "cached content doesn't count against limits when reused")
 * - Deduplicated by message_id:request_id (first occurrence only)
 * - Rolling 5-hour window from now
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Message limits per 5-hour window (per plan)
// Token budget is user-configurable in Settings — not hardcoded here
const PLAN_LIMITS = {
  pro:   { messages: 250,  label: 'Pro' },
  max5:  { messages: 1000, label: 'Max 5' },
  max20: { messages: 2000, label: 'Max 20' }
};

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * Scan all JSONL session files and calculate current usage.
 * @param {string} plan - Plan key: 'pro', 'max5', or 'max20'
 * @param {number} tokenBudget - User-configured 5h token budget
 * @returns {Promise<object>} Usage data
 */
async function scanUsage(plan, tokenBudget) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.max5;
  const now = new Date();
  const windowMs = 5 * 60 * 60 * 1000; // 5 hours

  // Collect all JSONL files modified in last 6 hours (5h window + 1h buffer)
  const jsonlFiles = [];
  const fileMaxAge = windowMs + 3600000; // 6h
  try {
    const dirs = fs.readdirSync(CLAUDE_PROJECTS_DIR);
    for (const dir of dirs) {
      const dirPath = path.join(CLAUDE_PROJECTS_DIR, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs < fileMaxAge) {
          jsonlFiles.push(filePath);
        }
      }
    }
  } catch (e) {
    return null; // Can't read Claude dir
  }

  if (jsonlFiles.length === 0) return null;

  // Parse all files, collect entries within the 5h window
  const allEntries = [];

  for (const filePath of jsonlFiles) {
    const entries = await parseJsonlFile(filePath);
    allEntries.push(...entries);
  }

  if (allEntries.length === 0) return null;

  // Sort by timestamp
  allEntries.sort((a, b) => a.ts - b.ts);

  // Rolling window for token/message counting (last 5h from now)
  const windowStart = new Date(now.getTime() - windowMs);

  const seen = new Set();
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreateTokens = 0;
  let messageCount = 0;
  let oldestInWindow = null;

  for (const entry of allEntries) {
    if (entry.ts < windowStart) continue;

    const key = entry.key;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    inputTokens += entry.input;
    outputTokens += entry.output;
    cacheCreateTokens += entry.cacheCreate;
    messageCount++;

    if (!oldestInWindow) oldestInWindow = entry;
  }

  // Token total: input + cache_creation + output (cache_read excluded)
  const tokensUsed = inputTokens + cacheCreateTokens + outputTokens;
  // +5pp safety buffer — CCC only sees CLI usage, shared pool (Desktop/web) is invisible
  const SAFETY_BUFFER = 5;
  const tokenPercent = tokenBudget > 0 ? Math.round(tokensUsed / tokenBudget * 100) + SAFETY_BUFFER : 0;
  const messagePercent = limits.messages > 0 ? Math.round(messageCount / limits.messages * 100) + SAFETY_BUFFER : 0;

  // Rolling window reset: oldest counted entry ages out at oldest.ts + 5h
  // Subtract 30min safety buffer (10% of 5h window) — CCC only sees CLI,
  // shared pool activity (Desktop/web) may have started the window earlier
  const TIMER_BUFFER_MS = 30 * 60000;
  let resetMs = 0;
  if (oldestInWindow) {
    const resetTime = new Date(oldestInWindow.ts.getTime() + windowMs);
    resetMs = Math.max(0, resetTime - now - TIMER_BUFFER_MS);
  }
  const resetTimeISO = oldestInWindow
    ? new Date(oldestInWindow.ts.getTime() + windowMs - TIMER_BUFFER_MS).toISOString()
    : new Date(now.getTime() + windowMs).toISOString();
  const resetMinutes = Math.round(resetMs / 60000);
  const resetH = Math.floor(resetMinutes / 60);
  const resetM = resetMinutes % 60;
  const resetLabel = resetH > 0 ? `${resetH}h ${resetM}m` : `${resetM}m`;

  return {
    tokensUsed,
    tokenLimit: tokenBudget,
    tokenPercent: Math.min(tokenPercent, 100),
    tokenPercentRaw: tokenPercent,
    messagesUsed: messageCount,
    messageLimit: limits.messages,
    messagePercent: Math.min(messagePercent, 100),
    messagePercentRaw: messagePercent,
    resetLabel,
    resetTime: resetTimeISO,
    plan: limits.label
  };
}

/**
 * Parse a single JSONL file, extracting usage entries.
 */
function parseJsonlFile(filePath) {
  return new Promise((resolve) => {
    const entries = [];
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    rl.on('line', (line) => {
      try {
        const obj = JSON.parse(line);
        if (obj.type !== 'assistant') return;

        const msg = obj.message;
        if (!msg || !msg.usage) return;

        const usage = msg.usage;
        const input = usage.input_tokens || 0;
        const output = usage.output_tokens || 0;
        const cacheCreate = usage.cache_creation_input_tokens || 0;
        if (input === 0 && output === 0 && cacheCreate === 0) return;

        const tsStr = obj.timestamp;
        if (!tsStr) return;
        const ts = new Date(tsStr);

        const messageId = msg.id || '';
        const requestId = obj.requestId || '';
        const key = (messageId && requestId) ? `${messageId}:${requestId}` : null;

        entries.push({ ts, input, output, cacheCreate, key });
      } catch (e) {
        // Skip malformed lines
      }
    });

    rl.on('close', () => resolve(entries));
    rl.on('error', () => resolve(entries));
  });
}

/**
 * Scan all JSONL files from the last 7 days for weekly totals.
 * No deduplication needed — just raw totals for informational display.
 */
async function scanWeeklyUsage() {
  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekStart = new Date(now.getTime() - weekMs);

  const jsonlFiles = [];
  try {
    const dirs = fs.readdirSync(CLAUDE_PROJECTS_DIR);
    for (const dir of dirs) {
      const dirPath = path.join(CLAUDE_PROJECTS_DIR, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs < weekMs + 3600000) {
          jsonlFiles.push(filePath);
        }
      }
    }
  } catch (e) {
    return null;
  }

  if (jsonlFiles.length === 0) return null;

  const seen = new Set();
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreateTokens = 0;
  let messageCount = 0;

  for (const filePath of jsonlFiles) {
    const entries = await parseJsonlFile(filePath);
    for (const entry of entries) {
      if (entry.ts < weekStart) continue;
      const key = entry.key;
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      inputTokens += entry.input;
      outputTokens += entry.output;
      cacheCreateTokens += entry.cacheCreate;
      messageCount++;
    }
  }

  return {
    weeklyTokens: inputTokens + cacheCreateTokens + outputTokens,
    weeklyMessages: messageCount
  };
}

module.exports = { scanUsage, scanWeeklyUsage, PLAN_LIMITS };
