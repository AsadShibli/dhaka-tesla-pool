FROM node:22-alpine
WORKDIR /app

# Same workspace install as the API image. Only the web package is built.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/domain/package.json packages/domain/package.json
RUN npm ci --workspace web

# The site imports the fare and match rules from packages/domain.
COPY packages/domain packages/domain
COPY apps/web apps/web

RUN npm run build --workspace web

ENV NODE_ENV=production
# Read at request time by the /api routes. `api` is the Compose service name.
ENV API_URL=http://api:4000
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "web"]
