"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, FieldLabel, Input, Section } from "@/components/ui";
import type { DataCounts } from "./data-shell";

type ResetKind = "transactional" | "stock" | "master";

interface ResetSpec {
  kind: ResetKind;
  rpc:
    | "admin_reset_transactional"
    | "admin_reset_stock"
    | "admin_reset_master";
  title: string;
  hint: string;
  affects: string;
  keeps: string;
  confirmWord: string;
  tone: "warn" | "bad";
}

const SPECS: ResetSpec[] = [
  {
    kind: "transactional",
    rpc: "admin_reset_transactional",
    title: "Reset Transaksi",
    hint: "Hapus semua dokumen procurement & ledger. Master data tetap aman.",
    affects:
      "PO, GRN, Invoice, Receipt, Stock Moves, Transactions · Stock di-set ke 0",
    keeps:
      "Items, Menu + BOM, Suppliers, Schools, Settings, Profiles, Invites",
    confirmWord: "RESET TRANSAKSI",
    tone: "warn"
  },
  {
    kind: "stock",
    rpc: "admin_reset_stock",
    title: "Reset Stok",
    hint: "Set stok semua item ke 0 dengan log opening move. Dokumen procurement tetap.",
    affects: "Stock.qty (semua item ke 0) · log via stock_moves (reason=opening)",
    keeps: "PO, GRN, Invoice, Transactions, master data",
    confirmWord: "RESET STOK",
    tone: "warn"
  },
  {
    kind: "master",
    rpc: "admin_reset_master",
    title: "Reset Master Data",
    hint: "Hapus items, menus, BOM, suppliers, supplier_items, schools. WAJIB Reset Transaksi dulu.",
    affects:
      "Items, Menus + BOM, Suppliers, Supplier-Items, Schools, Stock rows",
    keeps: "Profiles, Invites, Settings",
    confirmWord: "HAPUS MASTER",
    tone: "bad"
  }
];

export function ResetPanel({ counts }: { counts: DataCounts }) {
  return (
    <div className="space-y-4">
      <Section
        title="Status Data Saat Ini"
        hint="Snapshot diambil saat halaman dimuat. Refresh halaman untuk update angka."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <CountTile label="Items" value={counts.items} />
          <CountTile label="Menus" value={counts.menus} />
          <CountTile label="Suppliers" value={counts.suppliers} />
          <CountTile label="Sekolah" value={counts.schools} />
          <CountTile label="Stock rows" value={counts.stock_rows} />
          <CountTile label="PO" value={counts.purchase_orders} tone="warn" />
          <CountTile label="GRN" value={counts.grns} tone="warn" />
          <CountTile label="Invoice" value={counts.invoices} tone="warn" />
          <CountTile label="Stock moves" value={counts.stock_moves} tone="warn" />
          <CountTile label="Transactions" value={counts.transactions} tone="warn" />
        </div>
      </Section>

      {SPECS.map((spec) => (
        <ResetCard key={spec.kind} spec={spec} />
      ))}
    </div>
  );
}

function CountTile({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  const valueCls = tone === "warn" ? "text-amber-700" : "text-ink";
  return (
    <div className="rounded-xl bg-paper p-3 ring-1 ring-ink/5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
        {label}
      </div>
      <div className={`mt-1 text-xl font-black ${valueCls}`}>{value}</div>
    </div>
  );
}

type Status = "idle" | "running" | "ok" | "error";

function ResetCard({ spec }: { spec: ResetSpec }) {
  const supabase = createClient();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<unknown>(null);

  const armed = confirmText.trim().toUpperCase() === spec.confirmWord;
  const isDanger = spec.tone === "bad";

  async function onRun() {
    if (!armed || status === "running") return;
    setStatus("running");
    setMessage(null);
    setDetails(null);

    const { data, error } = await supabase.rpc(spec.rpc);

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("ok");
    setDetails(data ?? null);
    setMessage(`${spec.title} berhasil. Snapshot data ter-update.`);
    setConfirmText("");
    router.refresh();
  }

  return (
    <Section
      title={spec.title}
      hint={spec.hint}
      accent={isDanger ? "bad" : "warn"}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
          <div className="text-[10px] font-bold uppercase tracking-wide text-red-900/70">
            Yang dihapus / direset
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-red-900">
            {spec.affects}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-900/70">
            Yang tetap aman
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-emerald-900">
            {spec.keeps}
          </p>
        </div>
      </div>

      <label className="mt-4 block">
        <FieldLabel hint={`ketik "${spec.confirmWord}" persis`}>
          Konfirmasi
        </FieldLabel>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={spec.confirmWord}
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={isDanger ? "danger" : "primary"}
          size="md"
          disabled={!armed || status === "running"}
          onClick={onRun}
        >
          {status === "running" ? "Memproses…" : `Jalankan ${spec.title} →`}
        </Button>
        <Badge tone={armed ? (isDanger ? "bad" : "warn") : "muted"}>
          {armed ? "siap dijalankan" : "konfirmasi belum cocok"}
        </Badge>
      </div>

      {status === "ok" && message && (
        <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
          <div className="mb-1 font-black">✓ {message}</div>
          {details ? (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-ink shadow-sm">
              {JSON.stringify(details, null, 2)}
            </pre>
          ) : null}
        </div>
      )}

      {status === "error" && message && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          <div className="mb-1 font-black">✗ Gagal</div>
          <p className="leading-relaxed">{message}</p>
        </div>
      )}
    </Section>
  );
}
