"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatIDR } from "@/lib/engine";
import type { SupplierAction } from "@/lib/engine";
import { Badge, Button, Input, Select } from "@/components/ui";
import { ActionsPanel } from "./actions-panel";
import type {
  SupplierRow,
  SupItemLink,
  InvoiceTx,
  PoTx,
  ItemCatalog,
  SupplierCert
} from "./types";

const TYPE_COLOR: Record<string, string> = {
  BUMN: "bg-red-50 text-red-900 ring-red-200",
  PT: "bg-blue-50 text-blue-900 ring-blue-200",
  CV: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  UD: "bg-amber-50 text-amber-900 ring-amber-200",
  KOPERASI: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  POKTAN: "bg-lime-50 text-lime-900 ring-lime-200",
  TOKO: "bg-violet-50 text-violet-900 ring-violet-200",
  KIOS: "bg-pink-50 text-pink-900 ring-pink-200",
  INFORMAL: "bg-slate-50 text-slate-900 ring-slate-200"
};

interface TxRow {
  kind: "PO" | "Invoice";
  no: string;
  date: string;
  total: number | null;
  status: string;
}

interface Props {
  supplier: SupplierRow;
  supItems: SupItemLink[];
  invoices: InvoiceTx[];
  pos: PoTx[];
  certs: SupplierCert[];
  actions: SupplierAction[];
  canWriteActions: boolean;
  isSupplierRole: boolean;
  items: ItemCatalog[];
  isAdmin: boolean;
  onClose: () => void;
}

export function SupplierDetailModal({
  supplier,
  supItems,
  invoices,
  pos,
  certs,
  actions,
  canWriteActions,
  isSupplierRole,
  items,
  isAdmin,
  onClose
}: Props) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const itemNameMap = useMemo(() => {
    const m = new Map<string, ItemCatalog>();
    for (const it of items) m.set(it.code, it);
    return m;
  }, [items]);

  const txRows: TxRow[] = useMemo(() => {
    const rows: TxRow[] = [];
    for (const p of pos)
      rows.push({
        kind: "PO",
        no: p.no,
        date: p.po_date,
        total: Number(p.total),
        status: p.status
      });
    for (const i of invoices)
      rows.push({
        kind: "Invoice",
        no: i.no,
        date: i.inv_date,
        total: Number(i.total),
        status: i.status
      });
    rows.sort((a, b) => (a.date < b.date ? 1 : -1));
    return rows.slice(0, 20);
  }, [invoices, pos]);

  const score = Number(supplier.score ?? 0);

  const waLink = supplier.phone
    ? `https://wa.me/${supplier.phone.replace(/[^\d+]/g, "").replace(/^\+/, "")}`
    : null;

  const mapsLink = supplier.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(supplier.address)}`
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Rincian ${supplier.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-ink/10 sm:max-h-[calc(100dvh-3rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink/10 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-2xl">🏪</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-ink2/60">
                  {supplier.id}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[supplier.type] ?? TYPE_COLOR.INFORMAL}`}
                >
                  {supplier.type}
                </span>
              </div>
              <h2 className="truncate text-lg font-black text-ink">
                {supplier.name}
              </h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/suppliers/${supplier.id}`}
              className="hidden rounded-xl bg-accent-strong px-3 py-2 text-[11px] font-black text-white ring-1 ring-accent-strong transition hover:bg-ink sm:inline-block"
              title="Panel lengkap: Re-evaluasi, QC gallery, LTA"
            >
              Panel Lengkap →
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink2 ring-1 ring-ink/10 transition hover:bg-ink/5"
            >
              ×
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <InfoPanel supplier={supplier} waLink={waLink} mapsLink={mapsLink} />
            <RatingCertPanel
              supplier={supplier}
              certs={certs}
              isAdmin={isAdmin}
              onChange={() => router.refresh()}
              score={score}
            />
          </div>

          <div className="px-6 pb-6">
            <CommodityPanel
              supplierId={supplier.id}
              supItems={supItems}
              itemNameMap={itemNameMap}
              items={items}
              isAdmin={isAdmin}
              onChange={() => router.refresh()}
            />
          </div>

          <div className="px-6 pb-6">
            <ActionsPanel
              actions={actions}
              supplierId={supplier.id}
              canWrite={canWriteActions}
              isSupplierRole={isSupplierRole}
              title={`📋 Action Items · ${supplier.name}`}
            />
          </div>

          <div className="px-6 pb-6">
            <TransactionPanel rows={txRows} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPanel({
  supplier,
  waLink,
  mapsLink
}: {
  supplier: SupplierRow;
  waLink: string | null;
  mapsLink: string | null;
}) {
  return (
    <section className="rounded-2xl bg-paper p-5 ring-1 ring-ink/5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
        🏢 Info Supplier
      </h3>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-base font-black text-ink">{supplier.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TYPE_COLOR[supplier.type] ?? TYPE_COLOR.INFORMAL}`}
        >
          {supplier.type}
        </span>
      </div>

      <div className="mb-3 text-[12px] text-ink2/80">
        <span className="font-mono">{supplier.id}</span> · Status:{" "}
        <b className="text-ink">{supplier.status}</b> · Score:{" "}
        <b className="text-ink">{Number(supplier.score ?? 0).toFixed(1)}</b>
      </div>

      <div className="space-y-1.5 text-[12px] text-ink">
        <div>
          <b>PIC:</b> {supplier.pic ?? "—"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span>
            <b>Telepon:</b>{" "}
            <span className="font-mono text-ink2">
              {supplier.phone ?? "—"}
            </span>
          </span>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-6 items-center gap-1 rounded-lg bg-emerald-500 px-2 text-[10px] font-bold text-white hover:bg-emerald-600"
            >
              💬 WA
            </a>
          )}
        </div>
        <div>
          <b>Email:</b>{" "}
          <span className="font-mono text-ink2">
            {supplier.email ?? "—"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span>
            <b>Alamat:</b> {supplier.address ?? "—"}
          </span>
          {mapsLink && (
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-6 items-center gap-1 rounded-lg bg-blue-500 px-2 text-[10px] font-bold text-white hover:bg-blue-600"
            >
              🗺️ Maps
            </a>
          )}
        </div>
      </div>

      {supplier.notes && (
        <div className="mt-3 border-t border-ink/10 pt-2 text-[12px] text-ink2">
          <b>Catatan:</b> {supplier.notes}
        </div>
      )}
    </section>
  );
}

