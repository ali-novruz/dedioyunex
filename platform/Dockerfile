# Build context: repository root (needs sdk/web as well as platform).
FROM node:24-alpine AS build
WORKDIR /app
COPY platform/package.json platform/package-lock.json platform/
RUN cd platform && npm ci --ignore-scripts
COPY sdk/web sdk/web
COPY platform platform
RUN cd platform && npm run build

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 DATA_DIR=/data
WORKDIR /app
COPY --from=build /app/platform/.next/standalone/ ./
COPY --from=build /app/platform/.next/static ./platform/.next/static
COPY --from=build /app/platform/public ./platform/public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["node", "platform/server.js"]
