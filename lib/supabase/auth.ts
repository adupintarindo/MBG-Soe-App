// Request-scoped auth + profile cache.
// React.cache() dedupes calls within a single server request, so middleware
// + page + layout hitting getUser()/profile only cost ONE Supabase roundtrip
// instead of 3-4 sequential ones.
import { cache } from "react";
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

export const getSessionUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
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
