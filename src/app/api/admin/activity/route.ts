import { NextRequest } from "next/server";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { adminStore } from "@/lib/admin-store";

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "30");

  const logs = await adminStore.getActivityLog(limit);
  return Response.json({ logs });
}
