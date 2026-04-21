"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryBadge, IDR } from "@/components/ui";
import { SortableTable, type SortableColumn } from "@/components/sortable-table";
import { formatIDR } from "@/lib/engine";
import { t, type Lang } from "@/lib/i18n";

export type BomTableRow = {
  item_code: string;
  category: string;
  small: number;
  large: number;
  tiered: boolean;
};

export function BomTable({
  rows,
  lang
}: {
  rows: BomTableRow[];
  lang: Lang;
}) {
  const columns: SortableColumn<BomTableRow>[] = [
    {
      key: "item",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.item_code,
      render: (r) => (
        <span className="font-semibold text-ink">{r.item_code}</span>
      )
    },
    {
      key: "cat",
      label: t("menu.colKat", lang),
      sortValue: (r) => r.category,
      render: (r) => (
        <div className="flex justify-center">
          <CategoryBadge category={r.category} size="sm" />
        </div>
      )
    },
    {
      key: "small",
      label: t("menu.colSmall", lang),
      title: t("menu.titleSmall", lang),
      sortValue: (r) => r.small,
      render: (r) => (
        <span className="font-mono text-ink">{r.small.toFixed(1)}</span>
      )
    },
    {
      key: "large",
      label: t("menu.colLarge", lang),
      title: t("menu.titleLarge", lang),
      sortValue: (r) => r.large,
      render: (r) => (
        <span className="font-mono font-black text-ink">
          {r.large.toFixed(1)}
        </span>
      )
    }
  ];

  return (
    <SortableTable<BomTableRow>
      tableClassName="text-xs"
      variant="subtle"
      rowKey={(r) => r.item_code}
      initialSort={{ key: "large", dir: "desc" }}
      columns={columns}
      rows={rows}
      dense
      stickyHeader
      bodyMaxHeight={380}
    />
  );
}

export type CommoditySupplier = {
  id: string;
  name: string;
  is_main: boolean;
};

export type MenuDetail = {
  id: number;
  cycleDay: number;
  name: string;
  nameEn: string | null;
  costPerPorsi: number;
  rows: BomTableRow[];
};

export type CommodityRow = {
  code: string;
  displayCode: string;
  category: string;
  unit: string;
  price_idr: number;
  usedInMenus: number[];
  suppliers: CommoditySupplier[];
  active: boolean;
};

