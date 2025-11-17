#!/bin/bash

# Kill Evaluation Servers
# Use this to clean up any zombie server processes

echo "🔍 Looking for eval server processes..."

# Use pgrep for reliable process matching (simpler than ps + grep + awk)
PIDS=$(pgrep -f "bun.*(server\.ts|run --filter)")

if [ -z "$PIDS" ]; then
  echo "✅ No eval server processes found"
  exit 0
fi

echo "Found processes:"
ps -p $PIDS 2>/dev/null || echo "$PIDS"

echo ""
echo "🛑 Killing processes..."
echo "$PIDS" | xargs kill -9 2>/dev/null

# Wait a moment and verify
sleep 1
REMAINING=$(pgrep -f "bun.*(server\.ts|run --filter)")
if [ -n "$REMAINING" ]; then
  echo "⚠️  Some processes still running, trying SIGTERM..."
  echo "$REMAINING" | xargs kill -15 2>/dev/null
  sleep 2
fi

echo "✅ All eval server processes killed"
