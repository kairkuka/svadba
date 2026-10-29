FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app

COPY . .
ARG EXPO_PUBLIC_API_BASE_URL=https://svadba.kz/api
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
ARG EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
ARG EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=
ARG EXPO_PUBLIC_ENABLE_REVIEW_SCREENS=1
ENV EXPO_NO_DOTENV=1 \
    EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL \
    EXPO_PUBLIC_SHOW_TEST_LOGIN=0 \
    EXPO_PUBLIC_ALLOW_OFFLINE_AUTH=0 \
    EXPO_PUBLIC_ENABLE_REVIEW_SCREENS=$EXPO_PUBLIC_ENABLE_REVIEW_SCREENS \
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID \
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID \
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=$EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
RUN npm run build:web

FROM node:22-alpine AS runner

WORKDIR /app
RUN apk add --no-cache ffmpeg
ENV NODE_ENV=production \
    PORT=4000 \
    DATA_DIR=/data \
    PUBLIC_BASE_URL=https://svadba.kz \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/health').then((res)=>process.exit(res.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
