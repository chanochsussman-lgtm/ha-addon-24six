ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js, npm, and build tools
RUN apk add --no-cache nodejs npm python3 make g++

WORKDIR /app

# ── Frontend: install deps + build ─────────────────────────────────────────
COPY frontend/package.json ./frontend/
RUN cd frontend && \
    npm install --legacy-peer-deps && \
    npm install @rollup/rollup-linux-x64-musl --save-optional --legacy-peer-deps || true
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Backend: copy source first, then install deps ──────────────────────────
COPY backend/ ./backend/
RUN cd backend && \
    npm install --production && \
    node -e "require('node-fetch'); console.log('node-fetch OK')" && \
    node -e "require('express'); console.log('express OK')"

# ── Startup script ──────────────────────────────────────────────────────────
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 8484
CMD ["/run.sh"]
