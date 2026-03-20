alter table public.vacancies
add column if not exists admin_note text;

create table if not exists public.unmatched_records (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  raw_name text not null,
  normalized_name text not null,
  stage text not null check (stage in ('kg', 'primary', 'secondary')),
  district text,
  grade text,
  suggested_school_id uuid references public.schools(id) on delete set null,
  resolved_school_id uuid references public.schools(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'ignored')),
  raw_data_id uuid references public.raw_data(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_unmatched_records_source on public.unmatched_records(source);
create index if not exists idx_unmatched_records_status on public.unmatched_records(status);
create index if not exists idx_unmatched_records_normalized_name on public.unmatched_records(normalized_name);

drop trigger if exists trg_unmatched_records_set_updated_at on public.unmatched_records;
create trigger trg_unmatched_records_set_updated_at
before update on public.unmatched_records
for each row
execute function public.set_updated_at();
