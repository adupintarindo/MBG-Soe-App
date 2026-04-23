// Server component / route handler Supabase client (reads cookies)
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — Next.js blocks mutation here.
            // Middleware will refresh the session cookie.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        }
      }
    }
  );
}

// Admin (service-role) client — dipakai di route handler untuk operasi yang
// perlu bypass RLS (mis. create invite, lihat auth.users).
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Duplicated from ./auth.ts to avoid circular import (auth.ts imports this file).
// Keep in sync with the constants there.
const DEV_ADMIN_COOKIE_NAME = "mbg-dev-admin";
const DEV_ADMIN_COOKIE_VAL = "1";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Auto-escalating server client.
 *
 * - Normal session → regular client (RLS tetap berlaku = aman)
 * - Dev-admin cookie aktif → admin client (bypass RLS)
 *
 * Kenapa: dev-admin pakai fake UUID yang tidak ada di auth.users/profiles,
 * jadi `auth.uid()` di Postgres = NULL → RLS policy "auth.uid() is not null"
 * memblokir semua SELECT. Akibatnya data yang di-insert via admin-client di
 * POST tidak kelihatan di listing (`Belum ada quotation`, dst).
 *
 * Pakai ini untuk SELECT di server component yang menampilkan data yang
 * mungkin di-insert via admin path. Untuk operasi destructive (DELETE/UPDATE
 * skala besar) tetap pakai `createAdminClient()` eksplisit.
 */
export function createServerReadClient() {
  try {
    const isDevAdmin =
      cookies().get(DEV_ADMIN_COOKIE_NAME)?.value === DEV_ADMIN_COOKIE_VAL;
    if (isDevAdmin) return createAdminClient();
  } catch {
    // cookies() can throw outside request scope — fall back to regular client
  }
  return createClient();
}
