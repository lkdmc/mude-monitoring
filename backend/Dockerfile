FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY targets.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN mkdir -p /app/data

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY targets.json ./

EXPOSE 3001

CMD ["node", "dist/index.js"]
