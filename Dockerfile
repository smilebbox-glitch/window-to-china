FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Windows checkouts may carry CRLF into the Docker build context even when
# .gitattributes requires LF. Normalize shell entrypoints inside the image so
# Bash always receives valid Unix line endings.
RUN find scripts -type f -name '*.sh' -exec sed -i 's/\r$//' {} + \
    && find . -maxdepth 1 -type f -name '*.sh' -exec sed -i 's/\r$//' {} + \
    && npm run pilot:preflight \
    && npm run build \
    && node --test tests/*.test.mjs

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/.wrangler /data && chown -R node:node /app/.wrangler /data

USER node
EXPOSE 3000

CMD ["npm", "start"]
