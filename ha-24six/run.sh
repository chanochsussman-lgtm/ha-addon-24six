#!/usr/bin/with-contenv bashio

bashio::log.info "Starting 24Six Music Add-on..."

# ── Crash loop guard ────────────────────────────────────────────────────────
CRASH_COUNT_FILE=/tmp/crash_count
CRASH_WINDOW=60   # seconds
MAX_CRASHES=5

# Read or init crash counter
if [ -f "$CRASH_COUNT_FILE" ]; then
  CRASHES=$(cat "$CRASH_COUNT_FILE")
  LAST_CRASH=$(stat -c %Y "$CRASH_COUNT_FILE")
  NOW=$(date +%s)
  AGE=$((NOW - LAST_CRASH))
  if [ "$AGE" -gt "$CRASH_WINDOW" ]; then
    CRASHES=0
  fi
else
  CRASHES=0
fi

if [ "$CRASHES" -ge "$MAX_CRASHES" ]; then
  bashio::log.warning "Too many crashes ($CRASHES in ${CRASH_WINDOW}s) — waiting 60s before retry"
  sleep 60
  echo 0 > "$CRASH_COUNT_FILE"
fi

# ── Environment ─────────────────────────────────────────────────────────────
export NODE_ENV=production
export PORT=8484
export HA_TOKEN=$(bashio::config 'options.ha_token' 2>/dev/null || echo "$SUPERVISOR_TOKEN")
export HA_URL="http://supervisor/core"

# ── Start server with auto-restart loop ─────────────────────────────────────
while true; do
  START=$(date +%s)

  bashio::log.info "Launching server.js (PID $$)"
  node /app/server.js &
  SERVER_PID=$!

  # Wait for server to be ready (up to 30s)
  for i in $(seq 1 30); do
    if curl -sf http://localhost:8484/api/setup/status > /dev/null 2>&1; then
      bashio::log.info "Server ready after ${i}s"
      break
    fi
    sleep 1
  done

  # Wait for server process
  wait $SERVER_PID
  EXIT_CODE=$?
  END=$(date +%s)
  UPTIME=$((END - START))

  bashio::log.warning "Server exited (code=$EXIT_CODE uptime=${UPTIME}s)"

  # Increment crash counter
  CRASHES=$((CRASHES + 1))
  echo "$CRASHES" > "$CRASH_COUNT_FILE"

  # Back-off based on how fast it crashed
  if [ "$UPTIME" -lt 5 ]; then
    DELAY=10
  elif [ "$UPTIME" -lt 30 ]; then
    DELAY=5
  else
    DELAY=2
  fi

  bashio::log.info "Restarting in ${DELAY}s..."
  sleep $DELAY
done
