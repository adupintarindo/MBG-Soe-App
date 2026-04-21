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
import { buildStyledXlsxBuffer } from "@/lib/excel-export";
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
  kecil: number;
  besar: number;
  guru: number;
  total: number;
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
        kecil: s.kecil,
        besar: s.besar,
        guru: s.guru,
        total: s.total,
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
    return await buildXlsxResponse(payload);
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

async function buildXlsxResponse(
  data: BreakdownResponse
): Promise<NextResponse> {
  const totalKecil = data.schools.reduce((a, s) => a + s.kecil, 0);
  const totalBesar = data.schools.reduce((a, s) => a + s.besar, 0);
  const totalGuru = data.schools.reduce((a, s) => a + s.guru, 0);
  const totalPorsi = data.schools.reduce((a, s) => a + s.total, 0);
  const totalStudents = data.schools.reduce((a, s) => a + s.students, 0);

  const buffer = await buildStyledXlsxBuffer({
    fileName: `rincian-penerima-${data.date}`,
    sheets: [
      {
        name: "Sekolah",
        title: `RINCIAN SEKOLAH · ${data.date}`,
        subtitle: "Daftar sekolah penerima manfaat pada tanggal operasional",
        columns: [
          { key: "no", header: "No", width: 6, align: "center" },
          { key: "name", header: "Nama Sekolah", width: 36, align: "left" },
          { key: "level", header: "Jenjang", width: 12, align: "center" },
          {
            key: "kecil",
            header: "Porsi Kecil",
            width: 12,
            align: "right",
            numFmt: "#,##0",
            hint: "number"
          },
          {
            key: "besar",
            header: "Porsi Besar",
            width: 12,
            align: "right",
            numFmt: "#,##0",
            hint: "number"
          },
          {
            key: "guru",
            header: "Guru",
            width: 10,
            align: "right",
            numFmt: "#,##0",
            hint: "number"
          },
          {
            key: "total",
            header: "Total Porsi",
            width: 12,
            align: "right",
            numFmt: "#,##0",
            hint: "bold"
          },
          {
            key: "students",
            header: "Jumlah Siswa",
            width: 14,
            align: "right",
            numFmt: "#,##0",
            hint: "number"
          }
        ],
        rows: data.schools.map((s, i) => ({
          no: i + 1,
          name: s.school_name,
          level: s.level,
          kecil: s.kecil,
          besar: s.besar,
          guru: s.guru,
          total: s.total,
          students: s.students
        })),
        totals: {
          labelColSpan: 3,
          labelText: "GRAND TOTAL",
          values: {
            kecil: totalKecil,
            besar: totalBesar,
            guru: totalGuru,
            total: totalPorsi,
            students: totalStudents
          }
        },
        zebra: true,
        freezeHeader: true
      },
      {
        name: "Ibu Hamil",
        title: `RINCIAN IBU HAMIL & MENYUSUI · ${data.date}`,
        subtitle: "Daftar ibu hamil/menyusui penerima manfaat",
        columns: [
          { key: "no", header: "No", width: 6, align: "center" },
          { key: "name", header: "Nama Lengkap", width: 30, align: "left" },
          { key: "nik", header: "NIK", width: 20, align: "left" },
          { key: "phase", header: "Fase", width: 12, align: "center" },
          {
            key: "gest",
            header: "Usia Kehamilan (minggu)",
            width: 18,
            align: "right",
            hint: "number"
          },
          {
            key: "child",
            header: "Usia Anak (bulan)",
            width: 16,
            align: "right",
            hint: "number"
          },
          { key: "age", header: "Umur", width: 8, align: "right", hint: "number" },
          { key: "posyandu", header: "Posyandu", width: 22, align: "left" },
          { key: "address", header: "Alamat", width: 40, align: "left" },
          { key: "phone", header: "Telepon", width: 18, align: "left" }
        ],
        rows: data.pregnant.map((b, i) => ({
          no: i + 1,
          name: b.full_name,
          nik: b.nik ?? "",
          phase: b.phase === "hamil" ? "Hamil" : "Menyusui",
          gest: b.gestational_week ?? "",
          child: b.child_age_months ?? "",
          age: b.age ?? "",
          posyandu: b.posyandu_name ?? "",
          address: b.address ?? "",
          phone: b.phone ?? ""
        })),
        cellHint: (row, key) => {
          if (key !== "phase") return undefined;
          return row.phase === "Hamil" ? "status-neutral" : "status-ok";
        },
        zebra: true,
        freezeHeader: true
      },
      {
        name: "Balita",
        title: `RINCIAN BALITA · ${data.date}`,
        subtitle: "Daftar balita penerima manfaat",
        columns: [
          { key: "no", header: "No", width: 6, align: "center" },
          { key: "name", header: "Nama Lengkap", width: 30, align: "left" },
          { key: "nik", header: "NIK", width: 20, align: "left" },
          { key: "dob", header: "Tanggal Lahir", width: 14, align: "center" },
          { key: "age", header: "Usia", width: 14, align: "center" },
          { key: "gender", header: "Jenis Kelamin", width: 14, align: "center" },
          { key: "mother", header: "Nama Ibu", width: 26, align: "left" },
          { key: "posyandu", header: "Posyandu", width: 22, align: "left" },
          { key: "address", header: "Alamat", width: 40, align: "left" },
          { key: "phone", header: "Telepon", width: 18, align: "left" }
        ],
        rows: data.toddler.map((b, i) => ({
          no: i + 1,
          name: b.full_name,
          nik: b.nik ?? "",
          dob: b.dob ?? "",
          age: ageFromDob(b.dob),
          gender:
            b.gender === "L"
              ? "Laki-laki"
              : b.gender === "P"
                ? "Perempuan"
                : "",
          mother: b.mother_name ?? "",
          posyandu: b.posyandu_name ?? "",
          address: b.address ?? "",
          phone: b.phone ?? ""
        })),
        cellHint: (row, key) => {
          if (key !== "gender") return undefined;
          if (row.gender === "Laki-laki") return "status-neutral";
          if (row.gender === "Perempuan") return "status-ok";
          return undefined;
        },
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
      "Content-Disposition": `attachment; filename="rincian-penerima-${data.date}.xlsx"`,
      "Cache-Control": "no-store"
    }
  });
}
