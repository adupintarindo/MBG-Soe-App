import Link from "next/link";
import type { UserRole } from "@/lib/roles";
import {
  ROLE_LABELS,
  canInvite,
  canWriteMenu,
  canWriteStock
} from "@/lib/roles";

interface NavProps {
  email: string;
  role: UserRole;
  fullName?: string | null;
}

interface NavLink {
  href: string;
  label: string;
  icon: string;
  show: (role: UserRole) => boolean;
}

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", show: () => true },
  { href: "/menu", label: "Menu", icon: "🍽️", show: () => true },
  {
    href: "/calendar",
    label: "Kalender",
    icon: "📅",
    show: (r) => canWriteMenu(r) || r === "viewer"
  },
  { href: "/planning", label: "Planning", icon: "📈", show: () => true },
  { href: "/schools", label: "Sekolah", icon: "🏫", show: () => true },
  {
    href: "/stock",
    label: "Stok",
    icon: "📦",
    show: (r) => canWriteStock(r) || r === "viewer" || r === "ahli_gizi"
  },
  {
    href: "/procurement",
    label: "PO/GRN",
    icon: "🧾",
    show: () => true
  },
  { href: "/suppliers", label: "Supplier", icon: "🤝", show: () => true },
  { href: "/sop", label: "SOP", icon: "📘", show: () => true }
];

export function Nav({ email, role, fullName }: NavProps) {
  const label = ROLE_LABELS[role];
  const visible = LINKS.filter((l) => l.show(role));

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

        <nav className="hidden flex-wrap items-center gap-1 text-xs font-semibold lg:flex">
          {visible.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 hover:bg-paper"
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          ))}
          {canInvite(role) && (
            <Link
              href="/admin/invite"
              className="flex items-center gap-1.5 rounded-lg border border-ink/10 px-2.5 py-2 text-ink2 hover:bg-paper"
            >
              <span>🛡️</span>
              <span>Admin</span>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <div className="max-w-[180px] truncate text-xs font-bold text-ink">
              {fullName || email}
            </div>
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

      {/* Mobile nav strip */}
      <div className="flex gap-1 overflow-x-auto border-t border-ink/5 px-4 py-2 text-[11px] font-semibold lg:hidden">
        {visible.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-paper"
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        ))}
      </div>
    </header>
  );
}
