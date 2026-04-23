#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Apply migration 0055 (invoice/quotation maintenance RPCs)
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

const PROJECT_REF = "ubqxxsmrntdrdamlclus";

function resolveDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const pw = process.env.SUPABASE_DB_PASSWORD;
  if (!pw) return null;
  const encoded = encodeURIComponent(pw);
  return `postgresql://postgres.${PROJECT_REF}:${encoded}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
}

async function main() {
  loadEnvLocal();
  const url = resolveDbUrl();
  if (!url) {
    console.error("✗ Set SUPABASE_DB_PASSWORD atau DATABASE_URL di .env.local");
    process.exit(1);
  }
  const sqlPath = path.join(
    __dirname,
    "migrations",
    "0055_invoice_qt_maintenance.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  console.log("▶ Applying 0055_invoice_qt_maintenance.sql");

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ Applied.");
  } catch (err) {
    console.error("✗ Failed:", err.message);
    if (err.hint) console.error("  hint:", err.hint);
    if (err.position) console.error("  position:", err.position);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
