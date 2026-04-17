// ============================================================================
// Hari libur nasional Indonesia 2026–2028
// Source: estimasi resmi SKB Menag/Menaker/Menpan-RB (cek ulang tiap awal tahun).
// ============================================================================

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export const HOLIDAYS: Holiday[] = [
  // 2026
  { date: "2026-01-01", name: "Tahun Baru Masehi" },
  { date: "2026-02-17", name: "Tahun Baru Imlek 2577 Kongzili" },
  { date: "2026-03-18", name: "Hari Raya Nyepi (Tahun Baru Saka 1948)" },
  { date: "2026-03-19", name: "Isra Mikraj Nabi Muhammad SAW" },
  { date: "2026-03-20", name: "Hari Raya Idul Fitri 1447H" },
  { date: "2026-03-21", name: "Hari Raya Idul Fitri 1447H" },
  { date: "2026-04-03", name: "Wafat Isa Almasih" },
  { date: "2026-04-05", name: "Hari Paskah" },
  { date: "2026-05-01", name: "Hari Buruh Internasional" },
  { date: "2026-05-14", name: "Kenaikan Isa Almasih" },
  { date: "2026-05-24", name: "Pentakosta" },
  { date: "2026-05-26", name: "Hari Raya Waisak 2570 BE" },
  { date: "2026-05-27", name: "Hari Raya Idul Adha 1447H" },
  { date: "2026-06-01", name: "Hari Lahir Pancasila" },
  { date: "2026-06-17", name: "Tahun Baru Islam 1448H" },
  { date: "2026-08-17", name: "HUT Kemerdekaan RI" },
  { date: "2026-08-25", name: "Maulid Nabi Muhammad SAW" },
  { date: "2026-12-25", name: "Hari Natal" },

  // 2027
  { date: "2027-01-01", name: "Tahun Baru Masehi" },
  { date: "2027-02-06", name: "Tahun Baru Imlek 2578 Kongzili" },
  { date: "2027-03-09", name: "Isra Mikraj Nabi Muhammad SAW" },
  { date: "2027-03-09", name: "Hari Raya Nyepi (Tahun Baru Saka 1949)" },
  { date: "2027-03-10", name: "Hari Raya Idul Fitri 1448H" },
  { date: "2027-03-11", name: "Hari Raya Idul Fitri 1448H" },
  { date: "2027-03-26", name: "Wafat Isa Almasih" },
  { date: "2027-05-01", name: "Hari Buruh Internasional" },
  { date: "2027-05-06", name: "Kenaikan Isa Almasih" },
  { date: "2027-05-14", name: "Hari Raya Waisak 2571 BE" },
  { date: "2027-05-17", name: "Hari Raya Idul Adha 1448H" },
  { date: "2027-06-01", name: "Hari Lahir Pancasila" },
  { date: "2027-06-06", name: "Tahun Baru Islam 1449H" },
  { date: "2027-08-15", name: "Maulid Nabi Muhammad SAW" },
  { date: "2027-08-17", name: "HUT Kemerdekaan RI" },
  { date: "2027-12-25", name: "Hari Natal" },

  // 2028
  { date: "2028-01-01", name: "Tahun Baru Masehi" },
  { date: "2028-01-26", name: "Tahun Baru Imlek 2579 Kongzili" },
  { date: "2028-02-26", name: "Isra Mikraj Nabi Muhammad SAW" },
  { date: "2028-02-27", name: "Hari Raya Nyepi (Tahun Baru Saka 1950)" },
  { date: "2028-02-26", name: "Hari Raya Idul Fitri 1449H" },
  { date: "2028-02-27", name: "Hari Raya Idul Fitri 1449H" },
  { date: "2028-04-14", name: "Wafat Isa Almasih" },
  { date: "2028-05-01", name: "Hari Buruh Internasional" },
  { date: "2028-05-04", name: "Hari Raya Waisak 2572 BE" },
  { date: "2028-05-25", name: "Kenaikan Isa Almasih" },
  { date: "2028-05-26", name: "Hari Raya Idul Adha 1449H" },
  { date: "2028-06-01", name: "Hari Lahir Pancasila" },
  { date: "2028-06-25", name: "Tahun Baru Islam 1450H" },
  { date: "2028-08-17", name: "HUT Kemerdekaan RI" },
  { date: "2028-09-03", name: "Maulid Nabi Muhammad SAW" },
  { date: "2028-12-25", name: "Hari Natal" }
];

const HOLIDAY_MAP = new Map<string, string>();
for (const h of HOLIDAYS) {
  if (!HOLIDAY_MAP.has(h.date)) HOLIDAY_MAP.set(h.date, h.name);
}

export function getHoliday(iso: string): string | null {
  return HOLIDAY_MAP.get(iso) ?? null;
}

export function holidaysInRange(startIso: string, endIso: string): Holiday[] {
  return HOLIDAYS.filter((h) => h.date >= startIso && h.date <= endIso);
}
