#!/bin/bash

# Only run in Claude Code on the web (https://claude.ai/code) sessions
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

set -e

echo "🚀 Starting dependency installation..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
  echo "📦 Bun not found. Installing bun..."

  BUN_INSTALLED=false

  # Try npm installer first (faster, more reliable in some environments)
  if command -v npm &> /dev/null; then
    echo "🔧 Attempting installation via npm..."
    if npm install -g bun >/dev/null 2>&1; then
      echo "✅ Bun installed successfully via npm!"
      BUN_INSTALLED=true
    else
      echo "⚠️  npm install failed, trying official installer..."
    fi
  fi

  # Fallback to official curl installer if npm failed or wasn't available
  if [ "$BUN_INSTALLED" = false ]; then
    echo "🔧 Attempting installation via official installer..."
    # Suppress all output from curl and bash to avoid showing errors in hook output
    if (curl -fsSL https://bun.sh/install 2>&1 | bash) >/dev/null 2>&1; then
      echo "✅ Bun installed successfully via official installer!"
      BUN_INSTALLED=true
    else
      echo "❌ Failed to install bun: both npm and curl methods failed"
      exit 1
    fi
  fi

  # Configure PATH for bun (runs regardless of installation method)
  if [ "$BUN_INSTALLED" = true ]; then
    echo "🔧 Configuring PATH for bun..."

    # Add bun to PATH for current session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"

    # Persist PATH to CLAUDE_ENV_FILE if available (for subsequent commands)
    if [ -n "$CLAUDE_ENV_FILE" ]; then
      echo "export BUN_INSTALL=\"$HOME/.bun\"" >> "$CLAUDE_ENV_FILE"
      echo "export PATH=\"$BUN_INSTALL/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
    fi

    # Also persist to shell profile for future sessions
    SHELL_PROFILE="$HOME/.bashrc"
    if [ ! -f "$SHELL_PROFILE" ]; then
      SHELL_PROFILE="$HOME/.profile"
    fi

    # Check if bun is already in the profile
    if ! grep -q "BUN_INSTALL" "$SHELL_PROFILE" 2>/dev/null; then
      echo "" >> "$SHELL_PROFILE"
      echo "# bun" >> "$SHELL_PROFILE"
      echo "export BUN_INSTALL=\"$HOME/.bun\"" >> "$SHELL_PROFILE"
      echo "export PATH=\"$BUN_INSTALL/bin:\$PATH\"" >> "$SHELL_PROFILE"
      echo "✅ Added bun to $SHELL_PROFILE"
    fi

    echo "✅ PATH configuration complete!"
  fi
else
  echo "✅ Bun is already installed ($(bun --version))"
fi

# Install project dependencies
echo "📦 Installing project dependencies with bun..."
cd "$CLAUDE_PROJECT_DIR"
bun install

echo "✅ All dependencies installed successfully!"
echo "   - Workspace packages"
echo "   - Dev dependencies"

exit 0
