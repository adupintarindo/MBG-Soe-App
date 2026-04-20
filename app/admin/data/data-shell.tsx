"use client";

import type { Database } from "@/types/database";
import { ResetPanel } from "./reset-panel";
import { ItemsPanel } from "./items-panel";
import { MenusPanel } from "./menus-panel";
import { SuppliersPanel } from "./suppliers-panel";
import { SchoolsPanel } from "./schools-panel";

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

export type DataShellTab = "items" | "menus" | "suppliers" | "schools" | "reset";

interface Props {
  tab: DataShellTab;
  items: ItemRow[];
  menus: MenuRow[];
  suppliers: SupplierRow[];
  schools: SchoolRow[];
  counts: DataCounts;
}

export function DataShell({ tab, items, menus, suppliers, schools, counts }: Props) {
  return (
    <div>
      {tab === "items" && <ItemsPanel initial={items} />}
      {tab === "menus" && <MenusPanel initial={menus} />}
      {tab === "suppliers" && <SuppliersPanel initial={suppliers} />}
      {tab === "schools" && <SchoolsPanel initial={schools} />}
      {tab === "reset" && <ResetPanel counts={counts} />}
    </div>
  );
}
