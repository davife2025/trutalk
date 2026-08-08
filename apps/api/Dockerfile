# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy the whole workspace — pnpm needs the root lockfile/workspace config,
# and @platform/* packages are workspace-linked, not published to npm.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

RUN pnpm install --frozen-lockfile --filter=@platform/api...
RUN pnpm --filter=@platform/api build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
ENV NODE_ENV=production

COPY --from=builder /repo/pnpm-workspace.yaml /repo/package.json /repo/pnpm-lock.yaml* /repo/tsconfig.base.json ./
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/apps/api/package.json ./apps/api/package.json
COPY --from=builder /repo/apps/api/dist ./apps/api/dist

RUN pnpm install --frozen-lockfile --prod --filter=@platform/api...

EXPOSE 4000
WORKDIR /repo/apps/api
CMD ["node", "dist/index.js"]
