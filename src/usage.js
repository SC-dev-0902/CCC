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
  pro:   { tokens: 19000,  messages: 250,  label: 'Pro' },
  max5:  { tokens: 88000,  messages: 1000, label: 'Max 5' },
  max20: { tokens: 220000, messages: 2000, label: 'Max 20' }
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

  // Collect all JSONL files modified in last 6 hours (buffer)
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
        if (now - stat.mtimeMs < windowMs + 3600000) { // 5h + 1h buffer
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

  // Determine block start: round first entry's hour down
  const firstTs = allEntries[0].ts;
  const blockStart = new Date(firstTs);
  blockStart.setMinutes(0, 0, 0);
  const blockEnd = new Date(blockStart.getTime() + windowMs);

  // Filter to block window, deduplicate by message_id:request_id (first wins)
  const seen = new Set();
  let inputTokens = 0;
  let outputTokens = 0;
  let messageCount = 0;

  for (const entry of allEntries) {
    if (entry.ts < blockStart || entry.ts > blockEnd) continue;

    const key = entry.key;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);

    inputTokens += entry.input;
    outputTokens += entry.output;
    messageCount++;
  }

  const tokensUsed = inputTokens + outputTokens;
  const tokenPercent = limits.tokens > 0 ? Math.round(tokensUsed / limits.tokens * 100) : 0;
  const messagePercent = limits.messages > 0 ? Math.round(messageCount / limits.messages * 100) : 0;

  // Reset time
  const resetTime = blockEnd;
  const resetMs = resetTime - now;
  const resetMinutes = Math.max(0, Math.round(resetMs / 60000));
  const resetH = Math.floor(resetMinutes / 60);
  const resetM = resetMinutes % 60;
  const resetLabel = resetH > 0 ? `${resetH}h ${resetM}m` : `${resetM}m`;

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
    resetTime: resetTime.toISOString(),
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
