ARG BUILD_FROM
FROM $BUILD_FROM

RUN apk add --no-cache nodejs npm python3 make g++

WORKDIR /app

# Frontend: package.json first for cache, then install, then source, then build
COPY frontend/package.json ./frontend/package.json
RUN cd frontend && \
    npm install --legacy-peer-deps && \
    npm install @rollup/rollup-linux-x64-musl --save-optional --legacy-peer-deps || true

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Backend: source FIRST, then install
COPY backend/ ./backend/
RUN cd backend && npm install --production

COPY run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 8484
CMD ["/run.sh"]
