import { NextRequest } from "next/server";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { adminStore } from "@/lib/admin-store";

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "all";
  const region = url.searchParams.get("region") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");

  const result = await adminStore.getUsers({ search, status, region, page, limit });
  return Response.json(result);
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const { userId, action, reason } = await request.json();

  if (!userId || !action) {
    return Response.json({ error: "userId and action required" }, { status: 400 });
  }

  if (action === "delete") {
    const deleted = await adminStore.deleteUser(userId);
    if (!deleted) return Response.json({ error: "User not found or delete failed" }, { status: 404 });
    return Response.json({ success: true });
  }

  let user;
  switch (action) {
    case "ban":
      user = await adminStore.banUser(userId, reason || "Banned by admin");
      break;
    case "unban":
      user = await adminStore.unbanUser(userId);
      break;
    case "warn":
      user = await adminStore.warnUser(userId);
      break;
    case "unwarn":
      user = await adminStore.unwarnUser(userId);
      break;
    default:
      return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  return Response.json({ user });
}
