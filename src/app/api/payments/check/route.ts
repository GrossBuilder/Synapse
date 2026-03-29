import { NextRequest, NextResponse } from "next/server";
import { checkPendingPayments, cleanupExpired, getPendingCount } from "@/lib/crypto-payment";
import type { CryptoPayment } from "@/lib/crypto-payment";
import { activateSubscription, activateBoost, activateVerifiedBadge } from "@/lib/payment-activator";

/**
 * POST /api/payments/check
 * Cron-endpoint: проверить все pending-платежи через TronGrid.
 * Защищён секретным ключом (CRON_SECRET).
 *
 * Вызов: POST /api/payments/check с заголовком Authorization: Bearer <CRON_SECRET>
 * Либо из Vercel Cron / внешнего cron-сервиса.
 */
export async function POST(req: NextRequest) {
  // Авторизация cron-запроса — ОБЯЗАТЕЛЬНО
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[CronCheck] CRON_SECRET is not set — endpoint disabled");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { confirmed, expired } = await checkPendingPayments();
    const cleaned = await cleanupExpired();
    const pending = await getPendingCount();

    // Активируем подписки/бусты для подтверждённых платежей
    for (const payment of confirmed) {
      try {
        await activatePayment(payment);
      } catch (e) {
        console.error(`[CronCheck] Failed to activate payment ${payment.id}:`, e);
      }
    }

    return NextResponse.json({
      confirmed: confirmed.length,
      expired: expired.length,
      cleaned,
      pending,
      confirmedIds: confirmed.map((p) => p.id),
    });
  } catch (e) {
    console.error("[CronCheck] Error:", e);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}

/**
 * GET /api/payments/check?id=pay_xxx
 * Пользовательский endpoint: проверить свой платёж (используется для поллинга).
 * Перенаправляет на GET /api/payments?id=xxx
 */
export async function GET(req: NextRequest) {
  // Защита GET endpoint — только для мониторинга с CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await getPendingCount();
  if (pending > 0) {
    await checkPendingPayments();
  }

  return NextResponse.json({ pending, checked: true });
}

// ==================== АКТИВАЦИЯ ====================

// ==================== АКТИВАЦИЯ ====================

/**
 * Активировать результат оплаченного платежа.
 * Обновляет подписку или активирует буст в admin-store / socket.
 */
async function activatePayment(payment: CryptoPayment): Promise<void> {
  const { purpose, userId } = payment;

  switch (purpose.type) {
    case "subscription": {
      await activateSubscription(userId, purpose.plan, payment.id, purpose.billing || "monthly");
      console.log(`[Activate] Подписка ${purpose.plan} (${purpose.billing || "monthly"}) активирована для ${userId}`);
      break;
    }
    case "boost": {
      await activateBoost(userId, purpose.boostType, payment.id);
      console.log(`[Activate] Буст ${purpose.boostType} активирован для ${userId}`);
      break;
    }
    case "verified_badge": {
      await activateVerifiedBadge(userId, payment.id);
      console.log(`[Activate] Verified Badge активирован для ${userId}`);
      break;
    }
  }
}
