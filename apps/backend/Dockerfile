# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build

WORKDIR /workspace

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/tsconfig.json apps/backend/
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/contracts/package.json packages/contracts/tsconfig.json packages/contracts/
COPY packages/batch-processing/package.json packages/batch-processing/tsconfig.json packages/batch-processing/
COPY packages/object-storage/package.json packages/object-storage/tsconfig.json packages/object-storage/

RUN node --version && npm --version

RUN --mount=type=cache,target=/root/.npm \
    npm ci \
    --workspace=@sport-analytics/backend \
    --no-audit \
    --no-fund

COPY packages/contracts/src packages/contracts/src
COPY packages/batch-processing/src packages/batch-processing/src
COPY packages/object-storage/src packages/object-storage/src
COPY apps/backend/src apps/backend/src
COPY apps/backend/scripts apps/backend/scripts
COPY apps/backend/certs apps/backend/certs
COPY docs/api/openapi.yaml docs/api/openapi.yaml
COPY scripts/check-contracts-public-api.mjs scripts/check-contracts-public-api.mjs

RUN npm run build --workspace=@sport-analytics/backend

RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /workspace

COPY --from=build --chown=node:node /workspace/package.json ./package.json
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=node:node /workspace/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=node:node /workspace/apps/backend/certs ./apps/backend/certs
COPY --from=build --chown=node:node /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=node:node /workspace/packages/batch-processing/package.json ./packages/batch-processing/package.json
COPY --from=build --chown=node:node /workspace/packages/batch-processing/dist ./packages/batch-processing/dist
COPY --from=build --chown=node:node /workspace/packages/object-storage/package.json ./packages/object-storage/package.json
COPY --from=build --chown=node:node /workspace/packages/object-storage/dist ./packages/object-storage/dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/backend/dist/index.js"]
