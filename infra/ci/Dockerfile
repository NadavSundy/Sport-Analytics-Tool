FROM node:22-bookworm-slim AS node22

FROM mcr.microsoft.com/playwright:v1.62.1-noble

# Playwright's Noble image supplies the Ubuntu 24.04 browser/runtime
# dependencies. Copy the repository's hosted-CI Node major explicitly so the
# local Docker path does not drift if the upstream Playwright image changes its
# default Node release.
COPY --from=node22 /usr/local/bin/node /usr/local/bin/node
COPY --from=node22 /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && apt-get update \
    && apt-get install -y --no-install-recommends git python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/ci-python \
    && /opt/ci-python/bin/python -m pip install --upgrade pip \
    && node --version \
    && npm --version \
    && python3 --version

ENV PATH="/opt/ci-python/bin:/usr/local/bin:${PATH}"
WORKDIR /workspace
