FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG EXPO_PUBLIC_API_BASE_URL=https://svadba.kz/api
ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL
RUN npm run build:web

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data
ENV PUBLIC_BASE_URL=https://svadba.kz

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY package.json ./

EXPOSE 4000
CMD ["node", "server/index.js"]
