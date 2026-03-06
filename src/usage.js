/**
 * src/usage.js — Claude Code Usage Scanner
 *
 * Reads ~/.claude/projects/ JSONL session files to calculate
 * real-time token and message usage within the 5-hour window.
 *
 * Token counting matches claude-monitor's algorithm:
 * - totalTokens = input_tokens + output_tokens (no cache tokens)
 * - Deduplicated by message_id:request_id (first occurrence only)
 * - 5-hour window rounded down to the nearest hour
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Plan limits per 5-hour window
const PLAN_LIMITS = {
  pro:   { tokens: 45000,  messages: 250,  label: 'Pro' },
  max5:  { tokens: 220000, messages: 1000, label: 'Max 5' },
  max20: { tokens: 550000, messages: 2000, label: 'Max 20' }
};

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * Scan all JSONL session files and calculate current usage.
 * @param {string} plan - Plan key: 'pro', 'max5', or 'max20'
 * @returns {Promise<object>} Usage data
 */
async function scanUsage(plan) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.max5;
  const now = new Date();
  const windowMs = 5 * 60 * 60 * 1000; // 5 hours

  // Collect all JSONL files modified in last 11 hours (two full 5h windows + 1h buffer)
  // Needs two windows so the epoch walker can find the correct active window boundary
  const jsonlFiles = [];
  const fileMaxAge = windowMs * 2 + 3600000; // 11h
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
  let messageCount = 0;

  for (const entry of allEntries) {
    if (entry.ts < windowStart) continue;

    const key = entry.key;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    inputTokens += entry.input;
    outputTokens += entry.output;
    messageCount++;
  }

  const tokensUsed = inputTokens + outputTokens;
  // +5pp safety buffer — CCC can't see web/API usage, so pad to avoid surprise rate limits
  const SAFETY_BUFFER = 5;
  const tokenPercent = limits.tokens > 0 ? Math.round(tokensUsed / limits.tokens * 100) + SAFETY_BUFFER : 0;
  const messagePercent = limits.messages > 0 ? Math.round(messageCount / limits.messages * 100) + SAFETY_BUFFER : 0;

  // Epoch-based reset timer: walk forward through windows to find the one
  // containing now. Each new window starts at the first message after the
  // previous window expired.
  let epochIdx = 0;
  let blockStart = allEntries[0].ts;
  let blockEnd = new Date(blockStart.getTime() + windowMs);

  while (blockEnd < now && epochIdx < allEntries.length) {
    while (epochIdx < allEntries.length && allEntries[epochIdx].ts < blockEnd) {
      epochIdx++;
    }
    if (epochIdx >= allEntries.length) break;
    blockStart = allEntries[epochIdx].ts;
    blockEnd = new Date(blockStart.getTime() + windowMs);
  }

  // Subtract 5min safety buffer — show less time remaining to avoid surprise rate limits
  const resetMs = Math.max(0, blockEnd - now - 5 * 60000);
  const resetMinutes = Math.round(resetMs / 60000);
  const resetH = Math.floor(resetMinutes / 60);
  const resetM = resetMinutes % 60;
  const resetLabel = resetH > 0 ? `${resetH}h ${resetM}m` : `${resetM}m`;
  // resetTime sent to client for countdown — also buffered
  const resetTimeISO = new Date(blockEnd.getTime() - 5 * 60000).toISOString();

  return {
    tokensUsed,
    tokenLimit: limits.tokens,
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
        if (input === 0 && output === 0) return;

        const tsStr = obj.timestamp;
        if (!tsStr) return;
        const ts = new Date(tsStr);

        const messageId = msg.id || '';
        const requestId = obj.requestId || '';
        const key = (messageId && requestId) ? `${messageId}:${requestId}` : null;

        entries.push({ ts, input, output, key });
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
      messageCount++;
    }
  }

  return {
    weeklyTokens: inputTokens + outputTokens,
    weeklyMessages: messageCount
  };
}

module.exports = { scanUsage, scanWeeklyUsage, PLAN_LIMITS };
