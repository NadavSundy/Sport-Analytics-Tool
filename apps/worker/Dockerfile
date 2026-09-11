FROM node:22-bookworm-slim AS build

WORKDIR /workspace
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/worker/package.json apps/worker/tsconfig.json apps/worker/
COPY packages/contracts/package.json packages/contracts/tsconfig.json packages/contracts/
COPY packages/batch-processing/package.json packages/batch-processing/tsconfig.json packages/batch-processing/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=@sport-analytics/worker
COPY packages/contracts/src packages/contracts/src
COPY packages/batch-processing/src packages/batch-processing/src
COPY apps/worker/src apps/worker/src
COPY apps/worker/certs apps/worker/certs
RUN npm run build --workspace=@sport-analytics/worker
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /workspace
COPY --from=build --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/worker/package.json ./apps/worker/package.json
COPY --from=build --chown=node:node /workspace/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=node:node /workspace/apps/worker/certs ./apps/worker/certs
COPY --from=build --chown=node:node /workspace/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /workspace/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=node:node /workspace/packages/batch-processing/package.json ./packages/batch-processing/package.json
COPY --from=build --chown=node:node /workspace/packages/batch-processing/dist ./packages/batch-processing/dist

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "apps/worker/dist/index.js"]
