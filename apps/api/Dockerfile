FROM node:22-alpine
WORKDIR /app

# Workspaces install from the repo root, so both package files must be present.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace api

COPY apps/api apps/api
EXPOSE 4000
CMD ["node", "apps/api/src/server.js"]
