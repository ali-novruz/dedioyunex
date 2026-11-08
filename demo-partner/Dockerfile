FROM node:24-alpine
WORKDIR /app
COPY *.html demo.js serve.mjs ./
ENV PORT=4000
USER node
EXPOSE 4000
CMD ["node", "serve.mjs"]