function RatingCertPanel({
  supplier,
  certs,
  isAdmin,
  onChange,
  score
}: {
  supplier: SupplierRow;
  certs: SupplierCert[];
  isAdmin: boolean;
  onChange: () => void;
  score: number;
}) {
  const [hover, setHover] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [certName, setCertName] = useState("");
  const [certUntil, setCertUntil] = useState("");

  const starValue = Math.round((score / 100) * 5);

  async function setStars(stars: number) {
    if (!isAdmin) return;
    setErr(null);
    setBusy(true);
    const newScore = Math.round((stars / 5) * 100 * 10) / 10;
    const res = await fetch(`/api/suppliers/${supplier.id}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: newScore })
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Gagal simpan rating.");
      return;
    }
    onChange();
  }

  async function addCert() {
    if (!isAdmin) return;
    const name = certName.trim();
    if (!name) {
      setErr("Nama sertifikat wajib.");
      return;
    }
    setErr(null);
    setBusy(true);
    const res = await fetch(`/api/suppliers/${supplier.id}/certs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, valid_until: certUntil || null })
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Gagal simpan sertifikat.");
      return;
    }
    setCertName("");
    setCertUntil("");
    onChange();
  }

  async function removeCert(id: number) {
    if (!isAdmin) return;
    if (!confirm("Hapus sertifikat ini?")) return;
    setErr(null);
    setBusy(true);
    const res = await fetch(
      `/api/suppliers/${supplier.id}/certs?cid=${id}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Gagal hapus.");
      return;
    }
    onChange();
  }

  return (
    <section className="rounded-2xl bg-paper p-5 ring-1 ring-ink/5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
        ⭐ Rating & Sertifikasi
      </h3>

      <div className="mb-2 text-[12px] text-ink2/70">
        {score > 0
          ? `Skor ${score.toFixed(1)} / 100 · ${starValue}/5 bintang`
          : "Belum dinilai"}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || starValue) >= n;
            return (
              <button
                key={n}
                type="button"
                disabled={!isAdmin || busy}
                onClick={() => setStars(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`Set rating ${n} bintang`}
                className={`text-xl transition ${active ? "text-amber-400" : "text-ink/20"} ${isAdmin ? "hover:scale-110" : "cursor-default"}`}
              >
                ★
              </button>
            );
          })}
        </div>
        {isAdmin && (
          <span className="text-[11px] text-ink2/60">Klik untuk set</span>
        )}
      </div>

      <div className="mb-2 flex items-center gap-2 text-[12px] font-bold text-ink">
        📜 Sertifikasi
      </div>

      {certs.length === 0 ? (
        <p className="mb-3 text-[12px] text-ink2/70">
          Belum ada sertifikasi tercatat.
        </p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {certs.map((c) => {
            const expired =
              c.valid_until && new Date(c.valid_until).getTime() < Date.now();
            return (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-[12px] ring-1 ring-ink/5"
              >
                <span>
                  <b className="text-ink">{c.name}</b>
                  {c.valid_until && (
                    <span
                      className={`ml-2 text-[11px] ${expired ? "text-red-700" : "text-ink2/70"}`}
                    >
                      s/d {c.valid_until}
                      {expired && " · kadaluarsa"}
                    </span>
                  )}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => removeCert(c.id)}
                    className="text-[11px] font-bold text-red-700 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={certName}
            onChange={(e) => setCertName(e.target.value)}
            placeholder="Nama sertifikat (cth: Halal)"
            className="min-w-[160px] flex-1"
          />
          <Input
            type="date"
            value={certUntil}
            onChange={(e) => setCertUntil(e.target.value)}
            placeholder="Berlaku s/d"
            className="w-[160px]"
          />
          <Button
            size="sm"
            variant="primary"
            disabled={busy}
            onClick={addCert}
          >
            + Sertifikat
          </Button>
        </div>
      )}

      {err && (
        <p className="mt-2 text-[11px] font-bold text-red-700">{err}</p>
      )}
    </section>
  );
}

function CommodityPanel({
  supplierId,
  supItems,
  itemNameMap,
  items,
  isAdmin,
  onChange
}: {
  supplierId: string;
  supItems: SupItemLink[];
  itemNameMap: Map<string, ItemCatalog>;
  items: ItemCatalog[];
  isAdmin: boolean;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const si of supItems) m[si.item_code] = si.price_idr != null ? String(si.price_idr) : "";
    return m;
  });
  const [newCode, setNewCode] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) s.add(it.category);
    return Array.from(s).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const linked = new Set(supItems.map((si) => si.item_code));
    return items.filter((it) => !linked.has(it.code) && (!newCategory || it.category === newCategory));
  }, [items, supItems, newCategory]);

  async function savePrice(code: string) {
    if (!isAdmin) return;
    setErr(null);
    setBusy(true);
    const res = await fetch(
      `/api/suppliers/${supplierId}/items?code=${encodeURIComponent(code)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price_idr: prices[code] || null })
      }
    );
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Gagal simpan harga.");
      return;
    }
    onChange();
  }

  async function removeItem(code: string) {
    if (!isAdmin) return;
    if (!confirm(`Hapus komoditas ${code} dari supplier ini?`)) return;
    setErr(null);
    setBusy(true);
    const res = await fetch(
      `/api/suppliers/${supplierId}/items?code=${encodeURIComponent(code)}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Gagal hapus.");
      return;
    }
    onChange();
  }

  async function addItem() {
    if (!isAdmin) return;
    if (!newCode) {
      setErr("Pilih komoditas dulu.");
      return;
    }
    setErr(null);
    setBusy(true);
    const res = await fetch(`/api/suppliers/${supplierId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_code: newCode,
        price_idr: newPrice || null
      })
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Gagal tambah.");
      return;
    }
    setNewCode("");
    setNewPrice("");
    onChange();
  }

  return (
    <section className="rounded-2xl bg-paper p-5 ring-1 ring-ink/5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
        💰 Daftar Komoditas & Harga
        <span className="text-[11px] font-semibold text-ink2/70">
          · edit harga inline, tekan 💾 untuk simpan
        </span>
      </h3>

      {supItems.length === 0 ? (
        <p className="mb-3 text-[12px] text-ink2/70">
          Supplier belum punya komoditas tercatat. Tambahkan di bawah.
        </p>
      ) : (
        <div className="mb-3 overflow-x-auto rounded-xl bg-white ring-1 ring-ink/5">
          <table className="w-full text-sm">
            <thead className="bg-ink/[0.02] text-left text-[11px] font-bold uppercase tracking-wide text-ink2/70">
              <tr>
                <th className="py-2 pl-3 pr-3">Komoditas</th>
                <th className="py-2 pr-3">Satuan</th>
                <th className="py-2 pr-3 text-right">Harga Saat Ini</th>
                <th className="py-2 pr-3 text-center">Histori</th>
                <th className="py-2 pr-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {supItems.map((si) => {
                const info = itemNameMap.get(si.item_code);
                const name = info?.name_en ?? si.item_code;
                const unit = info?.unit ?? "—";
                const category = info?.category ?? "";
                return (
                  <tr key={si.item_code} className="border-t border-ink/5">
                    <td className="py-2 pl-3 pr-3">
                      <div className="font-bold text-ink">{name}</div>
                      <div className="text-[10px] uppercase text-ink2/60">
                        {category || si.item_code}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-[12px] text-ink2">{unit}</td>
                    <td className="py-2 pr-3">
                      <Input
                        value={prices[si.item_code] ?? ""}
                        onChange={(e) =>
                          setPrices({
                            ...prices,
                            [si.item_code]: e.target.value
                          })
                        }
                        disabled={!isAdmin}
                        type="number"
                        className="ml-auto w-32 text-right font-mono"
                      />
                    </td>
                    <td className="py-2 pr-3 text-center text-ink2/40">—</td>
                    <td className="py-2 pr-3 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => savePrice(si.item_code)}
                            disabled={busy}
                            aria-label="Simpan harga"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-white hover:bg-accent-strong"
                          >
                            💾
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(si.item_code)}
                            disabled={busy}
                            aria-label="Hapus komoditas"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="mt-3 mb-2 flex items-center gap-2 text-[12px] font-bold text-ink">
            + Tambah Komoditas Baru
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-[160px]"
            >
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="min-w-[180px] flex-1"
            >
              <option value="">— pilih komoditas —</option>
              {filteredItems.map((it) => (
                <option key={it.code} value={it.code}>
                  {it.name_en} ({it.code} · {it.unit})
                </option>
              ))}
            </Select>
            <Input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Harga IDR"
              className="w-[140px] font-mono"
            />
            <Button size="sm" variant="primary" disabled={busy} onClick={addItem}>
              + Tambah
            </Button>
          </div>
        </>
      )}

      {err && <p className="mt-2 text-[11px] font-bold text-red-700">{err}</p>}
    </section>
  );
}

function TransactionPanel({ rows }: { rows: TxRow[] }) {
  return (
    <section className="rounded-2xl bg-paper p-5 ring-1 ring-ink/5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-ink">
        📋 Histori Transaksi
        <span className="text-[11px] font-semibold text-ink2/70">
          · 20 terakhir
        </span>
      </h3>

      {rows.length === 0 ? (
        <p className="text-center text-[12px] text-ink2/60">
          Belum ada transaksi.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-ink/5">
          <table className="w-full text-sm">
            <thead className="bg-ink/[0.02] text-left text-[11px] font-bold uppercase tracking-wide text-ink2/70">
              <tr>
                <th className="py-2 pl-3 pr-3">Tanggal</th>
                <th className="py-2 pr-3">Tipe</th>
                <th className="py-2 pr-3">Nomor</th>
                <th className="py-2 pr-3 text-right">Nilai</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.kind}-${r.no}`}
                  className="border-t border-ink/5"
                >
                  <td className="py-2 pl-3 pr-3 font-mono text-[12px] text-ink2">
                    {r.date}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={r.kind === "PO" ? "info" : "accent"}>
                      {r.kind}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[12px]">{r.no}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[12px] font-black">
                    {r.total != null ? formatIDR(r.total) : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone="muted">{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
