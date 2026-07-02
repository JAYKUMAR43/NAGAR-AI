# =========================================================================
# Stage 1: Install dependencies and build the application
# =========================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

# Copy package configurations
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Generate the Prisma 6 Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# =========================================================================
# Stage 2: Production runner
# =========================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable Next.js telemetry collection during runtime
ENV NEXT_TELEMETRY_DISABLED=1

# Copy build output, dependencies, and database files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db

# Cloud Run injects the PORT environment variable, which defaults to 8080.
# We map Next.js to start on this injected PORT.
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start the application server
CMD ["node", "server.js"]