export function CommodityTable({
  rows,
  lang,
  menuDetailsByDay
}: {
  rows: CommodityRow[];
  lang: Lang;
  menuDetailsByDay?: Record<number, MenuDetail>;
}) {
  const [openDay, setOpenDay] = useState<number | null>(null);
  const openMenu =
    openDay != null ? menuDetailsByDay?.[openDay] ?? null : null;

  useEffect(() => {
    if (openDay == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDay(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openDay]);

  const columns: SortableColumn<CommodityRow>[] = [
    {
      key: "no",
      label: t("dashboard.tblNo", lang),
      width: "52px",
      sortable: false,
      render: (_r, i) => <span className="text-ink2">{i + 1}</span>
    },
    {
      key: "code",
      label: t("common.item", lang),
      align: "left",
      sortValue: (r) => r.displayCode,
      render: (r) => <span className="font-semibold">{r.displayCode}</span>
    },
    {
      key: "cat",
      label: t("common.category", lang),
      sortValue: (r) => r.category,
      render: (r) => (
        <div className="flex justify-center">
          <CategoryBadge category={r.category} />
        </div>
      )
    },
    {
      key: "unit",
      label: t("common.unit", lang),
      sortValue: (r) => r.unit,
      render: (r) => <span className="font-mono text-xs">{r.unit}</span>
    },
    {
      key: "price",
      label: t("menu.colPrice", lang),
      align: "left",
      sortValue: (r) => r.price_idr,
      render: (r) => <IDR value={r.price_idr} className="text-xs" />
    },
    {
      key: "usedIn",
      label: t("menu.colUsedIn", lang),
      align: "left",
      sortValue: (r) => r.usedInMenus.length,
      searchValue: (r) => r.usedInMenus.map((d) => `H${d}`).join(" "),
      exportValue: (r) => r.usedInMenus.map((d) => `H${d}`).join(", "),
      render: (r) =>
        r.usedInMenus.length === 0 ? (
          <span className="text-ink2/50">—</span>
        ) : (
          <div className="flex flex-wrap justify-start gap-1">
            {r.usedInMenus.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setOpenDay(d)}
                title={menuDetailsByDay?.[d]?.name ?? `H${d}`}
                className="inline-flex h-5 min-w-[24px] items-center justify-center rounded-md bg-primary-gradient px-1.5 text-[10px] font-black text-white shadow-sm transition hover:brightness-110"
              >
                H{d}
              </button>
            ))}
          </div>
        )
    },
    {
      key: "sup",
      label: t("common.supplier", lang),
      align: "left",
      sortValue: (r) => r.suppliers.length,
      searchValue: (r) => r.suppliers.map((s) => s.name).join(" "),
      exportValue: (r) =>
        r.suppliers.length === 0
          ? ""
          : r.suppliers.map((s) => s.name).join(", "),
      render: (r) =>
        r.suppliers.length === 0 ? (
          <span className="text-ink2/50">—</span>
        ) : (
          <div className="flex flex-col items-start gap-1">
            {r.suppliers.map((s) => (
              <Link
                key={s.id}
                href={`/suppliers/${s.id}`}
                title={s.is_main ? `${s.name} (utama)` : s.name}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 transition hover:brightness-95 ${
                  s.is_main
                    ? "bg-accent-strong/10 text-accent-strong ring-accent-strong/30"
                    : "bg-paper text-ink ring-ink/10 hover:bg-ink/[0.04]"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )
    }
  ];

  return (
    <>
      <SortableTable<CommodityRow>
        tableClassName="text-sm"
        rowKey={(r) => r.code}
        initialSort={{ key: "usedIn", dir: "desc" }}
        rowClassName={(r) => (!r.active ? "opacity-50" : "")}
        columns={columns}
        rows={rows}
        stickyHeader
        bodyMaxHeight={500}
      />
      {openMenu && (
        <MenuCardModal
          lang={lang}
          menu={openMenu}
          onClose={() => setOpenDay(null)}
        />
      )}
    </>
  );
}

function MenuCardModal({
  menu,
  lang,
  onClose
}: {
  menu: MenuDetail;
  lang: Lang;
  onClose: () => void;
}) {
  const displayName =
    lang === "EN" && menu.nameEn ? menu.nameEn : menu.name;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={displayName}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-md"
    >
      <article
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-paper shadow-2xl ring-1 ring-ink/5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink ring-1 ring-ink/10 transition hover:bg-white hover:shadow-card"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100">
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-6xl opacity-60"
          >
            🍛
          </div>
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
          <span className="absolute left-3 top-3 inline-flex h-7 items-center justify-center rounded-lg bg-primary-gradient px-2 text-[11px] font-black text-white shadow-card">
            H{menu.cycleDay}
          </span>
          <span className="absolute right-12 top-3 rounded-md bg-white/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink2 backdrop-blur-sm">
            {lang === "EN" ? "Placeholder" : "Foto Belum Tersedia"}
          </span>
        </div>

        <div className="p-4">
          <header className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black leading-snug text-ink">
                {displayName}
              </h3>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-black text-emerald-700">
                {formatIDR(menu.costPerPorsi)}
                {t("menu.perPorsi", lang)}
              </div>
            </div>
          </header>

          {menu.rows.length === 0 ? (
            <div className="rounded-xl bg-white p-4 text-center text-xs text-ink2/70 ring-1 ring-ink/5">
              {t("menu.bomEmpty", lang)}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white ring-1 ring-ink/5">
              <BomTable lang={lang} rows={menu.rows} />
              <div
                className="border-t border-ink/5 bg-paper px-2 py-1 text-[9px] text-ink2/70"
                dangerouslySetInnerHTML={{
                  __html: t("menu.gramasiNote", lang)
                }}
              />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
