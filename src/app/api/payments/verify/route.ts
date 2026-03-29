import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimitByIP } from "@/lib/rate-limit";
import { activateSubscription, activateBoost, activateVerifiedBadge } from "@/lib/payment-activator";
import { USDT_WALLET_ADDRESS, USDT_CONTRACT, TRONGRID_API } from "@/lib/crypto-payment";
import { getPlanPrice } from "@/lib/subscription";
import { BOOST_PRICING, VERIFIED_BADGE_PRICE } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { redis, REDIS_KEYS } from "@/lib/redis";
import type { SubscriptionPlan, BoostType } from "@/types";
import type { BillingPeriod } from "@/lib/subscription";

const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || "";
const VALID_PLANS: SubscriptionPlan[] = ["plus", "pro"];
const VALID_BOOSTS: BoostType[] = ["queue", "region", "spotlight"];

/** Minimum USDT amount tolerance (account for rounding) */
const AMOUNT_TOLERANCE = 0.02;

/** Record a failed payment for admin visibility */
async function recordFailedPayment(opts: {
  userId: string;
  amount: number;
  type: string;
  plan?: string;
  billing?: string;
  failReason: string;
  ipAddress?: string;
  externalId?: string;
}) {
  try {
    await prisma.payment.create({
      data: {
        userId: opts.userId,
        amount: opts.amount,
        type: opts.type,
        method: "USDT_TRC20",
        plan: opts.plan,
        billing: opts.billing,
        status: "FAILED",
        failReason: opts.failReason,
        ipAddress: opts.ipAddress,
        externalId: opts.externalId,
      },
    });
  } catch {
    // Don't block the response if logging fails
    console.error("[VerifyTX] Failed to record failed payment:", opts.failReason);
  }
}

