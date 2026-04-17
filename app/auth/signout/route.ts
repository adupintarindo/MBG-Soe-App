import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEV_ADMIN_COOKIE } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  const res = NextResponse.redirect(`${url.origin}/`, { status: 303 });
  res.cookies.set({
    name: DEV_ADMIN_COOKIE,
    value: "",
    path: "/",
    maxAge: 0
  });
  return res;
}
