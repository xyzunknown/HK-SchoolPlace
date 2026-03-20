-- HKSchoolPlace MVP database schema
-- Target: PostgreSQL / Supabase

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null,
  display_name text,
  phone text,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name_zh text not null,
  name_en text,
  normalized_name text not null,
  stage text not null check (stage in ('kg', 'primary', 'secondary')),
  district text not null,
  address_zh text,
  address_en text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  phone text,
  website text,
  school_type text,
  session_type text,
  school_net text,
  band text,
  tuition_fee numeric(10, 2),
  curriculum text,
  is_scheme_participant boolean,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_schools_stage on public.schools(stage);
create index if not exists idx_schools_district on public.schools(district);
create index if not exists idx_schools_is_active on public.schools(is_active);
create index if not exists idx_schools_normalized_name on public.schools(normalized_name);

create table if not exists public.vacancies (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  grade text not null,
  status text not null check (status in ('available', 'waiting', 'full', 'unknown')),
  count integer,
  source text not null,
  source_url text,
  effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_stale boolean not null default false,
  constraint vacancies_count_non_negative check (count is null or count >= 0),
  constraint vacancies_unique_school_grade_source unique (school_id, grade, source)
);

create index if not exists idx_vacancies_school_id on public.vacancies(school_id);
create index if not exists idx_vacancies_status on public.vacancies(status);
create index if not exists idx_vacancies_updated_at on public.vacancies(updated_at desc);

create table if not exists public.school_alias (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  alias_name text not null,
  normalized_alias_name text not null,
  source text not null,
  created_at timestamptz not null default now(),
  constraint school_alias_unique_name_source unique (normalized_alias_name, source)
);

create index if not exists idx_school_alias_school_id on public.school_alias(school_id);
create index if not exists idx_school_alias_normalized_name on public.school_alias(normalized_alias_name);

create table if not exists public.raw_data (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_type text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  status text not null check (status in ('success', 'fail')),
  error_message text
);

create index if not exists idx_raw_data_source on public.raw_data(source);
create index if not exists idx_raw_data_fetched_at on public.raw_data(fetched_at desc);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  run_type text not null,
  status text not null check (status in ('running', 'success', 'partial_success', 'fail')),
  records_fetched integer not null default 0,
  records_parsed integer not null default 0,
  records_matched integer not null default 0,
  records_updated integer not null default 0,
  message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_sync_logs_source on public.sync_logs(source);
create index if not exists idx_sync_logs_started_at on public.sync_logs(started_at desc);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorites_unique_user_school unique (user_id, school_id)
);

create index if not exists idx_favorites_user_id on public.favorites(user_id);
create index if not exists idx_favorites_school_id on public.favorites(school_id);

create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint comparisons_unique_user_school unique (user_id, school_id)
);

create index if not exists idx_comparisons_user_id on public.comparisons(user_id);
create index if not exists idx_comparisons_school_id on public.comparisons(school_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_schools_set_updated_at on public.schools;
create trigger trg_schools_set_updated_at
before update on public.schools
for each row
execute function public.set_updated_at();

comment on table public.schools is 'School master data';
comment on table public.vacancies is 'Vacancy records from external sources';
comment on table public.school_alias is 'Alias mapping used for name matching';
comment on table public.raw_data is 'Raw crawler payloads for replay/debug';
comment on table public.sync_logs is 'Crawler sync execution logs';
comment on table public.favorites is 'User favorite schools';
comment on table public.comparisons is 'User comparison list';

-- ============================================================
-- unmatched_records: 保存抓取过程中无法匹配的记录，等待人工处理
-- ============================================================

create table if not exists public.unmatched_records (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  raw_name text not null,
  normalized_name text not null,
  stage text,
  district text,
  grade text,
  suggested_school_id uuid references public.schools(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'ignored')),
  resolved_school_id uuid references public.schools(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_unmatched_records_status on public.unmatched_records(status);
create index if not exists idx_unmatched_records_source on public.unmatched_records(source);
create index if not exists idx_unmatched_records_created_at on public.unmatched_records(created_at desc);

comment on table public.unmatched_records is 'Unmatched crawler records pending manual resolution';

-- ============================================================
-- comparisons limit trigger: 每个用户最多 5 条对比记录
-- ============================================================

create or replace function public.check_comparison_limit()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from public.comparisons
  where user_id = new.user_id;

  if current_count >= 5 then
    raise exception 'comparison limit reached: maximum 5 schools per user';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_comparisons_check_limit on public.comparisons;
create trigger trg_comparisons_check_limit
before insert on public.comparisons
for each row
execute function public.check_comparison_limit();

-- ============================================================
-- vacancies updated_at auto-update trigger
-- ============================================================

drop trigger if exists trg_vacancies_set_updated_at on public.vacancies;
create trigger trg_vacancies_set_updated_at
before update on public.vacancies
for each row
execute function public.set_updated_at();
