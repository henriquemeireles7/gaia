# Stage 1: Dependencies
FROM oven/bun:1@sha256:87416c977a612a204eb54ab9f3927023c2a3c971f4f345a01da08ea6262ae30e AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Stage 2: Build
FROM oven/bun:1@sha256:87416c977a612a204eb54ab9f3927023c2a3c971f4f345a01da08ea6262ae30e AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# CUSTOMIZE: Add your build commands
RUN bun run build

# Stage 3: Runtime
FROM oven/bun:1@sha256:87416c977a612a204eb54ab9f3927023c2a3c971f4f345a01da08ea6262ae30e AS runtime
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
