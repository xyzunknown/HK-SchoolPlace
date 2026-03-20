-- HKSchoolPlace initial schema

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_provider text not null,
  phone text,
  email text,
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
