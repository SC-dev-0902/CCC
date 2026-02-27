#!/usr/bin/env bash
# install_CCC.sh — CCC installer for macOS
# Run from the CCC project root: ./tools/macos/install_CCC.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Navigate to project root (two levels up from this script)
cd "$(dirname "$0")/../.."

echo ""
echo "=== CCC — Claude Command Center ==="
echo "=== Installer (macOS)             ==="
echo ""

ERRORS=0

# --- Check Git ---

if ! command -v git &>/dev/null; then
  echo -e "${RED}[FAIL] Git is not installed.${NC}"
  echo "       Install from https://git-scm.com"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}[OK]${NC}   Git $(git --version | sed 's/git version //')"
fi

# --- Check Node.js ---

if ! command -v node &>/dev/null; then
  echo -e "${RED}[FAIL] Node.js is not installed.${NC}"
  echo "       Install Node.js 20+ from https://nodejs.org"
  ERRORS=$((ERRORS + 1))
else
  NODE_VERSION=$(node -v | sed 's/^v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 20 ]; then
    echo -e "${RED}[FAIL] Node.js $NODE_VERSION found — v20+ required.${NC}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}[OK]${NC}   Node.js $NODE_VERSION"
  fi
fi

# --- Check npm ---

if ! command -v npm &>/dev/null; then
  echo -e "${RED}[FAIL] npm is not installed.${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}[OK]${NC}   npm $(npm -v)"
fi

# --- Check Xcode Command Line Tools ---

if xcode-select -p &>/dev/null; then
  echo -e "${GREEN}[OK]${NC}   Xcode Command Line Tools"
else
  echo -e "${RED}[FAIL] Xcode Command Line Tools not found.${NC}"
  echo "       Run: xcode-select --install"
  ERRORS=$((ERRORS + 1))
fi

# --- Check Claude Code CLI ---

if ! command -v claude &>/dev/null; then
  echo -e "${YELLOW}[WARN] Claude Code CLI not found.${NC}"
  echo "       CCC will install, but you need Claude Code to use it."
  echo "       Install: https://docs.anthropic.com/en/docs/claude-code"
else
  echo -e "${GREEN}[OK]${NC}   Claude Code CLI ($(claude --version 2>/dev/null || echo 'version unknown'))"
fi

# --- Abort if prerequisites missing ---

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo -e "${RED}$ERRORS prerequisite(s) missing. Fix the issues above and re-run.${NC}"
  exit 1
fi

echo ""

# --- npm install ---

echo "Installing dependencies (node-pty will compile native code)..."
npm install
echo -e "${GREEN}[OK]${NC}   Dependencies installed"

# --- Create .env if missing ---

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}[OK]${NC}   Created .env from .env.example"
else
  echo -e "${GREEN}[OK]${NC}   .env already exists — skipping"
fi

# --- Done ---

echo ""
echo -e "${GREEN}=== Installation complete ===${NC}"
echo ""
echo "Start CCC:"
echo "  npm start"
echo ""
echo "Then open http://localhost:3000 in your browser."
echo ""
