#!/usr/bin/env bash
# Apply migrasi 0012-0015 ke Supabase project yang sudah ter-link.
# Jalankan dari root folder "MBG Soe App":
#   chmod +x apply-migrations.sh
#   ./apply-migrations.sh

set -euo pipefail

echo "▶ Cek Supabase CLI…"
if ! command -v supabase >/dev/null 2>&1; then
  echo "✗ supabase CLI belum ter-install."
  echo "  macOS : brew install supabase/tap/supabase"
  echo "  Linux/Win: npm i -g supabase"
  exit 1
fi
supabase --version

echo ""
echo "▶ Cek link project…"
if [[ ! -f supabase/.temp/project-ref ]] && [[ ! -f .supabase/project-ref ]]; then
  echo "✗ Project belum ter-link."
  echo "  Jalankan dulu: supabase login && supabase link --project-ref <PROJECT_REF>"
  exit 1
fi

echo ""
echo "▶ Status migrasi sebelum push:"
supabase migration list --linked || true

echo ""
read -rp "Lanjut push migrasi 0012-0015 ke remote? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || { echo "Dibatalkan."; exit 0; }

echo ""
echo "▶ Push…"
supabase db push --linked

echo ""
echo "▶ Status setelah push:"
supabase migration list --linked

echo ""
echo "✓ Selesai. Smoke-test via SQL Editor:"
echo "  select count(*) from menus;                  -- expect 10"
echo "  select count(*) from sop_runs;                -- expect 0"
echo "  select * from sop_compliance_summary(current_date - 90, current_date);"
