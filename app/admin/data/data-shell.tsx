"use client";

import { useState } from "react";
import type { Database } from "@/types/database";
import { ResetPanel } from "./reset-panel";
import { ItemsPanel } from "./items-panel";
import { MenusPanel } from "./menus-panel";
import { SuppliersPanel } from "./suppliers-panel";
import { SchoolsPanel } from "./schools-panel";
import { t, type LangKey } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type ItemRow = Pick<
  Database["public"]["Tables"]["items"]["Row"],
  "code" | "unit" | "category" | "price_idr" | "vol_weekly" | "active"
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

const TABS: { key: TabKey; labelKey: LangKey; icon: string }[] = [
  { key: "items",     labelKey: "adminData.tabItems",     icon: "🥕" },
  { key: "menus",     labelKey: "adminData.tabMenus",     icon: "🍲" },
  { key: "suppliers", labelKey: "adminData.tabSuppliers", icon: "🤝" },
  { key: "schools",   labelKey: "adminData.tabSchools",   icon: "🏫" },
  { key: "reset",     labelKey: "adminData.tabReset",     icon: "🧨" }
];

export function DataShell({ items, menus, suppliers, schools, counts }: Props) {
  const { lang } = useLang();
  const [tab, setTab] = useState<TabKey>("items");

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-card ring-1 ring-ink/5">
        {TABS.map((tb) => {
          const isActive = tab === tb.key;
          const isReset = tb.key === "reset";
          return (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-bold transition ${
                isActive
                  ? isReset
                    ? "bg-red-600 text-white shadow-card"
                    : "bg-ink text-white shadow-card"
                  : "text-ink2 hover:bg-paper hover:text-ink"
              }`}
            >
              <span aria-hidden>{tb.icon}</span>
              <span>{t(tb.labelKey, lang)}</span>
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
