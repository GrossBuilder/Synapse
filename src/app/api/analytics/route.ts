import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id || "";

  const [
    sessions,
    ratingsGiven,
    ratingsReceived,
    trustHistory,
  ] = await Promise.all([
    prisma.chatSession.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      select: { duration: true, categorySlug: true, startedAt: true },
      orderBy: { startedAt: "desc" },
    }),
    prisma.rating.count({ where: { raterId: userId } }),
    prisma.rating.findMany({
      where: { ratedId: userId },
      select: { score: true },
    }),
    prisma.trustScore.findUnique({
      where: { userId },
      select: { score: true, updatedAt: true },
    }),
  ]);

  const totalSessions = sessions.length;
  const totalDuration = sessions.reduce((s, c) => s + c.duration, 0);
  const avgSessionDuration = totalSessions > 0 ? Math.floor(totalDuration / totalSessions) : 0;
  const avgRating = ratingsReceived.length > 0
    ? Math.round((ratingsReceived.reduce((s, r) => s + r.score, 0) / ratingsReceived.length) * 10) / 10
    : 0;

  // Top categories
  const catMap: Record<string, number> = {};
  for (const s of sessions) { catMap[s.categorySlug] = (catMap[s.categorySlug] || 0) + 1; }
  const topCategories = Object.entries(catMap)
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Weekly activity (last 7 days)
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyActivity = daysOfWeek.map((day, i) => {
    const daySessions = sessions.filter(s => {
      const d = new Date(s.startedAt);
      return (d.getDay() + 6) % 7 === i && d > new Date(Date.now() - 7 * 86400000);
    });
    return { day, sessions: daySessions.length, duration: daySessions.reduce((s, c) => s + c.duration, 0) };
  });

  // Streaks (consecutive days with sessions)
  const uniqueDays = new Set(sessions.map(s => new Date(s.startedAt).toISOString().split("T")[0]));
  let current = 0;
  let best = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().split("T")[0];
    if (uniqueDays.has(d)) { current++; best = Math.max(best, current); }
    else if (i > 0) break;
  }

  return NextResponse.json({
    userId,
    totalSessions,
    totalDuration,
    avgSessionDuration,
    totalMessages: 0,
    ratingsGiven,
    ratingsReceived: ratingsReceived.length,
    avgRating,
    topCategories,
    weeklyActivity,
    trustScoreHistory: trustHistory ? [{ date: new Date().toISOString().split("T")[0], score: trustHistory.score }] : [],
    streaks: { current, best },
  });
}
