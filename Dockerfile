# ---- Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ---- Runtime ----
FROM node:20-alpine AS runtime

WORKDIR /app

# Only production deps in the final image.
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY config.json ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
