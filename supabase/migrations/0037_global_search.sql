-- =============================================================================
-- 0037 · Global search RPC (cross-table) untuk command palette (cmd-K)
-- -----------------------------------------------------------------------------
-- App sudah 14 halaman. Operator sering cari "PO-2026-014" atau "Beras Putih"
-- atau "SUP-03 Mega Mart" — butuh satu endpoint yang jelajah semua entitas.
-- =============================================================================

create or replace function public.global_search(
  p_query text,
  p_limit int default 20
)
returns table (
  kind text,              -- 'po','grn','invoice','qt','pr','item','supplier','menu','school','delivery'
  id text,
  title text,
  subtitle text,
  url text,
  score real
)
language sql stable as $$
  with q as (
    select trim(coalesce(p_query, '')) as s,
           ('%' || trim(coalesce(p_query, '')) || '%') as like_s
  )
  (
    select 'po' as kind,
           p.no as id,
           p.no as title,
           s.name || ' · Rp ' || to_char(p.total, 'FM999G999G999') as subtitle,
           '/procurement' as url,
           similarity(p.no, (select s from q)) as score
      from public.purchase_orders p
      left join public.suppliers s on s.id = p.supplier_id,
           q
     where p.no ilike q.like_s or s.name ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'grn',
           g.no,
           g.no,
           coalesce(g.po_no, '—') || ' · ' || g.status::text,
           '/procurement',
           similarity(g.no, (select s from q))
      from public.grns g, q
     where g.no ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'invoice',
           i.no,
           i.no,
           s.name || ' · Rp ' || to_char(i.total, 'FM999G999G999') ||
             ' · ' || i.status::text,
           '/procurement',
           similarity(i.no, (select s from q))
      from public.invoices i
      left join public.suppliers s on s.id = i.supplier_id,
           q
     where i.no ilike q.like_s or s.name ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'qt',
           qt.no,
           qt.no,
           s.name || ' · ' || qt.status::text,
           '/procurement',
           similarity(qt.no, (select s from q))
      from public.quotations qt
      left join public.suppliers s on s.id = qt.supplier_id,
           q
     where qt.no ilike q.like_s or s.name ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'pr',
           pr.no,
           pr.no,
           coalesce(pr.notes, pr.status) || ' · ' || pr.need_date::text,
           '/procurement',
           similarity(pr.no, (select s from q))
      from public.purchase_requisitions pr, q
     where pr.no ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'item',
           it.code,
           it.code,
           coalesce(it.name_en, '') || ' · ' || it.unit || ' · ' || it.category::text,
           '/stock',
           similarity(it.code, (select s from q))
      from public.items it, q
     where it.code ilike q.like_s or coalesce(it.name_en, '') ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'supplier',
           sp.id,
           sp.name,
           sp.id || ' · ' || sp.type::text || coalesce(' · ' || sp.commodity, ''),
           '/suppliers/' || sp.id,
           similarity(sp.name, (select s from q))
      from public.suppliers sp, q
     where sp.name ilike q.like_s or sp.id ilike q.like_s
        or coalesce(sp.commodity, '') ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'menu',
           m.id::text,
           'Menu ' || m.id::text || ' · ' || m.name,
           coalesce(m.name_en, ''),
           '/menu',
           similarity(m.name, (select s from q))
      from public.menus m, q
     where m.name ilike q.like_s or coalesce(m.name_en, '') ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'school',
           sc.id,
           sc.name,
           sc.id || ' · ' || sc.level::text,
           '/schools',
           similarity(sc.name, (select s from q))
      from public.schools sc, q
     where sc.name ilike q.like_s or sc.id ilike q.like_s
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'delivery',
           d.no,
           d.no,
           d.delivery_date::text || ' · ' || d.status::text,
           '/deliveries',
           similarity(d.no, (select s from q))
      from public.deliveries d, q
     where d.no ilike q.like_s
     limit greatest(p_limit, 1)
  )
  order by score desc nulls last
  limit greatest(p_limit, 1) * 3;
$$;

-- pg_trgm diperlukan untuk similarity()
create extension if not exists pg_trgm;

grant execute on function public.global_search(text, int) to authenticated;

-- =============================================================================
-- END 0037
-- =============================================================================
