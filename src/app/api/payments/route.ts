import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimitByIP } from "@/lib/rate-limit";
import {
  createPayment,
  checkPaymentStatus,
  getUserPayments,
  getPurposeLabel,
  getBasePrice,
  USDT_WALLET_ADDRESS,
  type PaymentPurpose,
} from "@/lib/crypto-payment";
import type { SubscriptionPlan, BoostType } from "@/types";

const VALID_PLANS: SubscriptionPlan[] = ["plus", "pro"];
const VALID_BOOSTS: BoostType[] = ["queue", "region", "spotlight"];

/**
 * POST /api/payments
 * Создать платёж. Body: { purpose: "subscription", plan: "plus"|"pro" }
 *                     или { purpose: "boost", boostType: "queue"|"region"|"spotlight" }
 *                     или { purpose: "verified_badge" }
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimitByIP(ip, "payments", 10, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.resetIn) } },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!USDT_WALLET_ADDRESS) {
    return NextResponse.json(
      { error: "Payment system not configured" },
      { status: 503 },
    );
  }

  const body = await req.json();
  let purpose: PaymentPurpose;

  // Валидация purpose
  switch (body.purpose) {
    case "subscription": {
      const plan = body.plan as SubscriptionPlan;
      if (!plan || !VALID_PLANS.includes(plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }
      purpose = { type: "subscription", plan };
      break;
    }
    case "boost": {
      const boostType = body.boostType as BoostType;
      if (!boostType || !VALID_BOOSTS.includes(boostType)) {
        return NextResponse.json({ error: "Invalid boost type" }, { status: 400 });
      }
      purpose = { type: "boost", boostType };
      break;
    }
    case "verified_badge":
      purpose = { type: "verified_badge" };
      break;
    default:
      return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }

  const userId = (session.user as { id?: string }).id || session.user.name || "anon";

  try {
    const payment = await createPayment(userId, purpose);

    return NextResponse.json({
      paymentId: payment.id,
      walletAddress: payment.walletAddress,
      amount: payment.displayAmount,
      currency: "USDT",
      network: "TRC-20 (TRON)",
      label: getPurposeLabel(purpose),
      basePrice: getBasePrice(purpose),
      expiresAt: payment.expiresAt,
      expiresIn: payment.expiresAt - Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Payment creation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/**
 * GET /api/payments?id=pay_xxx — проверить статус платежа
 * GET /api/payments — список активных платежей пользователя
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id || session.user.name || "anon";
  const paymentId = req.nextUrl.searchParams.get("id");

  if (paymentId) {
    const payment = await checkPaymentStatus(paymentId);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    // Проверяем, что платёж принадлежит текущему пользователю
    if (payment.userId !== userId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      amount: payment.displayAmount,
      walletAddress: payment.walletAddress,
      txId: payment.txId,
      receivedAmount: payment.receivedAmount,
      expiresAt: payment.expiresAt,
      completedAt: payment.completedAt,
      purpose: payment.purpose,
      label: getPurposeLabel(payment.purpose),
    });
  }

  // Список всех активных платежей пользователя
  const payments = await getUserPayments(userId);
  return NextResponse.json({
    payments: payments.map((p) => ({
      paymentId: p.id,
      status: p.status,
      amount: p.displayAmount,
      purpose: p.purpose,
      label: getPurposeLabel(p.purpose),
      expiresAt: p.expiresAt,
    })),
  });
}
