#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// ============================================================================
// MBG Soe · BGN forms demo seeder
// ----------------------------------------------------------------------------
// Mengisi tabel BGN yang belum tersentuh seeder lain:
//   - posyandu, pic_school
//   - beneficiary_pregnant, beneficiary_toddler
//   - daily_cash_log, petty_cash, gl_entry
//   - payroll_period, payroll_attendance, payroll_slip
//   - kader_incentive, pic_incentive
// Idempotent: upsert / soft-skip kalau sudah ada.
// ============================================================================
const { createClient } = require("@supabase/supabase-js");

function iso(d) {
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}
function randInt(lo, hi) {
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ env NEXT_PUBLIC_SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY wajib.");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ---- 1. Posyandu -------------------------------------------------------
  console.log("→ posyandu");
  const posyanduSeed = [
    { name: "Posyandu Mawar Merah", village: "Nunumeu", district: "Amanuban Tengah" },
    { name: "Posyandu Anggrek Putih", village: "Taiftob", district: "Amanuban Tengah" },
    { name: "Posyandu Melati Biru", village: "Oeekam", district: "Amanuban Tengah" },
    { name: "Posyandu Dahlia Kuning", village: "Bena", district: "Amanuban Tengah" },
    { name: "Posyandu Cempaka Hijau", village: "Polo", district: "Amanuban Tengah" }
  ];
  const { data: existingPos } = await sb.from("posyandu").select("id,name");
  const posByName = new Map((existingPos ?? []).map((p) => [p.name, p.id]));
  const toInsPos = posyanduSeed.filter((p) => !posByName.has(p.name));
  if (toInsPos.length) {
    const { data, error } = await sb.from("posyandu").insert(toInsPos).select("id,name");
    if (error) throw error;
    data.forEach((p) => posByName.set(p.name, p.id));
  }
  console.log(`  posyandu: ${posByName.size}`);

  // ---- 2. PIC school ------------------------------------------------------
  console.log("→ pic_school");
  const { data: schools } = await sb.from("schools").select("id,name").order("id");
  const { data: staffAll } = await sb
    .from("sppg_staff")
    .select("id,full_name,role,seq_no")
    .eq("active", true)
    .order("seq_no");
  if (!schools?.length || !staffAll?.length) throw new Error("schools/staff kosong");
  // Pilih staff role 'distribusi' atau 'pemorsian' sbg PIC
  const picCandidates = staffAll.filter((s) =>
    ["distribusi", "pemorsian", "pengemasan"].includes(s.role)
  );
  const { data: existingPic } = await sb.from("pic_school").select("school_id");
  const picSet = new Set((existingPic ?? []).map((r) => r.school_id));
  const picToInsert = schools
    .filter((s) => !picSet.has(s.id))
    .map((s, i) => ({
      school_id: s.id,
      pic_staff_id: picCandidates[i % picCandidates.length].id,
      active: true,
      start_date: iso(addDays(today, -60))
    }));
  if (picToInsert.length) {
    const { error } = await sb.from("pic_school").insert(picToInsert);
    if (error) throw error;
  }
  console.log(`  pic_school: ${schools.length} schools mapped`);

  // ---- 3. Beneficiary pregnant -------------------------------------------
  console.log("→ beneficiary_pregnant");
  const { count: pregCount } = await sb
    .from("beneficiary_pregnant")
    .select("*", { count: "exact", head: true });
  if ((pregCount ?? 0) < 10) {
    const namesH = [
      "Maria Sonbai",
      "Yuliana Taneo",
      "Anita Kollo",
      "Rina Taetus",
      "Sonya Taneo",
      "Dewi Nuban",
      "Juliana Tefa",
      "Emi Benu",
      "Marta Atty",
      "Lina Saekoko"
    ];
    const namesM = [
      "Selvi Selan",
      "Dina Boymau",
      "Ester Taes",
      "Herlina Taolin",
      "Vera Tamonop"
    ];
    const posIds = Array.from(posByName.values());
    const rows = [
      ...namesH.map((n) => ({
        full_name: n,
        nik: String(5300000000000000n + BigInt(randInt(1000, 9999))),
        phase: "hamil",
        gestational_week: randInt(8, 36),
        age: randInt(22, 38),
        posyandu_id: pick(posIds),
        address: "Desa " + pick(["Nunumeu", "Taiftob", "Oeekam", "Bena", "Polo"]),
        phone: "0812" + String(randInt(10000000, 99999999))
      })),
      ...namesM.map((n) => ({
        full_name: n,
        phase: "menyusui",
        child_age_months: randInt(1, 23),
        age: randInt(24, 40),
        posyandu_id: pick(posIds),
        address: "Desa " + pick(["Nunumeu", "Taiftob", "Oeekam"]),
        phone: "0813" + String(randInt(10000000, 99999999))
      }))
    ];
    const { error } = await sb.from("beneficiary_pregnant").insert(rows);
    if (error) throw error;
    console.log(`  bumil+busui: ${rows.length}`);
  } else {
    console.log(`  bumil+busui: ${pregCount} (sudah ada, skip)`);
  }

  // ---- 4. Beneficiary toddler --------------------------------------------
  console.log("→ beneficiary_toddler");
  const { count: todCount } = await sb
    .from("beneficiary_toddler")
    .select("*", { count: "exact", head: true });
  if ((todCount ?? 0) < 15) {
    const firstNames = [
      "Yakobus",
      "Elisabeth",
      "Samuel",
      "Theresa",
      "Joshua",
      "Abigail",
      "Nathan",
      "Rahel",
      "Gabriel",
      "Anugerah",
      "Yonatan",
      "Grace",
      "David",
      "Michelle",
      "Andreas",
      "Sofia",
      "Benyamin",
      "Angelina",
      "Kevin",
      "Rosalina"
    ];
    const lastNames = ["Atty", "Bani", "Tamonop", "Saekoko", "Nesimnasi", "Nuban", "Tefi", "Benu", "Selan", "Tahun"];
    const posIds = Array.from(posByName.values());
    const mothers = [
      "Maria Sonbai",
      "Yuliana Taneo",
      "Anita Kollo",
      "Selvi Selan",
      "Dina Boymau"
    ];
    const rows = [];
    for (let i = 0; i < 25; i++) {
      const ageM = randInt(6, 59);
      const dob = addDays(today, -ageM * 30 - randInt(0, 28));
      rows.push({
        full_name: `${pick(firstNames)} ${pick(lastNames)}`,
        nik: String(5300000000000000n + BigInt(randInt(1000, 99999))),
        dob: iso(dob),
        gender: pick(["L", "P"]),
        mother_name: pick(mothers),
        posyandu_id: pick(posIds),
        address: "Desa " + pick(["Nunumeu", "Taiftob", "Oeekam", "Bena", "Polo"]),
        phone: "0852" + String(randInt(10000000, 99999999))
      });
    }
    const { error } = await sb.from("beneficiary_toddler").insert(rows);
    if (error) throw error;
    console.log(`  balita: ${rows.length}`);
  } else {
    console.log(`  balita: ${todCount} (sudah ada, skip)`);
  }

  // ---- 5. Daily cash log -------------------------------------------------
  console.log("→ daily_cash_log");
  const { count: dclCount } = await sb
    .from("daily_cash_log")
    .select("*", { count: "exact", head: true });
  if ((dclCount ?? 0) < 10) {
    const rows = [];
    let saldo = 5_000_000;
    for (let i = 30; i >= 1; i--) {
      if (i % 7 === 0) continue;
      const masuk = i === 30 ? 15_000_000 : randInt(0, 1) ? randInt(500_000, 3_000_000) : 0;
      const keluar = randInt(200_000, 1_800_000);
      saldo = saldo + masuk - keluar;
      rows.push({
        log_date: iso(addDays(today, -i)),
        log_time: `${String(randInt(8, 16)).padStart(2, "0")}:${String(randInt(0, 59)).padStart(2, "0")}`,
        uang_masuk: masuk,
        uang_keluar: keluar,
        saldo_akhir: saldo,
        keterangan: pick([
          "Belanja harian supplier",
          "Top-up kas operasional",
          "Bayar transport distribusi",
          "Beli bumbu tambahan",
          "Ongkos angkut GRN",
          "Setoran dari bendahara"
        ]),
        category: pick(["5100", "5110", "5120", "5130"])
      });
    }
    const { error } = await sb.from("daily_cash_log").insert(rows);
    if (error) throw error;
    console.log(`  daily_cash_log: ${rows.length}`);
  } else {
    console.log(`  daily_cash_log: ${dclCount} (sudah ada, skip)`);
  }

  // ---- 6. Petty cash -----------------------------------------------------
  console.log("→ petty_cash");
  const { count: pcCount } = await sb.from("petty_cash").select("*", { count: "exact", head: true });
  if ((pcCount ?? 0) < 10) {
    let bal = 2_000_000;
    const rows = [];
    for (let i = 45; i >= 1; i--) {
      if (Math.random() > 0.4) continue;
      const dir = Math.random() < 0.25 ? "masuk" : "keluar";
      const amount = dir === "masuk" ? randInt(500_000, 1_500_000) : randInt(25_000, 350_000);
      bal = dir === "masuk" ? bal + amount : bal - amount;
      rows.push({
        tx_date: iso(addDays(today, -i)),
        tx_time: `${String(randInt(8, 16)).padStart(2, "0")}:${String(randInt(0, 59)).padStart(2, "0")}`,
        direction: dir,
        amount,
        description:
          dir === "masuk"
            ? "Top-up kas kecil"
            : pick([
                "Beli pulsa pulsa koordinasi",
                "Fotokopi dokumen",
                "Gas LPG 3kg",
                "Air minum kemasan",
                "Sabun cuci piring",
                "Masker + sarung tangan",
                "Kantong plastik pembungkus"
              ]),
        balance_after: bal
      });
    }
    if (rows.length) {
      const { error } = await sb.from("petty_cash").insert(rows);
      if (error) throw error;
    }
    console.log(`  petty_cash: ${rows.length}`);
  } else {
    console.log(`  petty_cash: ${pcCount} (sudah ada, skip)`);
  }

  // ---- 7. GL entry -------------------------------------------------------
  console.log("→ gl_entry");
  const { data: coa } = await sb.from("chart_of_accounts").select("code,name,kind");
  const { count: glCount } = await sb.from("gl_entry").select("*", { count: "exact", head: true });
  if ((glCount ?? 0) < 10 && coa?.length) {
    const kas = coa.find((c) => c.code === "1100") ?? coa[0];
    const bank = coa.find((c) => c.code === "1110") ?? coa[0];
    const bebans = coa.filter((c) => c.kind === "beban" || c.code?.startsWith("5"));
    const pendapatans = coa.filter((c) => c.kind === "pendapatan" || c.code?.startsWith("4"));
    const rows = [];
    for (let i = 25; i >= 1; i--) {
      if (Math.random() > 0.7) continue;
      const isBeban = Math.random() < 0.75;
      if (isBeban && bebans.length) {
        const b = pick(bebans);
        rows.push({
          entry_date: iso(addDays(today, -i)),
          description: `Pembebanan ${b.name}`,
          debit_account: b.code,
          credit_account: (Math.random() < 0.5 ? kas : bank).code,
          amount: randInt(250_000, 4_500_000),
          source_type: "manual"
        });
      } else if (pendapatans.length) {
        const p = pick(pendapatans);
        rows.push({
          entry_date: iso(addDays(today, -i)),
          description: `Penerimaan ${p.name}`,
          debit_account: (Math.random() < 0.5 ? kas : bank).code,
          credit_account: p.code,
          amount: randInt(2_000_000, 12_000_000),
          source_type: "manual"
        });
      }
    }
    if (rows.length) {
      const { error } = await sb.from("gl_entry").insert(rows);
      if (error) throw error;
    }
    console.log(`  gl_entry: ${rows.length}`);
  } else {
    console.log(`  gl_entry: ${glCount} (sudah ada / coa kosong, skip)`);
  }

  // ---- 8. Payroll period + attendance + slip ------------------------------
  console.log("→ payroll_period/attendance/slip");
  const { count: ppCount } = await sb
    .from("payroll_period")
    .select("*", { count: "exact", head: true });
  let periods = [];
  if ((ppCount ?? 0) < 2) {
    const periodDefs = [
      {
        start: addDays(today, -45),
        end: addDays(today, -32),
        status: "paid"
      },
      {
        start: addDays(today, -31),
        end: addDays(today, -18),
        status: "paid"
      },
      {
        start: addDays(today, -17),
        end: addDays(today, -4),
        status: "finalized"
      }
    ];
    const toIns = periodDefs.map((p) => ({
      period_label: `${p.start.getDate()} ${p.start.toLocaleDateString("id-ID", { month: "short" })} – ${p.end.getDate()} ${p.end.toLocaleDateString("id-ID", { month: "short" })} ${p.end.getFullYear()}`,
      start_date: iso(p.start),
      end_date: iso(p.end),
      status: p.status,
      finalized_at: p.status !== "draft" ? new Date(p.end).toISOString() : null,
      paid_at: p.status === "paid" ? new Date(addDays(p.end, 2)).toISOString() : null
    }));
    const { data, error } = await sb.from("payroll_period").insert(toIns).select("*");
    if (error) throw error;
    periods = data;
  } else {
    const { data } = await sb
      .from("payroll_period")
      .select("*")
      .order("start_date", { ascending: true });
    periods = data ?? [];
  }
  console.log(`  payroll_period: ${periods.length}`);

  // Attendance: hanya untuk period aktif terakhir (status finalized) supaya cepat
  const latestPeriod = periods[periods.length - 1];
  const { count: atCount } = await sb
    .from("payroll_attendance")
    .select("*", { count: "exact", head: true })
    .eq("period_id", latestPeriod.id);
  if ((atCount ?? 0) === 0) {
    const rows = [];
    const start = new Date(latestPeriod.start_date);
    const end = new Date(latestPeriod.end_date);
    for (const s of staffAll) {
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dow = d.getDay();
        let status;
        if (dow === 0) status = "OFF";
        else {
          const roll = Math.random();
          status = roll < 0.88 ? "H" : roll < 0.94 ? "S" : roll < 0.98 ? "I" : "A";
        }
        rows.push({
          period_id: latestPeriod.id,
          staff_id: s.id,
          attendance_date: iso(d),
          status,
          lembur_hours: status === "H" && Math.random() < 0.15 ? randInt(1, 3) : 0
        });
      }
    }
    // insert in chunks of 500
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await sb.from("payroll_attendance").insert(chunk);
      if (error) throw error;
    }
    console.log(`  payroll_attendance: ${rows.length}`);
  } else {
    console.log(`  payroll_attendance: ${atCount} (sudah ada, skip)`);
  }

  // Slip gaji untuk latestPeriod
  const { count: slipCount } = await sb
    .from("payroll_slip")
    .select("*", { count: "exact", head: true })
    .eq("period_id", latestPeriod.id);
  if ((slipCount ?? 0) === 0) {
    const { data: staffFull } = await sb
      .from("sppg_staff")
      .select("id,full_name,gaji_pokok")
      .eq("active", true);
    const rows = staffFull.map((s) => {
      const gaji = Number(s.gaji_pokok || 2_000_000);
      const hariKerja = randInt(10, 14);
      const upahHari = Math.round(gaji / 14);
      const nilai = upahHari * hariKerja;
      const tunjangan = 150_000;
      const insKh = hariKerja >= 12 ? 200_000 : 0;
      const lembur = randInt(0, 4);
      const upahLembur = Math.round((upahHari / 8) * 1.5);
      const totalLembur = lembur * upahLembur;
      const bpjsKes = Math.round(nilai * 0.01);
      const bpjsTk = Math.round(nilai * 0.02);
      const kotor = nilai + tunjangan + insKh + totalLembur;
      const potongan = bpjsKes + bpjsTk;
      const bersih = kotor - potongan;
      return {
        period_id: latestPeriod.id,
        staff_id: s.id,
        gaji_pokok: gaji,
        hari_kerja: hariKerja,
        upah_per_hari: upahHari,
        nilai_gaji: nilai,
        tunjangan,
        insentif_kehadiran: insKh,
        insentif_kinerja: 0,
        lain_lain: 0,
        lembur_jam: lembur,
        upah_lembur_jam: upahLembur,
        total_lembur: totalLembur,
        potongan_kehadiran: 0,
        potongan_bpjs_kes: bpjsKes,
        potongan_bpjs_tk: bpjsTk,
        potongan_lain: 0,
        penerimaan_kotor: kotor,
        penerimaan_bersih: bersih,
        paid: latestPeriod.status === "paid",
        paid_at: latestPeriod.paid_at,
        transfer_ref: latestPeriod.status === "paid" ? `TRF-${String(randInt(1000, 9999))}` : null
      };
    });
    const { error } = await sb.from("payroll_slip").insert(rows);
    if (error) throw error;
    console.log(`  payroll_slip: ${rows.length}`);
  } else {
    console.log(`  payroll_slip: ${slipCount} (sudah ada, skip)`);
  }

  // ---- 9. Kader incentive ------------------------------------------------
  console.log("→ kader_incentive");
  const { count: kiCount } = await sb
    .from("kader_incentive")
    .select("*", { count: "exact", head: true });
  if ((kiCount ?? 0) < 4) {
    const posIds = Array.from(posByName.values());
    const kaderCandidates = staffAll.filter((s) =>
      ["pengemasan", "distribusi", "sanitasi"].includes(s.role)
    );
    const rows = [];
    for (let pi = 0; pi < periods.length; pi++) {
      const p = periods[pi];
      for (let i = 0; i < Math.min(4, posIds.length); i++) {
        rows.push({
          posyandu_id: posIds[i],
          kader_staff_id: kaderCandidates[(pi + i) % kaderCandidates.length]?.id,
          period_start: p.start_date,
          period_end: p.end_date,
          porsi_senin: randInt(40, 75),
          porsi_kamis: randInt(40, 75),
          unit_cost: 3000,
          paid: p.status === "paid",
          paid_at: p.paid_at
        });
      }
    }
    const { error } = await sb.from("kader_incentive").insert(rows);
    if (error) throw error;
    console.log(`  kader_incentive: ${rows.length}`);
  } else {
    console.log(`  kader_incentive: ${kiCount} (sudah ada, skip)`);
  }

  // ---- 10. PIC incentive -------------------------------------------------
  console.log("→ pic_incentive");
  const { data: picRows } = await sb.from("pic_school").select("id").eq("active", true);
  const { count: piCount } = await sb
    .from("pic_incentive")
    .select("*", { count: "exact", head: true });
  if ((piCount ?? 0) < 5 && picRows?.length) {
    const rows = [];
    for (const p of periods) {
      for (const ps of picRows) {
        rows.push({
          pic_school_id: ps.id,
          period_start: p.start_date,
          period_end: p.end_date,
          total_porsi: randInt(200, 600),
          unit_cost: 2500,
          paid: p.status === "paid",
          paid_at: p.paid_at
        });
      }
    }
    const { error } = await sb.from("pic_incentive").insert(rows);
    if (error) throw error;
    console.log(`  pic_incentive: ${rows.length}`);
  } else {
    console.log(`  pic_incentive: ${piCount} (sudah ada, skip)`);
  }

  console.log("\n✅ BGN demo seed selesai.");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
