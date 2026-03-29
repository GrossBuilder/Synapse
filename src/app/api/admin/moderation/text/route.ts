import { NextRequest } from "next/server";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { redis } from "@/lib/redis";
import { moderateText } from "@/lib/text-moderation";

/**
 * GET /api/admin/moderation/text — статистика текстовой модерации из Redis.
 *   ?userId=xxx — логи конкретного пользователя
 */
export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (userId) {
    const [violations, logs] = await Promise.all([
      redis.get(`textmod:violations:${userId}`),
      redis.lrange(`textmod:log:${userId}`, 0, 49),
    ]);

    return Response.json({
      userId,
      violationCount: parseInt(violations || "0"),
      logs: logs.map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(Boolean),
    });
  }

  return Response.json({ message: "Provide ?userId=xxx to get text moderation logs" });
}

/**
 * POST /api/admin/moderation/text — протестировать текстовую модерацию.
 *   body: { text: "test message" }
 */
export async function POST(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const body = await request.json();
  const text = typeof body.text === "string" ? body.text.slice(0, 2000) : "";

  if (!text) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const result = await moderateText(text);
  return Response.json(result);
}
