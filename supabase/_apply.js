#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
// Apply supabase/_run_all.sql to the remote Postgres.
// Usage:
//   DATABASE_URL="postgresql://..." node supabase/_apply.js
// The SQL file is executed as a single multi-statement payload inside a
// transaction (the file itself starts with `begin;` / ends with `commit;`).

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL env var required");
    process.exit(1);
  }
  const sqlPath = path.join(__dirname, "_run_all.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  console.log(`applying ${sqlPath} (${sql.length} bytes)…`);

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
  const t0 = Date.now();
  await client.connect();
  try {
    await client.query(sql);
    console.log(`✓ applied in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error("✗ failed:", err.message);
    if (err.position) console.error("  position:", err.position);
    if (err.hint) console.error("  hint:", err.hint);
    if (err.where) console.error("  where:", err.where);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
