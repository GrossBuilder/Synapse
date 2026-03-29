/**
 * Payment Activator — активация подписок и бустов после подтверждения платежа.
 * Создаёт запись Payment в БД для полного аудитного следа.
 */

import { prisma } from "./prisma";
import { adminStore } from "./admin-store";
import { BOOST_PRICING, getPlanPrice } from "./subscription";
import type { BillingPeriod } from "./subscription";
import type { SubscriptionPlan, BoostType } from "@/types";

const PLAN_TO_DB = { free: "FREE", plus: "PLUS", pro: "PRO" } as const;

export async function activateSubscription(
  userId: string,
  plan: SubscriptionPlan,
  paymentId: string,
  billing: BillingPeriod = "monthly",
  options?: { method?: string; ipAddress?: string; externalId?: string },
): Promise<void> {
  const dbPlan = PLAN_TO_DB[plan] as "FREE" | "PLUS" | "PRO";
  const durationMs = billing === "yearly" ? 365 * 86400000 : 30 * 86400000;
  const price = getPlanPrice(plan, billing);
  const method = options?.method || "USDT_TRC20";

  await prisma.$transaction(async (tx) => {
    // Check if user has an active subscription with remaining time
    const existing = await tx.subscription.findUnique({ where: { userId } });
    const now = Date.now();
    // If active & not expired, extend from current expiresAt; otherwise start from now
    const baseTime = existing?.expiresAt && existing.expiresAt.getTime() > now && existing.status === "ACTIVE"
      ? existing.expiresAt.getTime()
      : now;
    const newExpiresAt = new Date(baseTime + durationMs);

    await tx.subscription.upsert({
      where: { userId },
      create: { userId, plan: dbPlan, expiresAt: newExpiresAt },
      update: { plan: dbPlan, expiresAt: newExpiresAt, status: "ACTIVE" },
    });
    await tx.user.update({
      where: { id: userId },
      data: { totalSpent: { increment: price } },
    });
    await tx.payment.create({
      data: {
        userId,
        amount: price,
        type: "SUBSCRIPTION",
        method,
        plan,
        billing,
        status: "COMPLETED",
        externalId: options?.externalId || paymentId,
        ipAddress: options?.ipAddress,
      },
    });
  });

  await adminStore.addActivity(
    "payment_confirmed",
    `Payment confirmed: ${plan} subscription ${billing} ($${price}) via ${method} (${paymentId})`,
    { userId, plan, billing, paymentId, method },
  );
}

export async function activateBoost(
  userId: string,
  boostType: BoostType,
  paymentId: string,
  options?: { method?: string; ipAddress?: string; externalId?: string },
): Promise<void> {
  const boostInfo = BOOST_PRICING[boostType];
  const boostTypeDB = boostType.toUpperCase() as "QUEUE" | "REGION" | "SPOTLIGHT";
  const method = options?.method || "USDT_TRC20";

  await prisma.$transaction([
    prisma.boost.create({
      data: {
        userId,
        type: boostTypeDB,
        expiresAt: new Date(Date.now() + boostInfo.durationMs),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { totalSpent: { increment: boostInfo.price } },
    }),
    prisma.payment.create({
      data: {
        userId,
        amount: boostInfo.price,
        type: "BOOST",
        method,
        itemId: boostType,
        status: "COMPLETED",
        externalId: options?.externalId || paymentId,
        ipAddress: options?.ipAddress,
      },
    }),
  ]);

  await adminStore.addActivity(
    "payment_confirmed",
    `Payment confirmed: ${boostInfo.label} boost ($${boostInfo.price}) via ${method} (${paymentId})`,
    { userId, boostType, paymentId, method },
  );
}

export async function activateVerifiedBadge(
  userId: string,
  paymentId: string,
  options?: { method?: string; ipAddress?: string; externalId?: string },
): Promise<void> {
  const method = options?.method || "USDT_TRC20";

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { isVerified: true, totalSpent: { increment: 2.99 } },
    }),
    prisma.payment.create({
      data: {
        userId,
        amount: 2.99,
        type: "VERIFIED_BADGE",
        method,
        status: "COMPLETED",
        externalId: options?.externalId || paymentId,
        ipAddress: options?.ipAddress,
      },
    }),
  ]);

  await adminStore.addActivity(
    "payment_confirmed",
    `Payment confirmed: Verified Badge ($2.99) via ${method} (${paymentId})`,
    { userId, paymentId, method },
  );
}
