# install_CCC.ps1 — CCC installer for Windows
# Run from the CCC project root: .\tools\windows\install_CCC.ps1
# If blocked by execution policy: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

$ErrorActionPreference = "Stop"

# Navigate to project root (two levels up from this script)
Set-Location (Join-Path $PSScriptRoot "..\..")

Write-Host ""
Write-Host "=== CCC — Claude Command Center ===" -ForegroundColor Cyan
Write-Host "=== Installer (Windows)           ===" -ForegroundColor Cyan
Write-Host ""

$Errors = 0

# --- Check Git ---

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "[FAIL] Git is not installed." -ForegroundColor Red
    Write-Host "       Install from https://git-scm.com"
    $Errors++
} else {
    $gitVersion = (git --version) -replace 'git version ', ''
    Write-Host "[OK]   Git $gitVersion" -ForegroundColor Green
}

# --- Check Node.js ---

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "[FAIL] Node.js is not installed." -ForegroundColor Red
    Write-Host "       Install Node.js 20+ from https://nodejs.org"
    $Errors++
} else {
    $nodeVersion = (node -v) -replace '^v', ''
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -lt 20) {
        Write-Host "[FAIL] Node.js $nodeVersion found — v20+ required." -ForegroundColor Red
        $Errors++
    } else {
        Write-Host "[OK]   Node.js $nodeVersion" -ForegroundColor Green
    }
}

# --- Check npm ---

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "[FAIL] npm is not installed." -ForegroundColor Red
    $Errors++
} else {
    $npmVersion = npm -v
    Write-Host "[OK]   npm $npmVersion" -ForegroundColor Green
}

# --- Check Visual Studio Build Tools (required for node-pty) ---

$vsWhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasBuildTools = $false

if (Test-Path $vsWhere) {
    $vsInstalls = & $vsWhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($vsInstalls) {
        $hasBuildTools = $true
    }
}

if ($hasBuildTools) {
    Write-Host "[OK]   Visual Studio C++ Build Tools" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Visual Studio Build Tools with C++ workload not found." -ForegroundColor Red
    Write-Host '       Install "Desktop development with C++" from:'
    Write-Host "       https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    $Errors++
}

# --- Check Claude Code CLI ---

$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claudeCmd) {
    Write-Host "[WARN] Claude Code CLI not found." -ForegroundColor Yellow
    Write-Host "       CCC will install, but you need Claude Code to use it."
    Write-Host "       Install: https://docs.anthropic.com/en/docs/claude-code"
} else {
    try {
        $claudeVersion = claude --version 2>$null
        Write-Host "[OK]   Claude Code CLI ($claudeVersion)" -ForegroundColor Green
    } catch {
        Write-Host "[OK]   Claude Code CLI (version unknown)" -ForegroundColor Green
    }
}

# --- Abort if prerequisites missing ---

if ($Errors -gt 0) {
    Write-Host ""
    Write-Host "$Errors prerequisite(s) missing. Fix the issues above and re-run." -ForegroundColor Red
    exit 1
}

Write-Host ""

# --- npm install ---

Write-Host "Installing dependencies (node-pty will compile native code)..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] npm install failed." -ForegroundColor Red
    exit 1
}
Write-Host "[OK]   Dependencies installed" -ForegroundColor Green

# --- Create .env if missing ---

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "[OK]   Created .env from .env.example" -ForegroundColor Green
} else {
    Write-Host "[OK]   .env already exists — skipping" -ForegroundColor Green
}

# --- Done ---

Write-Host ""
Write-Host "=== Installation complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Start CCC:"
Write-Host "  npm start"
Write-Host ""
Write-Host "Then open http://localhost:3000 in your browser."
Write-Host ""
