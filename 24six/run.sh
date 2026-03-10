#!/usr/bin/with-contenv bashio

export PORT=8484
# Use Supervisor's internal URL for HA API calls
export HA_URL="http://supervisor/core"
# SUPERVISOR_TOKEN is injected automatically by HA Supervisor
export HA_TOKEN="${SUPERVISOR_TOKEN}"
export NODE_ENV=production
# Store session secret in /data so it persists across restarts (no re-login)
export SESSION_SECRET_FILE="/data/.session_secret"

bashio::log.info "Starting 24Six add-on on port ${PORT}"
bashio::log.info "HA URL: ${HA_URL}"

cd /app/backend
exec node server.js
