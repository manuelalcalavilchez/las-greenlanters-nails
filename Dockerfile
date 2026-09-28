# --- Etapa 1: Build ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# --- Etapa 2: Servir frontend + API desde el mismo origen ---
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/templates ./templates
RUN mkdir -p /app/data
COPY --from=build /app/public ./public
RUN npm ci --legacy-peer-deps --omit=dev
ENV NODE_ENV=production
ENV PORT=80

EXPOSE 80
CMD ["node", "server.js"]
