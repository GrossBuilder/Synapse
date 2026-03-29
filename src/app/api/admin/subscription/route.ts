import { NextRequest } from "next/server";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adminStore } from "@/lib/admin-store";

const VALID_PLANS = ["PLUS", "PRO"] as const;

/**
 * PATCH /api/admin/subscription
 * Admin manual subscription management.
 * Actions: activate, deactivate, extend
 */
export async function PATCH(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const body = await request.json();
  const { userId, action } = body;

  if (!userId || !action) {
    return Response.json({ error: "userId and action required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "activate") {
    const plan = (body.plan || "PLUS").toUpperCase();
    if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
      return Response.json({ error: "Invalid plan" }, { status: 400 });
    }
    const days = parseInt(body.days) || 30;
    if (days < 1 || days > 365) {
      return Response.json({ error: "Days must be 1-365" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + days * 86400000);
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: plan as "PLUS" | "PRO", expiresAt, status: "ACTIVE" },
      update: { plan: plan as "PLUS" | "PRO", expiresAt, status: "ACTIVE" },
    });

    await adminStore.addActivity(
      "settings_changed",
      `Admin manually activated ${plan} subscription for ${user.name} (${days} days)`,
    );

    return Response.json({ success: true, plan, expiresAt: expiresAt.getTime() });
  }

  if (action === "deactivate") {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return Response.json({ error: "No subscription found" }, { status: 404 });
    }

    await prisma.subscription.update({
      where: { userId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    await adminStore.addActivity(
      "settings_changed",
      `Admin deactivated subscription for ${user.name}`,
    );

    return Response.json({ success: true });
  }

  if (action === "extend") {
    const days = parseInt(body.days) || 30;
    if (days < 1 || days > 365) {
      return Response.json({ error: "Days must be 1-365" }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return Response.json({ error: "No subscription found" }, { status: 404 });
    }

    const now = Date.now();
    const baseTime = sub.expiresAt && sub.expiresAt.getTime() > now ? sub.expiresAt.getTime() : now;
    const newExpiresAt = new Date(baseTime + days * 86400000);

    await prisma.subscription.update({
      where: { userId },
      data: { expiresAt: newExpiresAt, status: "ACTIVE" },
    });

    await adminStore.addActivity(
      "settings_changed",
      `Admin extended subscription for ${user.name} by ${days} days (until ${newExpiresAt.toLocaleDateString()})`,
    );

    return Response.json({ success: true, expiresAt: newExpiresAt.getTime() });
  }

  return Response.json({ error: "Invalid action. Use: activate, deactivate, extend" }, { status: 400 });
}
