import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-auth";
import { adminStore } from "@/lib/admin-store";

const COOKIE_NAME = "synapse-admin-token";

async function checkAuth(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (userId) {
    const trustData = await adminStore.getTrustScore(userId);
    if (!trustData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(trustData);
  }

  const allTrust = await adminStore.getAllTrustScores();
  const poolStats = {
    trusted: allTrust.filter((t) => t.pool === "trusted").length,
    regular: allTrust.filter((t) => t.pool === "regular").length,
    probation: allTrust.filter((t) => t.pool === "probation").length,
    total: allTrust.length,
    avgScore: allTrust.length > 0
      ? Math.round(allTrust.reduce((s, t) => s + t.score, 0) / allTrust.length)
      : 0,
  };

  return NextResponse.json({ users: allTrust, poolStats });
}

export async function PATCH(request: NextRequest) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const body = await request.json();
  const { userId, action, amount } = body as {
    userId: string;
    action: "reset" | "boost" | "penalize";
    amount?: number;
  };

  if (!userId || !action) {
    return NextResponse.json(
      { error: "userId and action are required" },
      { status: 400 },
    );
  }

  const result = await adminStore.modifyTrustScore(userId, action, amount);
  if (!result) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
