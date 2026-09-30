FROM node:22-alpine
WORKDIR /app

# Workspaces install from the repo root, so every workspace package file must be present.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN npm ci --workspace api --omit=dev

COPY packages/domain packages/domain
COPY apps/api apps/api

ENV NODE_ENV=production
EXPOSE 4000
# Migrations and the demo cast run first. A failed migration stops the container.
CMD ["sh", "-c", "node apps/api/src/db/migrate.js && exec node apps/api/src/server.js"]
