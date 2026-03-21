import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { adminStore } from "@/lib/admin-store";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const severity = url.searchParams.get("severity") || "all";
  const offenders = url.searchParams.get("offenders");
  const abusers = url.searchParams.get("abusers");

  if (offenders === "true") {
    const list = await adminStore.getRepeatOffenders();
    return Response.json({ offenders: list });
  }

  if (abusers === "true") {
    const list = await adminStore.getReportAbusers();
    return Response.json({ abusers: list });
  }

  const result = await adminStore.getReports({ status, severity });
  return Response.json(result);
}

export async function POST(request: NextRequest) {
  // Require authentication — get reporterId from session
  const session = await getServerSession(authOptions);
  if (!session?.user || !(session.user as { id?: string }).id) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }
  const reporterId = (session.user as { id: string }).id;

  const body = await request.json();
  const { reportedId, reason, description, reporterLocale } = body;

  if (!reportedId || !reason || !description) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const result = await adminStore.createReport({ reporterId, reportedId, reason, description, reporterLocale });
  if (!result) {
    const settings = await adminStore.getSettings();
    return Response.json(
      { error: "Daily report limit reached", limit: settings.maxReportsPerDay, remaining: 0 },
      { status: 429 }
    );
  }

  return Response.json(result, { status: 201 });
}
