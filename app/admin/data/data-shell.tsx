"use client";

import { useState } from "react";
import type { Database } from "@/types/database";
import { ResetPanel } from "./reset-panel";
import { ItemsPanel } from "./items-panel";
import { MenusPanel } from "./menus-panel";
import { SuppliersPanel } from "./suppliers-panel";
import { SchoolsPanel } from "./schools-panel";

type ItemRow = Pick<
  Database["public"]["Tables"]["items"]["Row"],
  "code" | "name_en" | "unit" | "category" | "price_idr" | "vol_weekly" | "active"
>;
type MenuRow = Pick<
  Database["public"]["Tables"]["menus"]["Row"],
  "id" | "name" | "name_en" | "cycle_day" | "active" | "notes"
>;
type SupplierRow = Pick<
  Database["public"]["Tables"]["suppliers"]["Row"],
  | "id"
  | "name"
  | "type"
  | "commodity"
  | "pic"
  | "phone"
  | "address"
  | "email"
  | "score"
  | "status"
  | "active"
>;
type SchoolRow = Pick<
  Database["public"]["Tables"]["schools"]["Row"],
  | "id"
  | "name"
  | "level"
  | "students"
  | "kelas13"
  | "kelas46"
  | "guru"
  | "distance_km"
  | "pic"
  | "phone"
  | "address"
  | "active"
>;

export interface DataCounts {
  items: number;
  menus: number;
  suppliers: number;
  schools: number;
  purchase_orders: number;
  grns: number;
  invoices: number;
  stock_moves: number;
  transactions: number;
  stock_rows: number;
}

interface Props {
  items: ItemRow[];
  menus: MenuRow[];
  suppliers: SupplierRow[];
  schools: SchoolRow[];
  counts: DataCounts;
}

type TabKey = "reset" | "items" | "menus" | "suppliers" | "schools";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "items",     label: "Bahan Makanan",  icon: "🥕" },
  { key: "menus",     label: "Menu",            icon: "🍲" },
  { key: "suppliers", label: "Supplier",        icon: "🤝" },
  { key: "schools",   label: "Sekolah",         icon: "🏫" },
  { key: "reset",     label: "Reset Data",      icon: "🧨" }
];

export function DataShell({ items, menus, suppliers, schools, counts }: Props) {
  const [tab, setTab] = useState<TabKey>("items");

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-card ring-1 ring-ink/5">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          const isReset = t.key === "reset";
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold transition ${
                isActive
                  ? isReset
                    ? "bg-red-600 text-white shadow-card"
                    : "bg-ink text-white shadow-card"
                  : "text-ink2 hover:bg-paper hover:text-ink"
              }`}
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "items" && <ItemsPanel initial={items} />}
      {tab === "menus" && <MenusPanel initial={menus} />}
      {tab === "suppliers" && <SuppliersPanel initial={suppliers} />}
      {tab === "schools" && <SchoolsPanel initial={schools} />}
      {tab === "reset" && <ResetPanel counts={counts} />}
    </div>
  );
}
