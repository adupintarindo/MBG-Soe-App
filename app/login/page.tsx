"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const redirectTo =
      (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) +
      `/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl bg-white p-8 shadow-cardlg">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
            🔐
          </span>
          <div>
            <h1 className="text-lg font-black text-ink">Masuk · MBG Soe</h1>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink2/70">
              Magic link email
            </p>
          </div>
        </div>

        {status === "sent" ? (
          <div className="rounded-xl bg-green-50 p-5 text-sm text-green-900 ring-1 ring-green-200">
            <b>Cek email Anda.</b> Kami kirim tautan ajaib ke{" "}
            <span className="font-mono">{email}</span>. Buka tautan itu untuk
            masuk. Link berlaku 1 jam.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink2">
                Email terdaftar
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@instansi.go.id"
                className="w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm outline-none ring-accent/30 focus:ring-4"
              />
            </label>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-card transition hover:bg-ink2 disabled:opacity-60"
            >
              {status === "sending" ? "Mengirim…" : "Kirim Magic Link →"}
            </button>

            <p className="text-[11px] leading-relaxed text-ink2/70">
              Hanya email yang sudah diundang admin yang dapat masuk. Belum
              diundang?{" "}
              <a
                className="underline"
                href="mailto:alfatehan.s@ifsr.or.id?subject=Undangan%20Akses%20MBG%20Soe"
              >
                Kontak admin
              </a>
              .
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
