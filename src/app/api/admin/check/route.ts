import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminFromRequest } from "@/lib/admin-auth";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
  // Check via admin cookie first
  const hasCookie = await getAdminFromRequest(request);
  if (hasCookie) return NextResponse.json({ isAdmin: true });

  // Fallback: check if logged-in user email matches ADMIN_EMAIL
  const session = await getServerSession(authOptions);
  if (session?.user?.email && ADMIN_EMAIL && session.user.email === ADMIN_EMAIL) {
    return NextResponse.json({ isAdmin: true });
  }

  return NextResponse.json({ isAdmin: false });
}
