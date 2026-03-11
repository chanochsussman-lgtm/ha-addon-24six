FROM node:18-alpine

WORKDIR /app

# Copy and install backend deps first
COPY package.json .
RUN npm install

# Copy backend source
COPY server.js .

# Copy frontend and build
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install --legacy-peer-deps
RUN npm run build

WORKDIR /app
EXPOSE 8484
CMD ["node", "server.js"]