/**
 * POST /api/payments/verify
 * Verify a USDT TRC-20 transaction via TronGrid and activate the purchase.
 *
 * Body: { txHash, purpose, plan?, billing?, boostType? }
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimitByIP(ip, "verify-tx", 5, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait." },
      { status: 429, headers: { "Retry-After": String(limit.resetIn) } },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id || "anon";
  const body = await req.json();
  const txHash = typeof body.txHash === "string" ? body.txHash.trim() : "";

  // Validate TX hash format (64 hex chars)
  if (!txHash || !/^[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: "Invalid transaction hash format" }, { status: 400 });
  }

  // Replay protection — check if this TX was already used
  const txKey = `tx_used:${txHash}`;
  const alreadyUsed = await redis.get(txKey);
  if (alreadyUsed) {
    return NextResponse.json({ error: "This transaction has already been used" }, { status: 409 });
  }

  // Determine expected amount
  const purpose = body.purpose || "subscription";
  const plan = body.plan as SubscriptionPlan | undefined;
  const billing: BillingPeriod = body.billing === "yearly" ? "yearly" : "monthly";
  const boostType = body.boostType as BoostType | undefined;

  let expectedAmount: number;
  let paymentType: string;
  if (purpose === "subscription") {
    if (!plan || !VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    expectedAmount = getPlanPrice(plan, billing);
    paymentType = "SUBSCRIPTION";
  } else if (purpose === "boost") {
    if (!boostType || !VALID_BOOSTS.includes(boostType)) {
      return NextResponse.json({ error: "Invalid boost type" }, { status: 400 });
    }
    expectedAmount = BOOST_PRICING[boostType].price;
    paymentType = "BOOST";
  } else if (purpose === "verified_badge") {
    expectedAmount = VERIFIED_BADGE_PRICE;
    paymentType = "VERIFIED_BADGE";
  } else {
    return NextResponse.json({ error: "Invalid purpose" }, { status: 400 });
  }

  const failCtx = {
    userId,
    amount: expectedAmount,
    type: paymentType,
    plan: plan || undefined,
    billing: purpose === "subscription" ? billing : undefined,
    ipAddress: ip,
    externalId: txHash || undefined,
  };

  // Fetch transaction info from TronGrid
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (TRONGRID_API_KEY) {
      headers["TRON-PRO-API-KEY"] = TRONGRID_API_KEY;
    }

    const txRes = await fetch(
      `${TRONGRID_API}/v1/transactions/${txHash}/events`,
      { headers, cache: "no-store" },
    );

    if (!txRes.ok) {
      await recordFailedPayment({ ...failCtx, failReason: `TronGrid API error: HTTP ${txRes.status}` });
      return NextResponse.json(
        { error: "Could not fetch transaction. Please check the hash and try again." },
        { status: 404 },
      );
    }

    const txData = await txRes.json();
    const events = txData.data || [];

    // Find TRC-20 Transfer event to our wallet
    const transferEvent = events.find((ev: {
      contract_address: string;
      event_name: string;
      result: { to?: string; value?: string };
    }) => {
      if (ev.contract_address?.toLowerCase() !== USDT_CONTRACT.toLowerCase()) return false;
      if (ev.event_name !== "Transfer") return false;

      // Convert hex address to base58 — TronGrid returns hex in result.to
      const toHex = ev.result?.to;
      if (!toHex) return false;

      return true;
    });

    if (!transferEvent) {
      await recordFailedPayment({ ...failCtx, failReason: "No USDT TRC-20 transfer found in transaction" });
      return NextResponse.json(
        { error: "No USDT TRC-20 transfer found in this transaction" },
        { status: 400 },
      );
    }

    // Verify amount (USDT has 6 decimals)
    const valueRaw = transferEvent.result?.value || "0";
    const receivedAmount = parseInt(valueRaw, 10) / 1_000_000;

    if (receivedAmount < expectedAmount - AMOUNT_TOLERANCE) {
      await recordFailedPayment({
        ...failCtx,
        amount: receivedAmount,
        failReason: `Insufficient amount: expected $${expectedAmount}, received $${receivedAmount.toFixed(2)}`,
      });
      return NextResponse.json(
        { error: `Insufficient amount. Expected $${expectedAmount}, received $${receivedAmount.toFixed(2)}` },
        { status: 400 },
      );
    }

    // Also verify via transaction info endpoint to check recipient
    const txInfoRes = await fetch(
      `${TRONGRID_API}/wallet/gettransactioninfobyid`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ value: txHash }),
        cache: "no-store",
      },
    );

    if (txInfoRes.ok) {
      const txInfo = await txInfoRes.json();
      // Check confirmation (blockNumber exists = confirmed)
      if (!txInfo.blockNumber) {
        // Not a permanent failure — don't record, user will retry
        return NextResponse.json(
          { error: "Transaction not yet confirmed. Please wait a moment and try again." },
          { status: 400 },
        );
      }
    }

    // Mark TX as used (7 days TTL for replay protection)
    await redis.set(txKey, "1", "EX", 7 * 24 * 60 * 60);

    // Activate purchase
    const paymentOpts = { method: "USDT_TRC20", ipAddress: ip, externalId: txHash };

    try {
      if (purpose === "subscription" && plan) {
        await activateSubscription(userId, plan, `tx_${txHash.slice(0, 16)}`, billing, paymentOpts);
      } else if (purpose === "boost" && boostType) {
        await activateBoost(userId, boostType, `tx_${txHash.slice(0, 16)}`, paymentOpts);
      } else if (purpose === "verified_badge") {
        await activateVerifiedBadge(userId, `tx_${txHash.slice(0, 16)}`, paymentOpts);
      }
    } catch (activateErr) {
      await recordFailedPayment({
        ...failCtx,
        failReason: `Activation failed: ${activateErr instanceof Error ? activateErr.message : "Unknown error"}`,
      });
      console.error("[VerifyTX] Activation error:", activateErr);
      return NextResponse.json(
        { error: "Payment verified but activation failed. Please contact support." },
        { status: 500 },
      );
    }

    console.log(`[VerifyTX] Payment verified: ${purpose} for ${userId}, TX: ${txHash}`);

    return NextResponse.json({ success: true, txHash, amount: receivedAmount });
  } catch (e) {
    await recordFailedPayment({
      ...failCtx,
      failReason: `Server error: ${e instanceof Error ? e.message : "Unknown error"}`,
    });
    console.error("[VerifyTX] Error:", e);
    return NextResponse.json(
      { error: "Failed to verify transaction. Please try again." },
      { status: 500 },
    );
  }
}
