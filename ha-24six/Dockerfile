ARG BUILD_FROM
FROM $BUILD_FROM

# ── System deps ──────────────────────────────────────────────────────────────
RUN apk add --no-cache nodejs npm curl

# ── Backend ──────────────────────────────────────────────────────────────────
WORKDIR /app
COPY ha-24six/package*.json ./
RUN npm install --production
COPY ha-24six/server.js ./

# ── Frontend build ───────────────────────────────────────────────────────────
WORKDIR /app/frontend
COPY ha-24six/frontend/package*.json ./
RUN npm install --legacy-peer-deps && \
    npm install --legacy-peer-deps --optional
COPY ha-24six/frontend/ ./
RUN npm run build

# ── Startup ──────────────────────────────────────────────────────────────────
COPY ha-24six/run.sh /run.sh
RUN chmod a+x /run.sh

# ── Healthcheck — HA watchdog also hits this but Docker uses it for restart ──
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -sf http://localhost:8484/api/setup/status || exit 1

EXPOSE 8484
CMD ["/run.sh"]
