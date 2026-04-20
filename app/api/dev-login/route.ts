import { NextResponse } from "next/server";
import { DEV_ADMIN_COOKIE, DEV_ADMIN_VALUE } from "@/lib/supabase/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Shortcut: POST {username:"admin", password:"admin"} → set cookie → instant admin session.
// No real auth roundtrip. Demo/ops shortcut — active in all environments.
export async function POST(request: Request) {
  // Rate-limit: max 5 login attempts per IP per minute.
  const ip = clientIp(request.headers);
  const rl = await rateLimit({
    key: `devlogin:${ip}`,
    limit: 5,
    windowSec: 60
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) }
      }
    );
  }

  let body: { username?: string; password?: string; next?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const { username, password, next } = body;
  if (username !== "admin" || password !== "admin") {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const safeNext =
    typeof next === "string" && next.startsWith("/") ? next : "/dashboard";

  const res = NextResponse.json({ ok: true, redirect: safeNext });
  res.cookies.set({
    name: DEV_ADMIN_COOKIE,
    value: DEV_ADMIN_VALUE,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
  return res;
}
