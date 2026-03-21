import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimitByIP } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimitByIP(ip, "ratings", 20, 60);
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

  const body = await req.json();
  const { peerId, sessionId, score } = body;

  if (!peerId || !sessionId || typeof score !== "number" || score < 1 || score > 5) {
    return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
  }

  const userId = (session.user as { id?: string }).id || "";

  // Check duplicate
  const existing = await prisma.rating.findUnique({
    where: { raterId_sessionId: { raterId: userId, sessionId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already rated" }, { status: 409 });
  }

  const rating = await prisma.rating.create({
    data: { raterId: userId, ratedId: peerId, sessionId, score: Math.round(score) },
  });

  return NextResponse.json({ success: true, rating: { id: rating.id, score: rating.score } });
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const result = await prisma.rating.aggregate({
    where: { ratedId: userId },
    _avg: { score: true },
    _count: true,
  });

  return NextResponse.json({
    userId,
    averageRating: Math.round((result._avg.score || 0) * 10) / 10,
    totalRatings: result._count,
  });
}
