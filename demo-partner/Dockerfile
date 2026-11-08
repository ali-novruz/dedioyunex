FROM node:24-alpine
WORKDIR /app
COPY index.html serve.mjs ./
ENV PORT=4000
USER node
EXPOSE 4000
CMD ["node", "serve.mjs"]
