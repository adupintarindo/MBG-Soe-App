// Request-scoped auth + profile cache.
// React.cache() dedupes calls within a single server request, so middleware
// + page + layout hitting getUser()/profile only cost ONE Supabase roundtrip
// instead of 3-4 sequential ones.
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "./server";
import type { UserRole } from "@/lib/roles";

export type SessionProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  active: boolean;
  supplier_id: string | null;
};

// Cookie name for dev shortcut login (admin/admin → instant session).
// Route handler `/api/dev-login` sets this; `/auth/signout` clears it.
export const DEV_ADMIN_COOKIE = "mbg-dev-admin";
export const DEV_ADMIN_VALUE = "1";

const DEV_ADMIN_PROFILE: SessionProfile = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@mbg-soe.local",
  full_name: "Admin (Dev)",
  role: "admin",
  active: true,
  supplier_id: null
};

function isDevAdmin(): boolean {
  // Hard-disable in production — ignore any stale cookie so prod users always
  // hit real Supabase auth, even if they previously logged in via dev shortcut.
  if (process.env.NODE_ENV === "production") return false;
  try {
    return cookies().get(DEV_ADMIN_COOKIE)?.value === DEV_ADMIN_VALUE;
  } catch {
    return false;
  }
}

export const getSessionUser = cache(async () => {
  if (isDevAdmin()) {
    return {
      id: DEV_ADMIN_PROFILE.id,
      email: DEV_ADMIN_PROFILE.email
    } as { id: string; email: string };
  }
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  if (isDevAdmin()) return DEV_ADMIN_PROFILE;

  const user = await getSessionUser();
  if (!user) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, active, supplier_id")
    .eq("id", user.id)
    .maybeSingle();

  return (data as SessionProfile | null) ?? null;
});
