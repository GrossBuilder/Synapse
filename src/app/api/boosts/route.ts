import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BOOST_PRICING } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import type { BoostType } from "@/types";

/**
 * POST /api/boosts
 * Активировать буст. Требует подтверждённую оплату (paymentId).
 * Body: { type: "queue" | "region" | "spotlight", paymentId: string }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, paymentId } = body;

  if (!type || !["queue", "region", "spotlight"].includes(type)) {
    return NextResponse.json({ error: "Invalid boost type" }, { status: 400 });
  }

  if (!paymentId) {
    return NextResponse.json({ error: "Payment required. Use /api/payments to create a payment first." }, { status: 402 });
  }

  const userId = (session.user as { id: string }).id;

  // Verify payment exists and is completed
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== userId || payment.status !== "COMPLETED" || payment.type !== "BOOST") {
    return NextResponse.json({ error: "Invalid or unconfirmed payment" }, { status: 402 });
  }

  const boostType = type as BoostType;
  const boostInfo = BOOST_PRICING[boostType];
  const boostTypeDB = type.toUpperCase() as "QUEUE" | "REGION" | "SPOTLIGHT";
  const expiresAt = new Date(Date.now() + boostInfo.durationMs);

  const boost = await prisma.boost.create({
    data: { userId, type: boostTypeDB, expiresAt },
  });

  return NextResponse.json({
    success: true,
    boost: {
      id: boost.id,
      type: boostType,
      label: boostInfo.label,
      price: boostInfo.price,
      expiresAt: expiresAt.getTime(),
      expiresIn: boostInfo.durationMs,
    },
  });
}

/**
 * GET /api/boosts — доступные бусты и активные бусты пользователя.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  const boosts = Object.entries(BOOST_PRICING).map(([type, info]) => ({
    type,
    label: info.label,
    price: info.price,
    duration: info.durationMs,
  }));

  if (session?.user) {
    const userId = (session.user as { id: string }).id;
    const active = await prisma.boost.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
    });
    return NextResponse.json({
      boosts,
      active: active.map(b => ({
        id: b.id,
        type: b.type.toLowerCase(),
        expiresAt: b.expiresAt.getTime(),
      })),
    });
  }

  return NextResponse.json({ boosts });
}
