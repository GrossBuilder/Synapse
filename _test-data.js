// Скрипт: создаёт тестовых пользователей и жалобы для проверки
// прогрессивных наказаний и AI-модерации.
// Запуск: node _test-data.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Создание тестовых данных ===\n");

  // 1. Создаём тестовых пользователей
  const users = [
    { name: "DarkWolf", email: "darkwolf@test.com", region: "europe", status: "ACTIVE" },
    { name: "ToxicSnake", email: "toxicsnake@test.com", region: "cis", status: "ACTIVE" },
    { name: "ShadowKing", email: "shadowking@test.com", region: "north-america", status: "ACTIVE" },
  ];

  const createdUsers = [];
  for (const u of users) {
    // Удаляем если существует
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.contentModerationLog.deleteMany({ where: { userId: existing.id } });
      await prisma.report.deleteMany({ where: { OR: [{ reporterId: existing.id }, { reportedId: existing.id }] } });
      await prisma.trustScore.deleteMany({ where: { userId: existing.id } });
      await prisma.subscription.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
    const user = await prisma.user.create({
      data: { ...u, offenseCount: 0, totalChats: Math.floor(Math.random() * 50) + 5 },
    });
    // Trust Score
    await prisma.trustScore.create({
      data: { userId: user.id, score: 45, pool: "REGULAR", badge: "REGULAR" },
    });
    // Подписка (ToxicSnake — Plus)
    if (u.name === "ToxicSnake") {
      await prisma.subscription.create({
        data: { userId: user.id, plan: "PLUS", expiresAt: new Date(Date.now() + 30 * 86400000) },
      });
    }
    createdUsers.push(user);
    console.log(`✓ ${u.name} (${user.id}) — ${u.region}`);
  }

  // 2. Создаём жалобы
  const [wolf, snake, king] = createdUsers;

  const reports = [
    { reporterId: wolf.id, reportedId: snake.id, reason: "HARASSMENT", details: "Оскорблял меня в чате, грубые слова", severity: "HIGH", reporterLocale: "ru" },
    { reporterId: king.id, reportedId: snake.id, reason: "INAPPROPRIATE", details: "Showed inappropriate content on camera", severity: "CRITICAL", reporterLocale: "en" },
    { reporterId: wolf.id, reportedId: king.id, reason: "SPAM", details: "Постоянно спамит ссылками", severity: "LOW", reporterLocale: "ru" },
    { reporterId: snake.id, reportedId: wolf.id, reason: "SCAM", details: "Trying to scam people with fake links", severity: "HIGH", reporterLocale: "en" },
    { reporterId: king.id, reportedId: wolf.id, reason: "HARASSMENT", details: "Sent threatening messages multiple times", severity: "HIGH", reporterLocale: "en" },
  ];

  for (const r of reports) {
    await prisma.report.create({ data: r });
  }
  console.log(`\n✓ Создано ${reports.length} жалоб\n`);

  // 3. Сводка
  console.log("=== Готово! ===");
  console.log("Для тестирования прогрессивных наказаний:");
  console.log("  1. Откройте http://localhost:3001/admin/reports");
  console.log("  2. Нажмите '✓ Resolve' на жалобу → offense #1 (WARNED)");
  console.log("  3. Resolve ещё одну → offense #2 (BANNED + trust=0 + sub cancelled)");
  console.log("  4. Resolve третью → offense #3 (DELETED)\n");
  console.log("ToxicSnake имеет подписку Plus — при offense #2 она будет отменена\n");
  console.log("Для тестирования AI-модерации:");
  console.log("  MODERATION_PROVIDER=test уже установлен в .env");
  console.log("  Пройдите в admin API: POST /api/admin/moderation {action:'test-scan', userId:'...'}\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
