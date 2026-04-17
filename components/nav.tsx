import Link from "next/link";
import type { UserRole } from "@/lib/roles";
import { ROLE_LABELS, canInvite, canWriteMenu, canWriteStock } from "@/lib/roles";

interface NavProps {
  email: string;
  role: UserRole;
  fullName?: string | null;
}

export function Nav({ email, role, fullName }: NavProps) {
  const label = ROLE_LABELS[role];
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
              🍱
            </span>
            <div className="leading-tight">
              <div className="text-sm font-black text-ink">MBG Soe</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/60">
                Supply Chain · SPPG Nunumeu
              </div>
            </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-paper">
            Dashboard
          </Link>
          {canWriteMenu(role) && (
            <Link href="/planner" className="rounded-lg px-3 py-2 hover:bg-paper">
              Kalender & Menu
            </Link>
          )}
          {canWriteStock(role) && (
            <Link href="/stock" className="rounded-lg px-3 py-2 hover:bg-paper">
              Stok & PO
            </Link>
          )}
          <Link href="/suppliers" className="rounded-lg px-3 py-2 hover:bg-paper">
            Supplier
          </Link>
          {canInvite(role) && (
            <Link
              href="/admin/invite"
              className="rounded-lg px-3 py-2 text-ink2 hover:bg-paper"
            >
              🛡️ Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <div className="text-xs font-bold text-ink">{fullName || email}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-ink2/60">
              {label.icon} {label.id}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-ink/20 bg-white px-3 py-2 text-xs font-bold text-ink hover:bg-paper"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
