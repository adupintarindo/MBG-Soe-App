import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link callback: Supabase redirects here with `?code=...`
// We exchange the code for a session cookie, then redirect to `next` or /dashboard
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${url.origin}/login?err=${encodeURIComponent(error.message)}`
      );
    }
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
