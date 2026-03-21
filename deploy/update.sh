#!/bin/bash
# Быстрое обновление без пересоздания БД
# Использование: chmod +x update.sh && sudo ./update.sh

set -e
cd /opt/synapse

echo ">>> Пересборка контейнеров..."
docker compose build --no-cache

echo ">>> Перезапуск..."
docker compose up -d

echo ">>> Применение миграций Prisma..."
docker compose exec app npx prisma db push

echo ">>> Готово!"
docker compose ps
