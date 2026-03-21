/**
 * Payment Activator — активация подписок и бустов после подтверждения крипто-платежа.
 * Использует Prisma для персистентного хранения, adminStore для логирования.
 */

import { prisma } from "./prisma";
import { adminStore } from "./admin-store";
import { BOOST_PRICING, PRICING } from "./subscription";
import type { SubscriptionPlan, BoostType } from "@/types";

const PLAN_TO_DB = { free: "FREE", plus: "PLUS", pro: "PRO" } as const;

export async function activateSubscription(
  userId: string,
  plan: SubscriptionPlan,
  paymentId: string,
): Promise<void> {
  const dbPlan = PLAN_TO_DB[plan] as "FREE" | "PLUS" | "PRO";
  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: dbPlan, expiresAt: new Date(Date.now() + 30 * 86400000) },
      update: { plan: dbPlan, expiresAt: new Date(Date.now() + 30 * 86400000), status: "ACTIVE" },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { totalSpent: { increment: PRICING[plan] } },
    }),
  ]);

  await adminStore.addActivity(
    "payment_confirmed",
    `Crypto payment confirmed: ${plan} subscription (${paymentId})`,
    { userId, plan, paymentId, method: "USDT_TRC20" },
  );
}

export async function activateBoost(
  userId: string,
  boostType: BoostType,
  paymentId: string,
): Promise<void> {
  const boostInfo = BOOST_PRICING[boostType];
  const boostTypeDB = boostType.toUpperCase() as "QUEUE" | "REGION" | "SPOTLIGHT";

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
  ]);

  await adminStore.addActivity(
    "payment_confirmed",
    `Crypto payment confirmed: ${boostInfo.label} boost (${paymentId})`,
    { userId, boostType, paymentId, method: "USDT_TRC20" },
  );
}

export async function activateVerifiedBadge(
  userId: string,
  paymentId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true, totalSpent: { increment: 2.99 } },
  });

  await adminStore.addActivity(
    "payment_confirmed",
    `Crypto payment confirmed: Verified Badge (${paymentId})`,
    { userId, paymentId, method: "USDT_TRC20" },
  );
}
