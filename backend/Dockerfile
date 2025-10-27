# Backend Dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies (only package files first for better cache)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --only=production

# Copy source
COPY server.js ./
COPY flow.js ./
# Credentials are mounted at runtime (not copied)

# Environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck (optional: simple TCP)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
