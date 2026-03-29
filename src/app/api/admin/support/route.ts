import { NextRequest } from "next/server";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/support — list all support tickets
 */
export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";

  const where = status !== "all" ? { status: status.toUpperCase() as "OPEN" | "REPLIED" | "CLOSED" } : {};

  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const counts = await prisma.supportTicket.groupBy({
    by: ["status"],
    _count: true,
  });

  const stats = {
    total: counts.reduce((s, c) => s + c._count, 0),
    open: counts.find(c => c.status === "OPEN")?._count || 0,
    replied: counts.find(c => c.status === "REPLIED")?._count || 0,
    closed: counts.find(c => c.status === "CLOSED")?._count || 0,
  };

  return Response.json({ tickets, stats });
}

/**
 * POST /api/admin/support — reply to or close a ticket
 * Body: { ticketId, action: "reply" | "close", message? }
 */
export async function POST(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const body = await request.json();
  const ticketId = typeof body.ticketId === "string" ? body.ticketId : "";
  const action = body.action as "reply" | "close";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!ticketId) {
    return Response.json({ error: "ticketId required" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return Response.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (action === "reply") {
    if (!message) {
      return Response.json({ error: "Message required" }, { status: 400 });
    }
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        adminReply: message,
        status: "REPLIED",
        repliedAt: new Date(),
      },
    });
    return Response.json({ ticket: updated });
  }

  if (action === "close") {
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });
    return Response.json({ ticket: updated });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
