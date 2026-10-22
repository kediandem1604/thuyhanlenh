# Thủy Hàn Lệnh — một image chạy cả API lẫn web (Fastify phục vụ luôn bản build trong dist/)
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=8787 \
    SERVE_WEB=true \
    DEV_LOGIN=false \
    TZ=Asia/Ho_Chi_Minh
# tsx chạy TypeScript của server trực tiếp nên giữ node_modules đầy đủ
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/domain ./src/domain
COPY src/data ./src/data
COPY src/lib ./src/lib
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD wget -qO- http://127.0.0.1:${PORT:-8787}/api/health || exit 1
CMD ["npm", "start"]
