#!/usr/bin/env bash
# build-release.sh — Build OS-specific release archives for CCC
# Usage: ./tools/build-release.sh [version]
# Output: dist/CCC-<version>-macos.tar.gz
#         dist/CCC-<version>-linux.tar.gz
#         dist/CCC-<version>-windows.zip

set -e

cd "$(dirname "$0")/.."

VERSION="${1:-$(node -p "require('./package.json').version")}"
DIST="dist"
STAGE="$DIST/.stage"

echo ""
echo "=== Building CCC $VERSION release archives ==="
echo ""

# --- Clean previous build ---

rm -rf "$DIST"
mkdir -p "$DIST"

# --- Shared file list (relative to project root) ---
# Excludes: .git, node_modules, .env, tools/, dist/, data/settings.json

SHARED_FILES=(
  server.js
  package.json
  package-lock.json
  .env.example
  .gitignore
  CLAUDE.md
  README.md
  src
  public
  docs
)

# --- Build function ---

build_archive() {
  local os_name="$1"
  local installer_src="$2"
  local installer_dest="$3"
  local archive_format="$4"

  local stage_dir="$STAGE/CCC"
  rm -rf "$STAGE"
  mkdir -p "$stage_dir"

  # Copy shared files
  for item in "${SHARED_FILES[@]}"; do
    if [ -e "$item" ]; then
      cp -R "$item" "$stage_dir/"
    fi
  done

  # Create data/ with projects.json only (no settings.json)
  mkdir -p "$stage_dir/data"
  if [ -f "data/projects.json" ]; then
    cp "data/projects.json" "$stage_dir/data/"
  fi

  # Copy OS-specific installer to archive root
  cp "$installer_src" "$stage_dir/$installer_dest"
  chmod +x "$stage_dir/$installer_dest" 2>/dev/null || true

  # Patch installer: change cd to work from project root
  if [[ "$installer_dest" == *.sh ]]; then
    sed -i '' 's|cd "$(dirname "$0")/../.."|cd "$(dirname "$0")"|' "$stage_dir/$installer_dest"
  elif [[ "$installer_dest" == *.ps1 ]]; then
    sed -i '' 's|Set-Location (Join-Path $PSScriptRoot "\\.\\.\\\\.\\.")|Set-Location $PSScriptRoot|' "$stage_dir/$installer_dest"
  fi

  # Create archive
  local archive_name="CCC-${VERSION}-${os_name}"
  if [ "$archive_format" = "zip" ]; then
    (cd "$STAGE" && zip -rq "../$archive_name.zip" CCC)
    echo "[OK]  $DIST/$archive_name.zip"
  else
    (cd "$STAGE" && tar -czf "../$archive_name.tar.gz" CCC)
    echo "[OK]  $DIST/$archive_name.tar.gz"
  fi

  rm -rf "$STAGE"
}

# --- Build all three archives ---

build_archive "macos"   "tools/macos/install_CCC.sh"      "install_CCC.sh"  "tar.gz"
build_archive "linux"   "tools/linux/install_CCC.sh"      "install_CCC.sh"  "tar.gz"
build_archive "windows" "tools/windows/install_CCC.ps1"   "install_CCC.ps1" "zip"

# --- Summary ---

echo ""
echo "=== Done ==="
echo ""
ls -lh "$DIST"/CCC-*
echo ""
