# Development stage
FROM node:20-alpine AS development

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Make scripts executable
RUN chmod +x scripts/*.sh 2>/dev/null || true

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Production build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

COPY . .
RUN chmod +x scripts/*.sh 2>/dev/null || true
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Expose port
EXPOSE 3000

# Start production server with migrations
CMD ["sh", "-c", "npx prisma migrate deploy && sh scripts/start-with-worker-id.sh start"]
