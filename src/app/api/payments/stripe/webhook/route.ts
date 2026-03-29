import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { activateSubscription } from "@/lib/payment-activator";
import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/types";
import type { BillingPeriod } from "@/lib/subscription";

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

/**
 * POST /api/payments/stripe/webhook
 * Handle LemonSqueezy webhook events.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature") || "";
  const rawBody = await req.text();

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const eventName = event.meta?.event_name;

  if (eventName === "order_created") {
    const customData = event.meta?.custom_data;
    const userId = customData?.user_id;
    const plan = customData?.plan as SubscriptionPlan | undefined;
    const billing = (customData?.billing || "monthly") as BillingPeriod;
    const orderId = String(event.data?.id || "unknown");

    if (userId && plan && (plan === "plus" || plan === "pro")) {
      try {
        await activateSubscription(userId, plan, `ls_${orderId}`, billing, {
          method: "LEMONSQUEEZY", externalId: `ls_${orderId}`,
        });
        console.log(`[LemonSqueezy] Subscription activated: ${plan} ${billing} for ${userId}`);
      } catch (err) {
        await prisma.payment.create({
          data: {
            userId,
            amount: 0,
            type: "SUBSCRIPTION",
            method: "LEMONSQUEEZY",
            plan,
            billing,
            status: "FAILED",
            failReason: `Activation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            externalId: `ls_${orderId}`,
          },
        }).catch(() => {});
        console.error(`[LemonSqueezy] Activation failed for ${userId}:`, err);
      }
    }
  }

  if (eventName === "subscription_payment_success") {
    const customData = event.data?.attributes?.first_order_item?.custom_data || event.meta?.custom_data;
    const userId = customData?.user_id;
    const plan = customData?.plan as SubscriptionPlan | undefined;
    const billing = (customData?.billing || "monthly") as BillingPeriod;
    const subId = String(event.data?.id || "unknown");

    if (userId && plan && (plan === "plus" || plan === "pro")) {
      try {
        await activateSubscription(userId, plan, `ls_sub_${subId}`, billing, {
          method: "LEMONSQUEEZY", externalId: `ls_sub_${subId}`,
        });
        console.log(`[LemonSqueezy] Renewal processed: ${plan} ${billing} for ${userId}`);
      } catch (err) {
        await prisma.payment.create({
          data: {
            userId,
            amount: 0,
            type: "SUBSCRIPTION",
            method: "LEMONSQUEEZY",
            plan,
            billing,
            status: "FAILED",
            failReason: `Renewal activation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            externalId: `ls_sub_${subId}`,
          },
        }).catch(() => {});
        console.error(`[LemonSqueezy] Renewal failed for ${userId}:`, err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
