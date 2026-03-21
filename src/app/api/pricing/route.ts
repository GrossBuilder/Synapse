import { NextResponse } from "next/server";
import { PRICING_INFO, BOOST_PRICING, VERIFIED_BADGE_PRICE } from "@/lib/subscription";

/**
 * GET /api/pricing
 * Публичный endpoint — информация о тарифах и бустах для UI.
 */
export async function GET() {
  return NextResponse.json({
    plans: PRICING_INFO,
    boosts: Object.entries(BOOST_PRICING).map(([type, info]) => ({
      type,
      label: info.label,
      price: info.price,
      durationMs: info.durationMs,
    })),
    verifiedBadge: {
      price: VERIFIED_BADGE_PRICE,
      label: "Verified Badge",
    },
  });
}
