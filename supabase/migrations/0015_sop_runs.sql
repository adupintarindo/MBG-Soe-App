-- =============================================================================
-- 0015_sop_runs.sql · SOP execution / compliance log
-- -----------------------------------------------------------------------------
-- Setiap kali operator / ahli gizi menjalankan sebuah SOP di lapangan, sistem
-- mencatat eksekusi tersebut ke `sop_runs`: checklist yang dicentang, risiko
-- yang diamati, catatan evaluator. Ini menjadi audit trail compliance kerja.
--
-- Tabel ini bersifat append-only (tidak ada UPDATE / DELETE via RLS) agar
-- histori eksekusi tidak bisa direvisi setelah fakta.
-- =============================================================================

create table if not exists public.sop_runs (
  id            bigint generated always as identity primary key,
  sop_id        text   not null,        -- e.g. "SOP-OP-01"
  sop_title     text   not null,        -- denormalised untuk resilience saat
                                        -- master sops.ts berubah
  sop_category  text   not null,        -- "OPERASIONAL" | "HIGIENE"
  run_date      date   not null default current_date,
  steps_checked int    not null default 0
                check (steps_checked >= 0),
  steps_total   int    not null default 0
                check (steps_total >= 0),
  risks_flagged text[] not null default '{}',
  notes         text,
  evaluator     text,                    -- nama lengkap operator (cache)
  created_by    uuid   references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists sop_runs_sop_idx  on public.sop_runs (sop_id);
create index if not exists sop_runs_date_idx on public.sop_runs (run_date desc);

alter table public.sop_runs enable row level security;

drop policy if exists "sop_runs: auth read"   on public.sop_runs;
drop policy if exists "sop_runs: role insert" on public.sop_runs;

create policy "sop_runs: auth read" on public.sop_runs
  for select using (auth.uid() is not null);

create policy "sop_runs: role insert" on public.sop_runs
  for insert
  with check (public.current_role() in ('admin', 'operator', 'ahli_gizi'));

-- =============================================================================
-- RPC: log_sop_run — catat eksekusi SOP dari client dengan validasi ringan.
-- Mengembalikan id baris yang baru dibuat.
-- =============================================================================
create or replace function public.log_sop_run(
  p_sop_id        text,
  p_sop_title     text,
  p_sop_category  text,
  p_steps_checked int,
  p_steps_total   int,
  p_risks_flagged text[],
  p_notes         text default null,
  p_run_date      date default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_role();
  v_id bigint;
  v_eval text;
begin
  if v_role not in ('admin', 'operator', 'ahli_gizi') then
    raise exception 'Hanya admin/operator/ahli_gizi yang boleh mencatat eksekusi SOP.';
  end if;
  if p_sop_id is null or length(trim(p_sop_id)) = 0 then
    raise exception 'sop_id wajib diisi.';
  end if;
  if p_steps_checked > p_steps_total then
    raise exception 'steps_checked (%) tidak boleh melebihi steps_total (%).',
      p_steps_checked, p_steps_total;
  end if;

  select full_name into v_eval
    from public.profiles
    where user_id = auth.uid();

  insert into public.sop_runs(
    sop_id, sop_title, sop_category,
    run_date, steps_checked, steps_total, risks_flagged, notes,
    evaluator, created_by
  ) values (
    p_sop_id, p_sop_title, p_sop_category,
    coalesce(p_run_date, current_date),
    coalesce(p_steps_checked, 0),
    coalesce(p_steps_total, 0),
    coalesce(p_risks_flagged, '{}'::text[]),
    nullif(trim(coalesce(p_notes, '')), ''),
    v_eval, auth.uid()
  ) returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_sop_run(
  text, text, text, int, int, text[], text, date
) to authenticated;

-- =============================================================================
-- RPC: list_sop_runs — ambil riwayat eksekusi (opsional filter sop_id).
-- =============================================================================
create or replace function public.list_sop_runs(
  p_sop_id text default null,
  p_limit  int  default 25
)
returns table (
  id            bigint,
  sop_id        text,
  sop_title     text,
  sop_category  text,
  run_date      date,
  steps_checked int,
  steps_total   int,
  risks_flagged text[],
  notes         text,
  evaluator     text,
  created_at    timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select r.id, r.sop_id, r.sop_title, r.sop_category,
         r.run_date, r.steps_checked, r.steps_total,
         r.risks_flagged, r.notes, r.evaluator, r.created_at
  from public.sop_runs r
  where p_sop_id is null or r.sop_id = p_sop_id
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 200));
$$;

grant execute on function public.list_sop_runs(text, int) to authenticated;

-- =============================================================================
-- RPC: sop_compliance_summary — agregasi per SOP dalam rentang tanggal.
-- =============================================================================
create or replace function public.sop_compliance_summary(
  p_start date default null,
  p_end   date default null
)
returns table (
  sop_id           text,
  sop_title        text,
  sop_category     text,
  run_count        int,
  last_run         timestamptz,
  avg_completion   numeric,        -- rata-rata persentase langkah dicentang
  total_risks      int              -- total flag risiko
)
language sql
security definer
set search_path = public
stable
as $$
  with scoped as (
    select *
    from public.sop_runs r
    where (p_start is null or r.run_date >= p_start)
      and (p_end   is null or r.run_date <= p_end)
  )
  select
    sop_id,
    max(sop_title)    as sop_title,
    max(sop_category) as sop_category,
    count(*)::int     as run_count,
    max(created_at)   as last_run,
    round(avg(
      case when steps_total > 0
           then (steps_checked::numeric / steps_total) * 100
           else 0 end
    ), 1) as avg_completion,
    sum(coalesce(array_length(risks_flagged, 1), 0))::int as total_risks
  from scoped
  group by sop_id
  order by max(created_at) desc nulls last;
$$;

grant execute on function public.sop_compliance_summary(date, date) to authenticated;
