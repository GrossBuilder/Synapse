# ==================== BUILD ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Зависимости (кэшируются отдельно)
COPY package.json package-lock.json* ./
RUN npm ci

# Prisma — генерация клиента
COPY prisma ./prisma
RUN npx prisma generate

# Исходники и сборка
COPY . .
RUN npm run build

# ==================== PRODUCTION ====================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Системные пакеты
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Копируем необходимое из builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server ./server
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src/i18n ./src/i18n

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
