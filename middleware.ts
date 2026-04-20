import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Inlined (mirror of lib/supabase/auth.ts) — can't import from auth.ts because
// it uses react.cache() which isn't available in the Edge runtime.
const DEV_ADMIN_COOKIE = "mbg-dev-admin";
const DEV_ADMIN_VALUE = "1";

// Middleware: refresh session cookie on every request + gate /dashboard, /admin, /planner
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers }
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        }
      }
    }
  );

  // Refresh session cookie (no-op kalau tidak login)
  const {
    data: { user: realUser }
  } = await supabase.auth.getUser();

  // Dev shortcut: admin/admin cookie counts as authenticated in non-prod.
  const isDevAdmin =
    process.env.NODE_ENV !== "production" &&
    request.cookies.get(DEV_ADMIN_COOKIE)?.value === DEV_ADMIN_VALUE;

  const user = realUser ?? (isDevAdmin ? { id: "dev-admin" } : null);

  const { pathname, search } = request.nextUrl;

  // Public paths: landing, auth flow, login itself, static + api
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/api/dev-login");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  // Sudah login, kembali ke dashboard kalau buka /login
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Skip static assets, next internals, favicon, images, and API routes that handle their own auth
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
  ]
};
