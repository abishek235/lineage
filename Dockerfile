# One container for ReCasaOS / CasaOS. Build context is the repo root.
# Accounts and mail settings live in PGLITE_DATA_DIR (mount a volume there).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NITRO_PRESET=node_server
RUN npm run build \
  && cp node_modules/@electric-sql/pglite/dist/pglite.data \
        node_modules/@electric-sql/pglite/dist/pglite.wasm \
        node_modules/@electric-sql/pglite/dist/initdb.wasm \
        .output/server/_libs/

FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    PGLITE_DATA_DIR=/app/data
COPY --from=build /app/.output ./.output
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
