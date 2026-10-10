FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json ./
RUN bun install --linker hoisted
COPY . .
RUN bunx prisma generate && bun run build

FROM oven/bun:1
WORKDIR /app
COPY package.json ./
# Copy full node_modules: @prisma/client, @prisma/adapter-pg and pg are devDependencies but needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "dist/server.js"]
