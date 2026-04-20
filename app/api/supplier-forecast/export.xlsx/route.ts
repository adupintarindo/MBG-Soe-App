import { NextResponse } from "next/server";
import { buildStyledXlsxBuffer, type StyledColumn } from "@/lib/excel-export";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

type DailyRow = {
  op_date: string;
  item_code: string;
  item_name: string;
  unit: string;
  category: string;
  qty: number | string;
  source: string;
};

type MonthlyRow = {
  month: string;
  item_code: string;
  item_name: string;
  unit: string;
  category: string;
  qty_total: number | string;
  days_count: number;
};

function isoWeek(d: Date): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const requestedSupplierId = url.searchParams.get("supplier_id");

  let targetSupplierId: string | null = null;
  if (profile.role === "supplier") {
    targetSupplierId = profile.supplier_id ?? null;
    if (!targetSupplierId) {
      return NextResponse.json(
        { error: "supplier_not_linked" },
        { status: 403 }
      );
    }
  } else if (
    profile.role === "admin" ||
    profile.role === "operator" ||
    profile.role === "ahli_gizi" ||
    profile.role === "viewer"
  ) {
    targetSupplierId = requestedSupplierId;
    if (!targetSupplierId) {
      return NextResponse.json(
        { error: "supplier_id_required" },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = createClient();
  const [supMetaRes, dailyRes, monthlyRes] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, pic, phone, email, commodity")
      .eq("id", targetSupplierId)
      .maybeSingle(),
    supabase.rpc("supplier_forecast_90d", {
      p_supplier_id: profile.role === "supplier" ? undefined : targetSupplierId,
      p_horizon_days: 90
    }),
    supabase.rpc("supplier_forecast_monthly", {
      p_supplier_id: profile.role === "supplier" ? undefined : targetSupplierId,
      p_months: 3
    })
  ]);

  const supMeta = (supMetaRes.data ?? null) as {
    id: string;
    name: string;
    pic: string | null;
    phone: string | null;
    email: string | null;
    commodity: string | null;
  } | null;
  const daily = (dailyRes.data ?? []) as DailyRow[];
  const monthly = (monthlyRes.data ?? []) as MonthlyRow[];

  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  // === Sheet 3: Weekly pivot (item × week) ===
  const weekSet = new Set<string>();
  const itemMap = new Map<
    string,
    { code: string; name: string; unit: string }
  >();
  const weeklyCell = new Map<string, number>();
  for (const r of daily) {
    const w = isoWeek(new Date(r.op_date + "T00:00:00"));
    weekSet.add(w);
    if (!itemMap.has(r.item_code)) {
      itemMap.set(r.item_code, {
        code: r.item_code,
        name: r.item_name,
        unit: r.unit
      });
    }
    const key = `${r.item_code}|${w}`;
    weeklyCell.set(key, (weeklyCell.get(key) ?? 0) + Number(r.qty));
  }
  const weeks = Array.from(weekSet).sort();
  const itemsArr = Array.from(itemMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const weeklyCols: StyledColumn[] = [
    { key: "code", header: "Kode", width: 14, align: "left" },
    { key: "name", header: "Nama Item", width: 30, align: "left" },
    { key: "unit", header: "Unit", width: 8, align: "center" },
    ...weeks.map<StyledColumn>((w) => ({
      key: `wk-${w}`,
      header: w,
      width: 12,
      align: "right",
      hint: "number",
      numFmt: "#,##0.0"
    })),
    {
      key: "total",
      header: "Total 90d",
      width: 14,
      align: "right",
      hint: "bold",
      numFmt: "#,##0"
    }
  ];

  const weeklyRows = itemsArr.map((it) => {
    const r: Record<string, unknown> = {
      code: it.code,
      name: it.name,
      unit: it.unit
    };
    let total = 0;
    for (const w of weeks) {
      const v = weeklyCell.get(`${it.code}|${w}`) ?? 0;
      r[`wk-${w}`] = v;
      total += v;
    }
    r.total = total;
    return r;
  });

  const filename = `forecast-${(supMeta?.name ?? targetSupplierId ?? "supplier")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-90d`;

  const buffer = await buildStyledXlsxBuffer({
    fileName: filename,
    sheets: [
      {
        name: "Info",
        title: "FORECAST KEBUTUHAN SUPPLIER · MBG SOE",
        subtitle: "Proyeksi kebutuhan harian/mingguan/bulanan 90 hari ke depan",
        columns: [
          { key: "k", header: "Field", width: 22, align: "left" },
          { key: "v", header: "Value", width: 80, align: "left" }
        ],
        meta: [
          ["Supplier", supMeta?.name ?? targetSupplierId ?? ""],
          ["PIC", supMeta?.pic ?? ""],
          ["Telepon", supMeta?.phone ?? ""],
          ["Email", supMeta?.email ?? ""],
          ["Komoditas", supMeta?.commodity ?? ""],
          ["Horizon", "90 hari ke depan"],
          ["Digenerate", generatedAt]
        ],
        rows: [
          {
            k: "Catatan",
            v: "Sumber: assigned = menu sudah di-assign operator; custom = menu custom; cycle = estimasi berdasarkan rotasi siklus default."
          },
          {
            k: "",
            v: "Qty bersifat estimasi. Angka final akan muncul di quotation/PO yang dikirim tim procurement."
          },
          {
            k: "",
            v: "Hubungi tim procurement kalau ada komoditas yang sedang tidak tersedia supaya kami bisa re-alokasi ke supplier lain."
          }
        ]
      },
      {
        name: "Harian",
        title: `Forecast Harian · 90 Hari · ${supMeta?.name ?? ""}`,
        columns: [
          { key: "date", header: "Tanggal", width: 12, align: "center" },
          { key: "code", header: "Kode Item", width: 14, align: "left" },
          { key: "name", header: "Nama Item", width: 30, align: "left" },
          {
            key: "qty",
            header: "Qty",
            width: 12,
            align: "right",
            hint: "number",
            numFmt: "#,##0.00"
          },
          { key: "unit", header: "Unit", width: 8, align: "center" },
          { key: "category", header: "Kategori", width: 14, align: "left" },
          { key: "source", header: "Sumber", width: 12, align: "center" }
        ],
        rows: daily.map((r) => ({
          date: r.op_date,
          code: r.item_code,
          name: r.item_name,
          qty: Number(r.qty),
          unit: r.unit,
          category: r.category,
          source: r.source
        })),
        cellHint: (row, key) => {
          if (key !== "source") return undefined;
          if (row.source === "assigned") return "status-ok";
          if (row.source === "custom") return "status-neutral";
          if (row.source === "cycle") return "status-bad";
          return undefined;
        },
        zebra: true,
        freezeHeader: true
      },
      {
        name: "Mingguan",
        title: `Forecast Mingguan · Pivot Item × ISO Week · ${supMeta?.name ?? ""}`,
        columns: weeklyCols,
        rows: weeklyRows,
        zebra: true,
        freezeHeader: true
      },
      {
        name: "Bulanan",
        title: `Forecast Bulanan · 3 Bulan · ${supMeta?.name ?? ""}`,
        columns: [
          { key: "month", header: "Bulan", width: 12, align: "center" },
          { key: "code", header: "Kode Item", width: 14, align: "left" },
          { key: "name", header: "Nama Item", width: 30, align: "left" },
          { key: "unit", header: "Unit", width: 8, align: "center" },
          {
            key: "qty",
            header: "Qty Total",
            width: 14,
            align: "right",
            hint: "number",
            numFmt: "#,##0"
          },
          {
            key: "days",
            header: "Hari Operasional",
            width: 16,
            align: "right",
            hint: "number",
            numFmt: "#,##0"
          }
        ],
        rows: monthly.map((r) => ({
          month: r.month,
          code: r.item_code,
          name: r.item_name,
          unit: r.unit,
          qty: Number(r.qty_total),
          days: r.days_count
        })),
        zebra: true,
        freezeHeader: true
      }
    ]
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}
