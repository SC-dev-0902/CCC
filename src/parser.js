/**
 * src/parser.js — Claude Code Status Parser
 *
 * ISOLATED MODULE: All Claude Code output parsing lives here.
 * Nothing else in CCC touches raw output interpretation.
 *
 * Maps raw PTY output to one of five states:
 *   WAITING_FOR_INPUT  → 🔴 Red    — Claude is waiting for a decision
 *   RUNNING            → 🟡 Yellow — Claude is actively working
 *   COMPLETED          → 🟢 Green  — Task done, awaiting next instruction
 *   ERROR              → 🟠 Orange — Error state detected
 *   UNKNOWN            → ⚫ Grey   — No session or unrecognised output
 *
 * Pattern sources (Claude Code v2.1.x):
 *   - Thinking state: "(thinking)" text, decorative spinner chars (✢✳✶✻✽⏺)
 *   - Thinking verbs: "· Beaming…", "· Pondering…" etc.
 *   - Input prompt: "❯" character when idle/waiting for next instruction
 *   - Permission prompts: "Claude wants to", "[y]", "[n]" etc.
 *   - Tool use: "⏺" followed by file count "(ctrl+o to expand)"
 */

const STATES = {
  WAITING_FOR_INPUT: 'waiting',
  RUNNING: 'running',
  COMPLETED: 'completed',
  ERROR: 'error',
  UNKNOWN: 'unknown'
};

// --- ANSI Utilities ---

/**
 * Strip ANSI escape sequences from raw terminal output.
 * Handles SGR, CSI (including DEC private modes like ?2026h),
 * OSC, and other common sequences.
 */
