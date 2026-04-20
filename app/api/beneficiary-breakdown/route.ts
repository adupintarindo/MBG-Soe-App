/**
 * /api/beneficiary-breakdown
 *
 * Rincian penerima manfaat untuk tanggal operasional tertentu.
 *
 * Query params:
 *   date   = YYYY-MM-DD (required)
 *   format = xlsx       (optional — default: JSON)
 *
 * Response JSON:
 *   { date, operasional, schools[], pregnant[], toddler[] }
 *
 * Response XLSX:
 *   workbook dengan 3 sheet: Sekolah, Ibu Hamil, Balita.
 */
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/supabase/auth";
import {
  listBeneficiaryPregnant,
  listBeneficiaryToddler,
  listPosyandu,
  porsiBreakdown,
  schoolsBreakdown,
  type BeneficiaryPregnant,
  type BeneficiaryToddler
} from "@/lib/bgn";

export const dynamic = "force-dynamic";

type SchoolOut = {
  school_id: string;
  school_name: string;
  level: string;
  qty: number;
  students: number;
};

type PregnantOut = {
  id: string;
  full_name: string;
  nik: string | null;
  phase: "hamil" | "menyusui";
  gestational_week: number | null;
  child_age_months: number | null;
  age: number | null;
  posyandu_name: string | null;
  address: string | null;
  phone: string | null;
};

type ToddlerOut = {
  id: string;
  full_name: string;
  nik: string | null;
  dob: string | null;
  gender: "L" | "P" | null;
  mother_name: string | null;
  posyandu_name: string | null;
  address: string | null;
  phone: string | null;
};

type BreakdownResponse = {
  date: string;
  operasional: boolean;
  schools: SchoolOut[];
  pregnant: PregnantOut[];
  toddler: ToddlerOut[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const profile = await getSessionProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();

  if (!ISO_DATE.test(date)) {
    return NextResponse.json(
      { ok: false, error: "date param (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }

  const supabase = createClient();

  const [bd, schoolsRaw, bumilRaw, balitaRaw, posyanduList] = await Promise.all([
    porsiBreakdown(supabase, date).catch(() => null),
    schoolsBreakdown(supabase, date).catch(() => []),
    listBeneficiaryPregnant(supabase, { active: true }).catch(
      () => [] as BeneficiaryPregnant[]
    ),
    listBeneficiaryToddler(supabase, { active: true }).catch(
      () => [] as BeneficiaryToddler[]
    ),
    listPosyandu(supabase).catch(() => [])
  ]);

  const operasional = Boolean(bd?.operasional);
  const posyanduById = new Map(posyanduList.map((p) => [p.id, p.name]));

  const schools: SchoolOut[] = operasional
    ? schoolsRaw.map((s) => ({
        school_id: s.school_id,
        school_name: s.school_name,
        level: s.level,
        qty: s.qty,
        students: s.students
      }))
    : [];

  const pregnant: PregnantOut[] = operasional
    ? bumilRaw.map((b) => ({
        id: b.id,
        full_name: b.full_name,
        nik: b.nik,
        phase: b.phase,
        gestational_week: b.gestational_week,
        child_age_months: b.child_age_months,
        age: b.age,
        posyandu_name: b.posyandu_id
          ? (posyanduById.get(b.posyandu_id) ?? null)
          : null,
        address: b.address,
        phone: b.phone
      }))
    : [];

  const toddler: ToddlerOut[] = operasional
    ? balitaRaw.map((b) => ({
        id: b.id,
        full_name: b.full_name,
        nik: b.nik,
        dob: b.dob,
        gender: b.gender,
        mother_name: b.mother_name,
        posyandu_name: b.posyandu_id
          ? (posyanduById.get(b.posyandu_id) ?? null)
          : null,
        address: b.address,
        phone: b.phone
      }))
    : [];

  const payload: BreakdownResponse = {
    date,
    operasional,
    schools,
    pregnant,
    toddler
  };

  if (format === "xlsx") {
    return buildXlsxResponse(payload);
  }

  return NextResponse.json(payload);
}

function ageFromDob(dob: string | null): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let months =
    (now.getFullYear() - d.getFullYear()) * 12 +
    (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 0) months = 0;
  if (months < 12) return `${months} bln`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years} thn ${rem} bln` : `${years} thn`;
}

function buildXlsxResponse(data: BreakdownResponse): NextResponse {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Sekolah
  const schoolsRows: (string | number)[][] = [
    ["No", "Nama Sekolah", "Jenjang", "Jumlah Porsi", "Jumlah Siswa"]
  ];
  data.schools.forEach((s, i) => {
    schoolsRows.push([i + 1, s.school_name, s.level, s.qty, s.students]);
  });
  const totalQty = data.schools.reduce((a, s) => a + s.qty, 0);
  const totalStudents = data.schools.reduce((a, s) => a + s.students, 0);
  schoolsRows.push(["", "TOTAL", "", totalQty, totalStudents]);
  const sheetSchools = XLSX.utils.aoa_to_sheet(schoolsRows);
  sheetSchools["!cols"] = [
    { wch: 5 },
    { wch: 32 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, sheetSchools, "Sekolah");

  // Sheet 2 — Ibu Hamil / Menyusui
  const bumilRows: (string | number)[][] = [
    [
      "No",
      "Nama Lengkap",
      "NIK",
      "Fase",
      "Usia Kehamilan (minggu)",
      "Usia Anak (bulan)",
      "Umur",
      "Posyandu",
      "Alamat",
      "Telepon"
    ]
  ];
  data.pregnant.forEach((b, i) => {
    bumilRows.push([
      i + 1,
      b.full_name,
      b.nik ?? "",
      b.phase === "hamil" ? "Hamil" : "Menyusui",
      b.gestational_week ?? "",
      b.child_age_months ?? "",
      b.age ?? "",
      b.posyandu_name ?? "",
      b.address ?? "",
      b.phone ?? ""
    ]);
  });
  const sheetBumil = XLSX.utils.aoa_to_sheet(bumilRows);
  sheetBumil["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 8 },
    { wch: 18 },
    { wch: 40 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, sheetBumil, "Ibu Hamil");

  // Sheet 3 — Balita
  const balitaRows: (string | number)[][] = [
    [
      "No",
      "Nama Lengkap",
      "NIK",
      "Tanggal Lahir",
      "Usia",
      "Jenis Kelamin",
      "Nama Ibu",
      "Posyandu",
      "Alamat",
      "Telepon"
    ]
  ];
  data.toddler.forEach((b, i) => {
    balitaRows.push([
      i + 1,
      b.full_name,
      b.nik ?? "",
      b.dob ?? "",
      ageFromDob(b.dob),
      b.gender === "L" ? "Laki-laki" : b.gender === "P" ? "Perempuan" : "",
      b.mother_name ?? "",
      b.posyandu_name ?? "",
      b.address ?? "",
      b.phone ?? ""
    ]);
  });
  const sheetBalita = XLSX.utils.aoa_to_sheet(balitaRows);
  sheetBalita["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 24 },
    { wch: 18 },
    { wch: 40 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, sheetBalita, "Balita");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rincian-penerima-${data.date}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}
