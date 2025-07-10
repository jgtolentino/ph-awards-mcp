# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src
COPY config ./config
COPY tests ./tests
COPY jest.config.js ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install build dependencies for better-sqlite3 if needed
RUN apk add --no-cache python3 make g++ 

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy config and database
COPY config ./config
COPY ces_intelligence.db ./ces_intelligence.db

# Create log directory
RUN mkdir -p /app/logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Set environment variables
ENV NODE_ENV=production
ENV MCP_LOG_FILE=/app/logs/mcp.log
ENV RENDER_API_URL=https://gagambi-backend.onrender.com

# Expose port for health checks
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application
CMD ["node", "dist/index.js"]