import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, validateAdminCredentials, COOKIE_NAME } from "@/lib/admin-auth";
import { strictRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limiting: 5 попыток за 5 минут
  const limit = await strictRateLimit(ip, "admin-login");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.resetIn) } },
    );
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!validateAdminCredentials(email, password, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown")) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createAdminToken();

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60, // 8 hours
    path: "/",
  });

  return response;
}
