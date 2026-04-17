"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/roles";

interface SupplierOpt {
  id: string;
  name: string;
}

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: "admin",     label: "Admin",        desc: "Full akses semua modul" },
  { value: "operator",  label: "Operator",     desc: "Stok, PO, GRN, invoice, receipt" },
  { value: "ahli_gizi", label: "Ahli Gizi",    desc: "Menu master, BOM, kalender" },
  { value: "supplier",  label: "Supplier",     desc: "Read PO/GRN/invoice miliknya" },
  { value: "viewer",    label: "Observer",     desc: "Read-only (WFP, auditor)" }
];

export function InviteForm({ suppliers }: { suppliers: SupplierOpt[] }) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [supplierId, setSupplierId] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    setToken(null);

    const { data, error } = await supabase.rpc("create_invite", {
      p_email: email.trim().toLowerCase(),
      p_role: role,
      p_supplier_id: role === "supplier" ? supplierId || null : null
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("ok");
    setToken(data as unknown as string);
    setMessage(
      `Undangan dibuat untuk ${email}. Minta user login via magic link di halaman /login — sistem akan cocokkan email dengan undangan ini.`
    );
    setEmail("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-2xl bg-white p-5 shadow-card md:grid-cols-2"
    >
      <label className="block md:col-span-2">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink2">
          Email pengguna
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

      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink2">
          Peran
        </span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label} — {r.desc}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink2">
          Supplier {role === "supplier" ? "(wajib)" : "(abaikan)"}
        </span>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          disabled={role !== "supplier"}
          className="w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm disabled:bg-paper disabled:text-ink2/50"
        >
          <option value="">— pilih supplier —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} · {s.name}
            </option>
          ))}
        </select>
      </label>

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-card hover:bg-ink2 disabled:opacity-60"
        >
          {status === "sending" ? "Mengirim…" : "Buat Undangan →"}
        </button>
      </div>

      {status === "ok" && message && (
        <div className="md:col-span-2 rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
          {message}
          {token && (
            <div className="mt-2">
              <span className="text-xs font-bold">Token: </span>
              <code className="rounded bg-white px-2 py-1 font-mono text-xs">
                {token}
              </code>
            </div>
          )}
        </div>
      )}

      {status === "error" && message && (
        <div className="md:col-span-2 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          {message}
        </div>
      )}
    </form>
  );
}
