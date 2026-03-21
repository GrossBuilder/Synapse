# Synapse — Production Deployment Guide

> Безопасная видеочат-платформа с репутационной системой.  
> Версия: 1.0 | Стек: Next.js 16 + React 19 + Prisma + PostgreSQL + Redis + Socket.IO + coturn

---

## Архитектура

```
                    ┌────────────┐
  HTTPS (443) ──────┤   Nginx    ├──── / ──────► Next.js App (:3000)
                    │  + certbot │──── /socket ─► Socket.IO  (:3001)
                    └────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    PostgreSQL 16    Redis 7         coturn (TURN)
     (:5432)         (:6379)         UDP :3478
```

**5 Docker-контейнеров:**
- `app` — Next.js (SSR, API, админ-панель)
- `socket` — Socket.IO (WebRTC-сигнализация, матчинг)
- `postgres` — база данных (Prisma ORM)
- `redis` — rate-limiting, очереди, адаптер Socket.IO
- `coturn` — TURN-сервер для обхода NAT/файрволов

---

## Быстрый деплой (автоматический)

Скрипт `deploy/deploy.sh` делает ВСЁ за тебя на чистом Ubuntu 22.04+ VPS:

```bash
# 1. Загрузи проект на сервер
scp -r ./synapse-app/* user@your-server:/opt/synapse/

# 2. Подключись к серверу
ssh root@your-server

# 3. Отредактируй домен и email в скрипте
cd /opt/synapse
nano deploy/deploy.sh
# → Замени DOMAIN="synapse.example.com" на свой домен
# → Замени EMAIL="admin@synapse.app" на свой email

# 4. Запусти
chmod +x deploy/deploy.sh
./deploy.sh
```

