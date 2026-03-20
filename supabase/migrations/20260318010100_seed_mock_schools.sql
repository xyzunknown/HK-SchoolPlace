-- Optional local seed data for early development

insert into public.schools (
  id,
  name_zh,
  name_en,
  normalized_name,
  stage,
  district,
  address_zh,
  phone,
  website,
  school_type,
  session_type,
  tuition_fee,
  is_scheme_participant
)
values
  (
    '11111111-1111-1111-1111-111111111001',
    '樂思幼稚園',
    'Joy Think Kindergarten',
    '樂思',
    'kg',
    '九龙城',
    '九龙城示例道 18 号',
    '2345 6789',
    'https://example.edu.hk/joy-think',
    '非牟利',
    '全日',
    2800,
    true
  ),
  (
    '11111111-1111-1111-1111-111111111002',
    '九龙湾官立小学',
    'Kowloon Bay Government Primary School',
    '九龙湾官立',
    'primary',
    '观塘',
    '观塘示例街 2 号',
    '2789 0001',
    'https://example.edu.hk/kbgps',
    '官立',
    null,
    null,
    null
  ),
  (
    '11111111-1111-1111-1111-111111111003',
    '港岛示范中学',
    'Hong Kong Model Secondary School',
    '港岛示范',
    'secondary',
    '湾仔',
    '湾仔示例路 88 号',
    '2555 1222',
    'https://example.edu.hk/hkmss',
    '津贴',
    null,
    null,
    null
  )
on conflict (id) do nothing;

insert into public.vacancies (
  id,
  school_id,
  grade,
  status,
  count,
  source,
  updated_at,
  is_stale
)
values
  ('22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'K1', 'available', 8, 'edb', '2026-03-18T10:00:00+08:00', false),
  ('22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111002', 'P1', 'waiting', null, 'manual', '2026-03-17T16:00:00+08:00', false),
  ('22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111003', 'S1', 'full', null, 'third_party', '2026-03-15T09:30:00+08:00', true)
on conflict (id) do nothing;
