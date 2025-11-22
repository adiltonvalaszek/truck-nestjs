# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install all dependencies
RUN npm ci

COPY . .

# Build application
RUN npm run build

# Stage 2: Production Dependencies
FROM node:22-alpine AS prod-deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Rebuild native modules for current platform
RUN npm rebuild bcrypt --build-from-source

# Stage 3: Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist/data-source.js ./
COPY --from=builder /app/run-migrations.js ./
COPY --from=builder /app/seed.js ./

EXPOSE 3000

# Start command: run migrations, seed, then start app
CMD ["sh", "-c", "node run-migrations.js && node seed.js && node dist/src/main.js"]
