import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

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

  // Auth gate disabled — dashboard terbuka langsung tanpa login
  void supabase;
  return response;
}

export const config = {
  // Skip static assets & API routes that manage their own auth
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/public).*)"]
};
