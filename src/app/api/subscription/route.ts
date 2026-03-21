import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PRICING_INFO, PLAN_LIMITS, BOOST_PRICING } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

const PLAN_FROM_DB: Record<string, "free" | "plus" | "pro"> = { FREE: "free", PLUS: "plus", PRO: "pro" };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const plan = sub ? PLAN_FROM_DB[sub.plan] || "free" : "free";
  const isExpired = sub?.expiresAt && sub.expiresAt < new Date();
  const activePlan = isExpired ? "free" : plan;
  const limits = PLAN_LIMITS[activePlan];

  return NextResponse.json({
    plan: activePlan,
    expiresAt: sub?.expiresAt?.getTime(),
    limits,
    pricing: PRICING_INFO,
    boostPricing: BOOST_PRICING,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { plan } = body;

  if (!plan || !["free", "plus", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Subscription change requires payment — return pricing info for payment flow
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

  return NextResponse.json({
    message: "Use /api/payments to create a payment for subscription upgrade",
    plan,
    limits,
    requiresPayment: plan !== "free",
  });
}
