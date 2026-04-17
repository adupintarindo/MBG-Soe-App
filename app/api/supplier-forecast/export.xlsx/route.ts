import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
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
      p_supplier_id: profile.role === "supplier" ? null : targetSupplierId,
      p_horizon_days: 90
    }),
    supabase.rpc("supplier_forecast_monthly", {
      p_supplier_id: profile.role === "supplier" ? null : targetSupplierId,
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

  const wb = XLSX.utils.book_new();
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

  // === Sheet 1: Cover / Info ===
  const cover: (string | number)[][] = [
    ["FORECAST KEBUTUHAN SUPPLIER · MBG SOE"],
    [],
    ["Supplier", supMeta?.name ?? targetSupplierId ?? ""],
    ["PIC", supMeta?.pic ?? ""],
    ["Telepon", supMeta?.phone ?? ""],
    ["Email", supMeta?.email ?? ""],
    ["Komoditas", supMeta?.commodity ?? ""],
    [],
    ["Horizon", "90 hari ke depan"],
    ["Digenerate", generatedAt],
    [],
    ["Catatan"],
    [
      "Sumber data per baris: assigned = menu sudah di-assign operator; custom = menu custom tanggal itu; cycle = estimasi berdasarkan rotasi siklus default."
    ],
    [
      "Qty bersifat estimasi. Angka final akan muncul di quotation/PO yang dikirim tim procurement."
    ],
    [
      "Tolong sampaikan ke tim procurement kalau ada komoditas yang sedang tidak tersedia supaya kami bisa re-alokasi ke supplier lain."
    ]
  ];
  const wsCover = XLSX.utils.aoa_to_sheet(cover);
  wsCover["!cols"] = [{ wch: 20 }, { wch: 80 }];
  wsCover["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsCover, "Info");

  // === Sheet 2: Harian ===
  const dailyAoa: (string | number)[][] = [
    ["Tanggal", "Kode Item", "Nama Item", "Qty", "Unit", "Kategori", "Sumber"]
  ];
  for (const r of daily) {
    dailyAoa.push([
      r.op_date,
      r.item_code,
      r.item_name,
      Number(r.qty),
      r.unit,
      r.category,
      r.source
    ]);
  }
  const wsDaily = XLSX.utils.aoa_to_sheet(dailyAoa);
  wsDaily["!cols"] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 28 },
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDaily, "Harian");

  // === Sheet 3: Mingguan (pivot item × week) ===
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
  const weeklyAoa: (string | number)[][] = [
    ["Kode", "Nama Item", "Unit", ...weeks, "Total 90d"]
  ];
  for (const it of itemsArr) {
    const row: (string | number)[] = [it.code, it.name, it.unit];
    let total = 0;
    for (const w of weeks) {
      const v = weeklyCell.get(`${it.code}|${w}`) ?? 0;
      row.push(v);
      total += v;
    }
    row.push(total);
    weeklyAoa.push(row);
  }
  const wsWeekly = XLSX.utils.aoa_to_sheet(weeklyAoa);
  wsWeekly["!cols"] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 8 },
    ...weeks.map(() => ({ wch: 11 })),
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsWeekly, "Mingguan");

  // === Sheet 4: Bulanan ===
  const monthlyAoa: (string | number)[][] = [
    ["Bulan", "Kode Item", "Nama Item", "Unit", "Qty Total", "Hari Operasional"]
  ];
  for (const r of monthly) {
    monthlyAoa.push([
      r.month,
      r.item_code,
      r.item_name,
      r.unit,
      Number(r.qty_total),
      r.days_count
    ]);
  }
  const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyAoa);
  wsMonthly["!cols"] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 28 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMonthly, "Bulanan");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const u8 = new Uint8Array(buf as ArrayBuffer);

  const filename = `forecast-${(supMeta?.name ?? targetSupplierId ?? "supplier")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}-90d.xlsx`;

  return new NextResponse(u8, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
