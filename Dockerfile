FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files, migrations, and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package*.json ./
RUN npm install --production

# Expose port
EXPOSE 3000

# Start
CMD ["node", "dist/index.js"]
