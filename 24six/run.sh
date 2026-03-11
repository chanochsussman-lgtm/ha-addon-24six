#!/usr/bin/with-contenv bashio
export PORT=8484
export HA_TOKEN="$(bashio::supervisor.token)"
exec node /app/backend/server.js
