"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/roles";
import { Badge, Button, FieldLabel, Input, Section, Select } from "@/components/ui";

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
    <Section
      title="Buat Undangan Baru"
      hint="Email yang diundang akan otomatis terhubung ke profil saat login magic link pertama."
      accent="info"
    >
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <FieldLabel>Email pengguna</FieldLabel>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@instansi.go.id"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <FieldLabel>Peran</FieldLabel>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label} — {r.desc}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <FieldLabel hint={role === "supplier" ? "wajib" : "abaikan"}>
            Supplier
          </FieldLabel>
          <Select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={role !== "supplier"}
          >
            <option value="">— pilih supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.name}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Mengirim…" : "Buat Undangan →"}
          </Button>
          <Badge tone="muted">
            Berlaku 7 hari · sekali klaim
          </Badge>
        </div>

        {status === "ok" && message && (
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200 md:col-span-2">
            <div className="mb-1 font-black">✓ Undangan dibuat</div>
            <p className="leading-relaxed">{message}</p>
            {token && (
              <div className="mt-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-green-900/70">
                  Token
                </span>
                <code className="mt-1 block break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-ink shadow-sm">
                  {token}
                </code>
              </div>
            )}
          </div>
        )}

        {status === "error" && message && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200 md:col-span-2">
            <div className="mb-1 font-black">✗ Gagal buat undangan</div>
            <p className="leading-relaxed">{message}</p>
          </div>
        )}
      </form>
    </Section>
  );
}
