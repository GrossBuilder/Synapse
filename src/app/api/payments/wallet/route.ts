import { NextResponse } from "next/server";
import { USDT_WALLET_ADDRESS } from "@/lib/crypto-payment";

/**
 * GET /api/payments/wallet — return the USDT receiving wallet address.
 * Used by the checkout page to avoid hardcoding the wallet in client code.
 */
export async function GET() {
  if (!USDT_WALLET_ADDRESS) {
    return NextResponse.json(
      { error: "Payment system not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ walletAddress: USDT_WALLET_ADDRESS });
}
