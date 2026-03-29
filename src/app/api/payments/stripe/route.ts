import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimitByIP } from "@/lib/rate-limit";
import { getPlanPrice } from "@/lib/subscription";
import type { BillingPeriod } from "@/lib/subscription";
import type { SubscriptionPlan } from "@/types";

const VALID_PLANS: SubscriptionPlan[] = ["plus", "pro"];

/**
 * LemonSqueezy product variant IDs.
 * Заполняется из .env:
 *   LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID
 *   LEMONSQUEEZY_PLUS_YEARLY_VARIANT_ID
 *   LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID
 *   LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID
 */
const VARIANT_IDS: Record<string, string | undefined> = {
  "plus-monthly": process.env.LEMONSQUEEZY_PLUS_MONTHLY_VARIANT_ID,
  "plus-yearly": process.env.LEMONSQUEEZY_PLUS_YEARLY_VARIANT_ID,
  "pro-monthly": process.env.LEMONSQUEEZY_PRO_MONTHLY_VARIANT_ID,
  "pro-yearly": process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID,
};

const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || "";
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || "";

/**
 * POST /api/payments/stripe
 * Create a LemonSqueezy checkout session (Stripe-powered).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimitByIP(ip, "stripe-checkout", 10, 60);
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

  if (!LEMONSQUEEZY_API_KEY || !LEMONSQUEEZY_STORE_ID) {
    return NextResponse.json(
      { error: "Stripe/LemonSqueezy not configured. Please use USDT payment." },
      { status: 503 },
    );
  }

  const body = await req.json();
  const plan = body.plan as SubscriptionPlan;
  const billing: BillingPeriod = body.billing === "yearly" ? "yearly" : "monthly";

  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const variantKey = `${plan}-${billing}`;
  const variantId = VARIANT_IDS[variantKey];
  if (!variantId) {
    return NextResponse.json(
      { error: `Product variant not configured for ${plan} ${billing}` },
      { status: 503 },
    );
  }

  const userId = (session.user as { id?: string }).id || "anon";
  const userEmail = session.user.email || "";
  const price = getPlanPrice(plan, billing);

  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: userEmail,
              custom: {
                user_id: userId,
                plan,
                billing,
              },
            },
            product_options: {
              redirect_url: `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/lobby?payment=success`,
            },
          },
          relationships: {
            store: { data: { type: "stores", id: LEMONSQUEEZY_STORE_ID } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[LemonSqueezy] Checkout creation failed:", err);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const checkoutUrl = data.data?.attributes?.url;

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "No checkout URL returned" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: checkoutUrl,
      plan,
      billing,
      price,
    });
  } catch (e) {
    console.error("[LemonSqueezy] Error:", e);
    return NextResponse.json(
      { error: "Payment service unavailable" },
      { status: 502 },
    );
  }
}
