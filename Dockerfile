# Stage 1: Dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 2: Build
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# CUSTOMIZE: Add your build commands
RUN bun run build

# Stage 3: Runtime
FROM oven/bun:1 AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
# CUSTOMIZE: Copy additional runtime files
# COPY --from=build /app/platform/db/migrations ./platform/db/migrations
# COPY --from=build /app/content ./content

USER bun
EXPOSE 3000
CMD ["bun", "run", "dist/app.js"]
