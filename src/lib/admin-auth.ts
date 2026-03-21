import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.warn("[SECURITY] ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables");
}

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
  console.warn("[SECURITY] NEXTAUTH_SECRET must be set in environment variables");
}

const JWT_SECRET = new TextEncoder().encode(NEXTAUTH_SECRET || "");
const COOKIE_NAME = "synapse-admin-token";

export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin", email: ADMIN_EMAIL })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

// Brute-force защита: блокировка после 5 неудачных попыток на 15 минут
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000;

export function validateAdminCredentials(email: string, password: string, ip: string = "unknown"): boolean {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !NEXTAUTH_SECRET) return false;

  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.blockedUntil > Date.now()) {
    return false;
  }

  const valid = email === ADMIN_EMAIL && password === ADMIN_PASSWORD;

  if (!valid) {
    const current = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
    current.count++;
    if (current.count >= MAX_LOGIN_ATTEMPTS) {
      current.blockedUntil = Date.now() + BLOCK_DURATION_MS;
      current.count = 0;
      console.warn(`[SECURITY] Admin login blocked for IP: ${ip} (too many attempts)`);
    }
    loginAttempts.set(ip, current);
    return false;
  }

  // Успешный вход — сбрасываем счётчик
  loginAttempts.delete(ip);
  return true;
}

export async function getAdminFromRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}

export function adminUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export { COOKIE_NAME };