function stripAnsi(str) {
  return str.replace(
    // eslint-disable-next-line no-control-regex
    /\x1B(?:\[[\?]?[0-9;]*[a-zA-Z]|\][^\x07\x1B]*(?:\x07|\x1B\\)|\([A-Z]|[>=<](?:[a-zA-Z])?)/g,
    ''
  );
}

// --- Detection Patterns ---

// Claude Code v2.1.x spinner/thinking characters
// These decorative symbols appear during thinking state
const SPINNER_CHARS = /[✢✳✶✻✽⏺⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;

// "(thinking)" literal text — primary RUNNING indicator in v2.1.x
const THINKING_TEXT = /\(thinking\)/;

// Thinking verb pattern: "· Verbing…" (e.g., "· Beaming…", "· Pondering…")
const THINKING_VERB = /·\s+\w+…/;

// Input prompt character — Claude Code shows "❯" when ready for input
const INPUT_PROMPT = /❯/;

// Tool use indicator — "⏺" followed by file count or tool description
const TOOL_USE = /⏺.*(?:file|ctrl\+o)/i;

// Permission prompt patterns (WAITING_FOR_INPUT)
const PERMISSION_PATTERNS = [
  /Claude wants to/,
  /\[y\]\s*(Yes|Accept)/i,
  /\[n\]\s*(No|Reject|Deny)/i,
  /\[e\]\s*Edit/i,
  /Allow\s+once/i,
  /Enter to select/i,
  /Do you want to proceed/i,
  /\(y\/n\)/i,
  /\(Y\/n\)/i,
  /\(yes\/no\)/i
];

// Error patterns
const ERROR_PATTERNS = [
  /\bError:/,
  /\bERROR\b/,
  /\bPermission denied\b/i,
  /\brate limit\b/i,
  /\bAPI error\b/i,
  /\bconnection refused\b/i
];

// BEL character — Claude Code notification
// eslint-disable-next-line no-control-regex
const BEL_CHAR = /\x07/;

// --- Parser Class ---

class ClaudeParser {
  /**
   * @param {object} options
   * @param {function} options.onStateChange - callback(newState, previousState)
   * @param {function} [options.onDegraded] - callback(degradedInfo)
   * @param {number} [options.degradeThresholdMs=60000] - ms of unrecognised output before degraded
   * @param {number} [options.windowMs=5000] - sliding window size for output analysis
   */
  constructor(options = {}) {
    this.onStateChange = options.onStateChange || (() => {});
    this.onDegraded = options.onDegraded || (() => {});
    this.degradeThresholdMs = options.degradeThresholdMs || 60000;
    this.windowMs = options.windowMs || 5000;

    this.state = STATES.UNKNOWN;
    this.degraded = false;
    this.lastRecognisedAt = Date.now();
    this.recentOutput = [];       // { timestamp, raw, stripped }
    this.runningDetectedAt = 0;   // last time a running indicator was seen
    this.degradeTimer = null;
  }

  /**
   * Feed raw PTY output data into the parser.
   * Call this for every chunk of data from the PTY onData callback.
   * @param {string} data - raw terminal output including ANSI sequences
   */
  feed(data) {
    const now = Date.now();
    const stripped = stripAnsi(data);

    // Add to sliding window
    this.recentOutput.push({ timestamp: now, raw: data, stripped });

    // Prune old entries outside the window
    const cutoff = now - this.windowMs;
    this.recentOutput = this.recentOutput.filter(e => e.timestamp >= cutoff);

    // Detect state from this chunk
    const detected = this._detect(data, stripped, now);

    if (detected !== null) {
      this.lastRecognisedAt = now;

      // Clear degraded state if we recognise something
      if (this.degraded) {
        this.degraded = false;
      }

      if (detected !== this.state) {
        const previous = this.state;
        this.state = detected;
        this.onStateChange(detected, previous);
      }
    }

    // Check for degradation
    this._checkDegradation(now);
  }

  /**
   * Detect state from a single chunk of output.
   * Returns a state string or null if unrecognised.
   */
  _detect(raw, stripped, now) {
    // Priority 1: WAITING_FOR_INPUT (permission prompts, interactive questions)
    if (this._isWaiting(stripped)) {
      return STATES.WAITING_FOR_INPUT;
    }

    // Priority 2: RUNNING (thinking, spinners, tool use)
    if (this._isRunning(raw, stripped, now)) {
      return STATES.RUNNING;
    }

    // Priority 3: COMPLETED (input prompt visible after running, or BEL)
    if (this._isCompleted(raw, stripped, now)) {
      return STATES.COMPLETED;
    }

    // Priority 4: ERROR (only when not running — avoid false positives from tool output)
    if (this._isError(stripped)) {
      return STATES.ERROR;
    }

    return null;
  }

  _isWaiting(stripped) {
    for (const pattern of PERMISSION_PATTERNS) {
      if (pattern.test(stripped)) {
        return true;
      }
    }
    return false;
  }

  _isError(stripped) {
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.test(stripped)) {
        // Don't flag errors while running — could be tool output
        if (this.state === STATES.RUNNING) return false;
        return true;
      }
    }
    return false;
  }

  _isRunning(raw, stripped, now) {
    // "(thinking)" literal — strongest signal in v2.1.x
    if (THINKING_TEXT.test(stripped)) {
      this.runningDetectedAt = now;
      return true;
    }

    // Thinking verb pattern: "· Verbing…"
    if (THINKING_VERB.test(stripped)) {
      this.runningDetectedAt = now;
      return true;
    }

    // Decorative spinner characters (✢✳✶✻✽⏺ and Braille)
    // Only match if it's a short chunk (spinner frame), not content output
    if (SPINNER_CHARS.test(stripped) && stripped.trim().length < 20) {
      this.runningDetectedAt = now;
      return true;
    }

    // Tool use indicator
    if (TOOL_USE.test(stripped)) {
      this.runningDetectedAt = now;
      return true;
    }

    // If running was detected very recently (within 2 seconds), still RUNNING
    if (this.runningDetectedAt > 0 && (now - this.runningDetectedAt) < 2000) {
      return true;
    }

    return false;
  }

  _isCompleted(raw, stripped, now) {
    // BEL character signals Claude finished and wants attention
    if (BEL_CHAR.test(raw) && this.state === STATES.RUNNING) {
      return true;
    }

    // Input prompt "❯" — Claude Code is idle and ready for input.
    // This fires both on initial startup and after finishing a response.
    if (INPUT_PROMPT.test(stripped)) {
      return true;
    }

    // Transition: was RUNNING, no running indicators for 3+ seconds
    if (this.state === STATES.RUNNING &&
        this.runningDetectedAt > 0 &&
        (now - this.runningDetectedAt) >= 3000) {
      return true;
    }

    return false;
  }

  _checkDegradation(now) {
    // Only check degradation if we're in an active state (not UNKNOWN)
    if (this.state === STATES.UNKNOWN) return;

    const timeSinceRecognised = now - this.lastRecognisedAt;

    if (timeSinceRecognised >= this.degradeThresholdMs && !this.degraded) {
      this.degraded = true;
      this.onDegraded({
        lastRecognisedAt: this.lastRecognisedAt,
        elapsedMs: timeSinceRecognised,
        recentOutput: this._getSanitisedSample()
      });
    }
  }

  /**
   * Get a sanitised sample of recent output for diagnostics.
   * Strips any content that might contain code or file contents.
   * Returns only ANSI formatting tokens and structural patterns.
   */
  _getSanitisedSample() {
    const recent = this.recentOutput.slice(-5);
    return recent.map(e => {
      const truncated = e.stripped.substring(0, 200);
      return truncated.replace(/[^\x20-\x7E\n\r]/g, '?');
    }).join('\n---\n');
  }

  /**
   * Reset parser state. Call when a new session starts.
   */
  reset() {
    const previous = this.state;
    this.state = STATES.UNKNOWN;
    this.degraded = false;
    this.lastRecognisedAt = Date.now();
    this.recentOutput = [];
    this.runningDetectedAt = 0;
    if (this.degradeTimer) {
      clearInterval(this.degradeTimer);
      this.degradeTimer = null;
    }
    if (previous !== STATES.UNKNOWN) {
      this.onStateChange(STATES.UNKNOWN, previous);
    }
  }

  /**
   * Start periodic degradation checking.
   * Call this after session starts to enable timed degradation detection.
   */
  startDegradeMonitor() {
    if (this.degradeTimer) clearInterval(this.degradeTimer);
    this.degradeTimer = setInterval(() => {
      this._checkDegradation(Date.now());
    }, 10000);
  }

  /**
   * Stop periodic degradation checking.
   */
  stopDegradeMonitor() {
    if (this.degradeTimer) {
      clearInterval(this.degradeTimer);
      this.degradeTimer = null;
    }
  }

  /**
   * Get current state.
   */
  getState() {
    return this.state;
  }

  /**
   * Check if parser is in degraded mode.
   */
  isDegraded() {
    return this.degraded;
  }
}

module.exports = { ClaudeParser, STATES, stripAnsi };
