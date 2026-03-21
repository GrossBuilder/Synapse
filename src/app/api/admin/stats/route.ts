import { NextRequest } from "next/server";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { adminStore } from "@/lib/admin-store";

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();
  return Response.json(await adminStore.getMetrics());
}
