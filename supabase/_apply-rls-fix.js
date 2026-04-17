#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Idempotent fix untuk migration 0019 (RLS align calendar writers).
// Memastikan admin/operator/ahli_gizi bisa nulis ke non_op_days & school_attendance.
//
// Usage:
//   DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres" \
//     node supabase/_apply-rls-fix.js
//
// Atau pakai pooler (disarankan untuk koneksi dari luar):
//   DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres" \
//     node supabase/_apply-rls-fix.js
//
// Cara dapet password: Supabase Dashboard → Project Settings → Database → Connection string.

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

const FIX_SQL = `
-- 0019 · align RLS write policies with calendar UI role matrix (idempoten)
drop policy if exists "nonop: op/admin write" on public.non_op_days;
drop policy if exists "nonop: op/gz/admin write" on public.non_op_days;
create policy "nonop: op/gz/admin write" on public.non_op_days
  for all using (public.current_role() in ('admin','operator','ahli_gizi'))
  with check (public.current_role() in ('admin','operator','ahli_gizi'));

drop policy if exists "sch_att: operator write" on public.school_attendance;
drop policy if exists "sch_att: op/gz/admin write" on public.school_attendance;
create policy "sch_att: op/gz/admin write" on public.school_attendance
  for all using (public.current_role() in ('admin','operator','ahli_gizi'))
  with check (public.current_role() in ('admin','operator','ahli_gizi'));
`;

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL belum di-set.");
    console.error("");
    console.error("Cara cepat:");
    console.error("  1. Buka https://supabase.com/dashboard/project/ubqxxsmrntdrdamlclus/settings/database");
    console.error("  2. Scroll ke 'Connection string' → pilih 'URI' → copy (password-nya auto-filled)");
    console.error("  3. Tambahin ke .env.local:");
    console.error("       DATABASE_URL=\"postgresql://postgres.ubqxxsmrntdrdamlclus:<PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres\"");
    console.error("  4. Re-run: node supabase/_apply-rls-fix.js");
    process.exit(1);
  }

  console.log("▶ Connecting ke Supabase…");
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    console.log("▶ Applying RLS fix (non_op_days + school_attendance)…");
    await client.query(FIX_SQL);

    const { rows } = await client.query(`
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and tablename in ('non_op_days','school_attendance')
      order by tablename, policyname
    `);
    console.log("\n✓ Done. Policy aktif sekarang:");
    for (const r of rows) console.log(`   · ${r.tablename} → ${r.policyname}`);
  } catch (err) {
    console.error("✗ Failed:", err.message);
    if (err.hint) console.error("  hint:", err.hint);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