Скрипт автоматически:
- Установит Docker, Nginx, Certbot, UFW
- Настроит файрвол (SSH + 80 + 443)
- Сгенерирует все секреты (DB, Redis, NextAuth, Admin пароль)
- Создаст `.env.production` и `.env`
- Соберёт и запустит Docker-контейнеры
- Применит Prisma-схему к PostgreSQL
- Настроит Nginx с SSL (Let's Encrypt)
- Добавит cron-задачу для проверки платежей (каждые 2 мин)

---

## Ручной деплой (пошаговый)

### Шаг 1: Подготовка VPS

Минимальные требования: Ubuntu 22.04+, 2 GB RAM, 20 GB SSD.

```bash
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker
```

### Шаг 2: Загрузка проекта

```bash
mkdir -p /opt/synapse && cd /opt/synapse
# Загрузить файлы проекта (scp, rsync, git clone)
```

### Шаг 3: Переменные окружения

Создать `.env.production`:

```env
# ========== ОБЯЗАТЕЛЬНЫЕ ==========

# PostgreSQL (внутри Docker)
DATABASE_URL="postgresql://synapse:ПАРОЛЬ_БД@postgres:5432/synapse?schema=public"

# NextAuth
NEXTAUTH_URL="https://ваш-домен.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Redis (внутри Docker)
REDIS_URL="redis://:ПАРОЛЬ_REDIS@redis:6379"

# Админ-панель
ADMIN_EMAIL="admin@synapse.app"
ADMIN_PASSWORD="надёжный-пароль"

# ========== ПЛАТЕЖИ (USDT TRC-20) ==========

USDT_WALLET_ADDRESS="TВашTRONАдрес"
CRON_SECRET="$(openssl rand -hex 16)"
TRONGRID_API_URL="https://api.trongrid.io"
TRONGRID_API_KEY=""          # Получить на trongrid.io (бесплатно)

# ========== URL ==========

NEXT_PUBLIC_APP_URL="https://ваш-домен.com"
NEXT_PUBLIC_SOCKET_URL="https://ваш-домен.com"
SOCKET_PORT=3001

# ========== WebRTC ==========

STUN_SERVER_URL="stun:stun.l.google.com:19302"
NEXT_PUBLIC_TURN_URL="turn:ваш-домен.com:3478"
NEXT_PUBLIC_TURN_USERNAME="synapse"
NEXT_PUBLIC_TURN_CREDENTIAL="пароль-из-turnserver.conf"

# ========== ОПЦИОНАЛЬНО ==========

# OAuth (Google)
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""

# OAuth (GitHub)
# GITHUB_CLIENT_ID=""
# GITHUB_CLIENT_SECRET=""

# Push-уведомления (сгенерировать: npx web-push generate-vapid-keys)
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
# VAPID_PRIVATE_KEY=""
```

Создать `.env` (для docker-compose):

```env
DB_PASSWORD=тот-же-пароль-что-в-DATABASE_URL
REDIS_PASSWORD=тот-же-пароль-что-в-REDIS_URL
```

### Шаг 4: Настройка TURN-сервера

Отредактировать `deploy/turnserver.conf`:

```bash
nano deploy/turnserver.conf
# → Заменить YOUR_SERVER_IP на IP вашего VPS
# → Заменить CHANGE_THIS_TURN_PASSWORD на пароль
```

Открыть UDP-порт в файрволе:

```bash
ufw allow 3478/udp
```

### Шаг 5: Сборка и запуск

```bash
docker compose build --no-cache
docker compose up -d
```

### Шаг 6: Применение схемы БД

```bash
# Подождать ~5 сек пока PostgreSQL запустится, потом:
docker compose exec app npx prisma db push
```

### Шаг 7: Nginx + SSL

```bash
cp deploy/nginx.conf /etc/nginx/sites-available/synapse
sed -i "s/synapse.example.com/ваш-домен.com/g" /etc/nginx/sites-available/synapse
ln -sf /etc/nginx/sites-available/synapse /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
certbot --nginx -d "ваш-домен.com" --non-interactive --agree-tos -m "ваш@email.com"
systemctl reload nginx
```

### Шаг 8: Cron для проверки платежей

```bash
(crontab -l 2>/dev/null; echo "*/2 * * * * curl -s -X POST -H 'Authorization: Bearer ВАШ_CRON_SECRET' https://ваш-домен.com/api/payments/check > /dev/null") | crontab -
```

---

## Полезные команды

```bash
docker compose logs -f              # Все логи
docker compose logs -f app          # Логи Next.js
docker compose logs -f socket       # Логи Socket.IO
docker compose restart              # Перезапуск всех
docker compose down                 # Остановка
docker compose up -d --build app    # Пересборка только app

# Prisma
docker compose exec app npx prisma studio    # GUI для БД
docker compose exec app npx prisma db push   # Применить изменения схемы
```

---

## Обновление проекта

```bash
cd /opt/synapse
# Загрузить обновлённые файлы
docker compose build --no-cache app socket
docker compose up -d
docker compose exec app npx prisma db push   # если изменилась схема
```

---

## Что реализовано ✅

### Безопасность
- Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- Rate limiting на всех критичных API endpoints
- JWT-аутентификация на Socket.IO соединениях
- bcrypt хеширование паролей администратора
- Brute-force защита входа в админ-панель
- XSS-защита в PeerInfo (валидация URL изображений)
- Input validation на всех API routes
- CRON_SECRET для защиты cron-эндпоинтов

### Данные
- Полный Prisma ORM → PostgreSQL (никаких in-memory хранилищ)
- Admin-store полностью на Prisma (пользователи, жалобы, настройки, логи)
- Все API routes (profile, analytics, ratings, subscription, boosts) → Prisma
- Атомарные транзакции для активации платежей (`prisma.$transaction`)
- Бусты активируются только после подтверждённой оплаты

### Масштабирование
- Redis Adapter для Socket.IO (несколько инстансов)
- coturn TURN-сервер (WebRTC через NAT/файрволы)
- Docker Compose с 5 контейнерами + health checks
- STUN + TURN для надёжного видео-соединения

### Функциональность
- 5 языков (en, ru, es, zh, ar) через next-intl
- 9 регионов для матчинга
- Trust Score & Shadow Pools (репутационная система)
- USDT TRC-20 платежи с проверкой через TronGrid API
- Подписка Synapse+ и бусты видимости
- Админ-панель: дашборд, пользователи, жалобы, аналитика, настройки
- Автоматизация: авто-бан, авто-варн, лимит жалоб, эскалация рецидивистов
- Авто-перевод ответов на жалобы на язык пользователя
- Push-уведомления (VAPID/Service Worker)

---

## Контакты и доступы

| Ресурс | URL |
|--------|-----|
| Сайт | `https://ваш-домен.com` |
| Админ-панель | `https://ваш-домен.com/admin/login` |
| Prisma Studio | `docker compose exec app npx prisma studio` |

---

*Последнее обновление: Июль 2025*
