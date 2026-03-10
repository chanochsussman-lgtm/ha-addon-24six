ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js and npm
RUN apk add --no-cache nodejs npm

WORKDIR /app

# ── Install backend deps ────────────────────────────────────────────────────
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# ── Install frontend deps and build ────────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Copy backend source ─────────────────────────────────────────────────────
COPY backend/ ./backend/

# ── Copy startup script ─────────────────────────────────────────────────────
COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 8484

CMD ["/run.sh"]
