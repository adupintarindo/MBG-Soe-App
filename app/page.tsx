import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-2xl bg-white p-10 shadow-cardlg">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
            🍱
          </span>
          <div>
            <h1 className="text-xl font-black text-ink">
              MBG Soe · Supply Chain
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink2/70">
              WFP × IFSR × FFI · SPPG Nunumeu
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-ink2">
          Sistem rantai pasok & perencanaan menu program Makan Bergizi Gratis
          untuk 9 sekolah di Soe, Nusa Tenggara Timur. Akses terbatas untuk
          admin, operator SPPG, ahli gizi, supplier, dan observer WFP.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-card transition hover:bg-ink2"
          >
            Masuk dengan Magic Link →
          </Link>
          <a
            href="mailto:alfatehan.s@ifsr.or.id?subject=Undangan%20Akses%20MBG%20Soe"
            className="inline-flex items-center gap-2 rounded-xl border border-ink/20 bg-white px-5 py-3 text-sm font-bold text-ink hover:bg-paper"
          >
            Minta Undangan
          </a>
        </div>

        <p className="mt-8 text-[11px] text-ink2/60">
          Go-live SPPG Nunumeu · 4 Mei 2026 · Pilot fase IFSR Ship-to-School
        </p>
      </div>
    </main>
  );
}
