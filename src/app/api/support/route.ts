import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimitByIP } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const SUPPORT_EMAIL = "support@synapse.app";
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2000;

/**
 * GET /api/support — get current user's tickets
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id!;
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ tickets, email: SUPPORT_EMAIL });
}

/**
 * POST /api/support — create a new support ticket
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = await rateLimitByIP(ip, "support-ticket", 3, 60);
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

  const body = await req.json();
  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, MAX_SUBJECT_LENGTH) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
  const locale = typeof body.locale === "string" ? body.locale.slice(0, 5) : "en";

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
  }

  const userId = (session.user as { id?: string }).id!;
  const email = session.user.email || "";

  const ticket = await prisma.supportTicket.create({
    data: { userId, email, subject, message, locale },
  });

  return NextResponse.json({ ticket, email: SUPPORT_EMAIL }, { status: 201 });
}
