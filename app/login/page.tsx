"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, FieldLabel, Input } from "@/components/ui";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    // Shortcut: admin / admin → instant session via /api/dev-login.
    if (trimmedEmail === "admin" && password === "admin") {
      try {
        const res = await fetch("/api/dev-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "admin",
            password: "admin",
            next: nextPath
          })
        });
        const data = (await res.json()) as { ok?: boolean; redirect?: string; error?: string };
        if (!res.ok || !data.ok) {
          setStatus("error");
          setError(data.error ?? "Gagal login admin.");
          return;
        }
        router.replace(data.redirect ?? nextPath);
        router.refresh();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Network error.");
      }
      return;
    }

    // Normal magic-link flow
    const redirectTo =
      (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) +
      `/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
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
    <main className="relative mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-16">
      <div className="w-full overflow-hidden rounded-2xl bg-white shadow-cardlg">
        <div className="bg-primary-gradient px-6 py-6 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-xl ring-1 ring-white/25 backdrop-blur">
              🍱
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                MBG Soe · Supply Chain
              </div>
              <h1 className="truncate text-lg font-black">SPPG Nunumeu</h1>
              <div className="text-[11px] font-semibold text-white/75">
                WFP × IFSR × FFI
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          {status === "sent" ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
                <div className="mb-1 flex items-center gap-2 text-sm font-black">
                  <span>✉️</span> Cek email Anda
                </div>
                <p className="leading-relaxed">
                  Kami kirim tautan masuk ke{" "}
                  <span className="font-mono font-bold">{email}</span>. Buka
                  tautan tersebut untuk masuk. Link berlaku 1 jam.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                }}
                className="text-xs font-bold text-accent-strong hover:underline"
              >
                ← Gunakan email lain
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-black text-ink">
                  Masuk dengan magic link
                </h2>
                <p className="mt-1 text-[12px] text-ink2/75">
                  Kami akan mengirim tautan masuk sekali pakai ke email Anda —
                  tanpa password. Shortcut:{" "}
                  <span className="font-mono font-bold">admin / admin</span>.
                </p>
              </div>

              <label className="block">
                <FieldLabel>Email terdaftar</FieldLabel>
                <Input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@instansi.go.id"
                  autoComplete="username"
                  autoFocus
                />
              </label>

              <label className="block">
                <FieldLabel hint="kosongkan untuk magic link">
                  Password
                </FieldLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                />
              </label>

              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
                  <b>Gagal masuk.</b> {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={status === "sending"}
                className="w-full"
              >
                {status === "sending" ? "Memproses…" : "Masuk →"}
              </Button>

              <p className="pt-1 text-[11px] leading-relaxed text-ink2/70">
                Hanya email yang sudah diundang admin yang dapat masuk. Belum
                diundang?{" "}
                <a
                  className="font-bold text-accent-strong hover:underline"
                  href="mailto:alfatehan.s@ifsr.or.id?subject=Undangan%20Akses%20MBG%20Soe"
                >
                  Kontak admin
                </a>
                .
              </p>
            </form>
          )}
        </div>

        <div className="border-t border-ink/5 bg-paper px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-ink2/70 sm:px-8">
          SPPG Nunumeu · Kec. Kota Soe · TTS
        </div>
      </div>
    </main>
  );
}
