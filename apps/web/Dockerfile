FROM node:22-alpine
WORKDIR /app

# Same workspace install as the API image. Only the web package is built.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace web

COPY apps/web apps/web

# Read while Next compiles the server page. `api` is the Compose service name.
ENV API_URL=http://api:4000
RUN npm run build --workspace web

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "web"]
