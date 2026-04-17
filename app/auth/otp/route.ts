import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Dev-only OTP bypass: /auth/otp?email=X&token=Y&next=/dashboard
// Dipakai kalau Supabase email rate limit exceeded — admin generate OTP via
// /auth/v1/admin/generate_link, lalu user buka URL ini untuk langsung login.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");
  const next = url.searchParams.get("next") || "/dashboard";

  if (!email || !token) {
    return NextResponse.redirect(
      `${url.origin}/login?err=${encodeURIComponent("email & token wajib")}`
    );
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "email"
  });

  if (error) {
    return NextResponse.redirect(
      `${url.origin}/login?err=${encodeURIComponent(error.message)}`
    );
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
