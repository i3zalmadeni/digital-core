-- 0044: «يحدث في لبيد» – أسماء البرامج بدل رموزها، وعدّادات الخطط والبرامج الأساسية.
-- السبب: برامج الخطط الذكية الأساسية (38 برنامجاً وثلاث خطط) مضمّنة في كود الموقع وليست في sp_records؛ الموجود فيها
-- البرامج المضافة يدوياً (c-…) وتعديلات الحقول وسجلات التوثيق (programId وprogramCode دون اسم).
-- فكانت lb_programs() تتجاهل الأساسية فتظهر أصفاراً في الخطة التشغيلية والخطط، ويسقط عنوان التوثيق إلى الرمز.
-- الحل: جدولا مطابقة ثابتان للبرامج والخطط الأساسية، تدمجهما lb_programs() وlb_plans() مع التعديلات والحذف، وتستخدمهما lb_docs.
-- قراءة فقط؛ لا جداول جديدة ولا تغيير في سجلات الخطط الذكية.

create or replace function public.lb_base_programs()
returns table(pid text, code text, name text, plan_id int, status text, planned_date date, planned_end date, owner_name text, beneficiary text)
language sql immutable set search_path = '' as $$
  select * from (values
    ('1', 'PL-001', 'رخصتي المهنية', 1, 'لم يبدأ', '2026-10-18'::date, '2026-10-29'::date, 'صالح السندي', 'المعلم'),
    ('2', 'PL-002', 'الخطة المدرسية الإلكترونية', 1, 'لم يبدأ', '2026-10-04'::date, '2026-10-15'::date, 'مدير المدرسة', 'المساندون'),
    ('3', 'PL-003', 'الخطة المدرسية الإلكترونية', 1, 'لم يبدأ', '2026-09-27'::date, '2026-10-22'::date, 'مدير المدرسة', 'المساندون'),
    ('4', 'PL-004', 'نادي موهبة', 1, 'لم يبدأ', '2026-10-04'::date, '2026-10-29'::date, 'خليفة الإسماعيل', 'المتعلم'),
    ('5', 'PL-005', 'المدرسة المؤثرة', 1, 'لم يبدأ', '2026-09-27'::date, '2026-10-15'::date, 'صالح المجحم', 'الشركاء'),
    ('6', 'PL-006', 'خطة التحسين المدرسي', 1, 'لم يبدأ', '2026-10-04'::date, '2026-10-29'::date, 'عبدالله الدوسري', 'المساندون'),
    ('7', 'PL-007', 'التعليم المتميز', 1, 'لم يبدأ', '2026-10-11'::date, '2026-10-22'::date, 'عبدالعزيز المديني', 'المتعلم'),
    ('8', 'PL-008', 'استراتيجيات التدريس', 1, 'لم يبدأ', '2026-10-18'::date, '2026-10-29'::date, 'صالح السندي', 'المعلم'),
    ('9', 'PL-009', 'التعلم الإلكتروني', 1, 'لم يبدأ', '2026-10-25'::date, '2026-10-29'::date, 'صالح السندي', 'المعلم'),
    ('10', 'PL-010', 'المتعلم المفكر', 1, 'لم يبدأ', '2026-09-27'::date, '2026-10-29'::date, 'منير العمير', 'المتعلم'),
    ('11', 'PL-011', 'ساعة برمجة', 1, 'لم يبدأ', '2026-09-20'::date, '2026-10-08'::date, 'معلمو الحاسب الآلي', 'المتعلم'),
    ('12', 'PL-012', 'أدوات التقويم الذكية', 1, 'لم يبدأ', '2026-10-25'::date, '2026-11-05'::date, 'علي الحسين', 'المعلم'),
    ('13', 'PL-013', 'مشروع نافس للقراءة', 1, 'لم يبدأ', '2026-10-04'::date, '2026-10-29'::date, 'معلمو لغتي', 'المتعلم'),
    ('14', 'PL-014', 'مشروع نافس للرياضيات', 1, 'لم يبدأ', '2026-10-04'::date, '2026-10-29'::date, 'معلمو الرياضيات', 'المتعلم'),
    ('15', 'PL-015', 'مشروع نافس للعلوم', 1, 'لم يبدأ', '2026-10-04'::date, '2026-10-29'::date, 'معلمو العلوم', 'المتعلم'),
    ('16', 'PL-016', 'مدرستي جاذبة', 1, 'لم يبدأ', '2026-10-04'::date, '2026-10-29'::date, 'خالد الباش', 'المرافق المدرسية'),
    ('17', 'PL-017', 'مدرستي جاذبة', 1, 'لم يبدأ', '2026-10-04'::date, '2026-10-29'::date, 'خالد الباش', 'المرافق المدرسية'),
    ('18', 'PL-018', 'فصلي تقني', 1, 'لم يبدأ', '2026-09-20'::date, '2026-10-29'::date, 'خالد الباش', 'المرافق المدرسية'),
    ('19', 'SP-001', 'تحسين التحصيل العلمي والدراسي', 2, 'لم يبدأ', null::date, null::date, 'منير العمير', 'المتعلم'),
    ('20', 'SP-002', 'تنفيذ الدرس', 2, 'لم يبدأ', null::date, null::date, 'وكيل المعلمين', 'المتعلم'),
    ('21', 'SP-003', 'الشراكة مع الأسرة والمجتمع', 2, 'لم يبدأ', null::date, null::date, 'منير العمير', 'الشركاء'),
    ('22', 'SP-004', 'البرامج والأنشطة المدرسية الصفية وغير الصفية', 2, 'لم يبدأ', null::date, null::date, 'منير العمير', 'المتعلم'),
    ('23', 'OP-001', 'وطن هو المجد', 3, 'لم يبدأ', '2026-08-23'::date, '2026-10-01'::date, 'وليد الفريدان', 'المتعلم'),
    ('24', 'OP-002', 'إلا وطني', 3, 'لم يبدأ', '2026-08-30'::date, '2026-10-01'::date, 'وليد الفريدان', 'المتعلم؛ المعلم؛ المساندون'),
    ('25', 'OP-003', 'الرقم المعلم', 3, 'لم يبدأ', '2026-08-23'::date, '2026-10-29'::date, 'عبدالعزيز المديني', 'المعلم'),
    ('26', 'OP-004', 'برنامج تبادل الزيارات', 3, 'لم يبدأ', '2026-08-23'::date, '2026-10-15'::date, 'منير العمير', 'المعلم'),
    ('27', 'OP-005', 'المهام الإشرافية', 3, 'لم يبدأ', '2026-08-23'::date, '2026-10-29'::date, 'منسق/فريق التنمية المهنية', 'المعلم'),
    ('28', 'OP-006', 'برنامج تبادل الزيارات', 3, 'لم يبدأ', '2026-08-23'::date, '2026-10-15'::date, 'منير العمير', 'المعلم'),
    ('29', 'OP-007', 'مدرستي آمنة', 3, 'لم يبدأ', '2026-08-23'::date, '2026-09-03'::date, 'وليد الفريدان', 'المرافق المدرسية'),
    ('30', 'OP-008', 'الإخلاء المدرسي', 3, 'لم يبدأ', '2026-08-23'::date, '2026-09-10'::date, 'وليد الفريدان', 'المتعلم؛ المعلم؛ المساندون'),
    ('31', 'OP-009', 'أنا مهيأ', 3, 'لم يبدأ', '2026-08-23'::date, '2026-10-22'::date, 'عبدالعزيز المديني', 'المتعلم'),
    ('32', 'OP-010', 'الرحال الإنجليزي', 3, 'لم يبدأ', '2026-08-30'::date, '2026-10-29'::date, 'عبدالرحمن القرني', 'المتعلم'),
    ('33', 'OP-011', 'الأب المعلم', 3, 'لم يبدأ', '2026-08-23'::date, '2026-09-17'::date, '—', 'الشركاء'),
    ('34', 'OP-012', 'الطالب الطبيب', 3, 'لم يبدأ', '2026-08-23'::date, '2026-09-17'::date, 'عبدالعزيز الحمدان', 'المتعلم'),
    ('35', 'OP-013', 'راقٍ بأخلاقي', 3, 'لم يبدأ', '2026-08-23'::date, '2026-10-15'::date, 'أحمد العبدالعظيم', 'المتعلم'),
    ('36', 'OP-014', 'جائزة غياب صفر', 3, 'لم يبدأ', '2026-08-23'::date, '2026-12-10'::date, 'منير العمير', 'المتعلم'),
    ('37', 'OP-015', 'جائزة الطالب المثالي – النسخة الأولى', 3, 'لم يبدأ', '2026-08-23'::date, '2026-12-17'::date, 'منير العمير', 'المتعلم'),
    ('38', 'OP-016', 'جائزة غياب صفر', 3, 'لم يبدأ', '2026-08-23'::date, '2026-12-17'::date, 'منير العمير', 'المتعلم')
  ) as t(pid, code, name, plan_id, status, planned_date, planned_end, owner_name, beneficiary) $$;

create or replace function public.lb_base_plans()
returns table(plan_id int, name text) language sql immutable set search_path = '' as $$
  select * from (values
    (1, 'خطة تحسين نواتج التقويم الذاتي'),
    (2, 'خطة التحسين في مجالات الممارسات الإشرافية'),
    (3, 'الخطة التشغيلية 1448هـ')
  ) as t(plan_id, name) $$;

-- برامج الخطط الذكية بحالتها الحالية: الأساسية + المضافة − المحذوف، مع تعديلات الحقول
create or replace function public.lb_programs()
returns table(pid text, name text, status text, planned_date date, planned_end date, owner_name text, plan_id int, beneficiary text, created_at timestamptz, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with adds as (
    select 'c-' || r.id::text as pid, r.data -> 'data' as d, r.created_at
    from public.sp_records r where r.col = 'executions' and r.data ->> 'type' = 'add' and jsonb_typeof(r.data -> 'data') = 'object'
    union all
    select b.pid, jsonb_build_object('name', b.name, 'status', b.status, 'planned_date', b.planned_date, 'planned_end', b.planned_end,
      'owner_name', b.owner_name, 'plan_id', b.plan_id, 'beneficiary', b.beneficiary), '2026-08-01'::timestamptz
    from public.lb_base_programs() b),
  rem as (select r.data ->> 'progId' as pid from public.sp_records r where r.col = 'executions' and r.data ->> 'type' = 'remove'),
  ed as (
    select r.data ->> 'progId' as pid, max(r.created_at) as last_at, jsonb_object_agg(e.key, e.value order by r.created_at) as f
    from public.sp_records r, lateral jsonb_each(r.data -> 'fields') e
    where r.col = 'executions' and r.data ->> 'type' = 'edit' and jsonb_typeof(r.data -> 'fields') = 'object' group by 1)
  select a.pid, coalesce(m.d ->> 'name', ''), m.d ->> 'status',
    case when m.d ->> 'planned_date' ~ '^\d{4}-\d\d-\d\d$' then (m.d ->> 'planned_date')::date end,
    case when m.d ->> 'planned_end' ~ '^\d{4}-\d\d-\d\d$' then (m.d ->> 'planned_end')::date end,
    m.d ->> 'owner_name',
    case when m.d ->> 'plan_id' ~ '^\d+$' then (m.d ->> 'plan_id')::int end,
    m.d ->> 'beneficiary', a.created_at, coalesce(ed.last_at, a.created_at)
  from adds a left join ed on ed.pid = a.pid
  cross join lateral (select a.d || coalesce(ed.f, '{}'::jsonb) as d) m
  where a.pid not in (select rem.pid from rem where rem.pid is not null) $$;

-- أسماء الخطط: الأساسية، ثم المضافة، ثم آخر تعديل للاسم
create or replace function public.lb_plans() returns table(plan_id int, name text) language sql stable security definer set search_path = '' as $$
  select distinct on (s.pid) s.pid, s.nm from (
    select b.plan_id as pid, b.name as nm, 0 as ord, null::timestamptz as t from public.lb_base_plans() b
    union all
    select (r.data -> 'plan' ->> 'id')::int, r.data -> 'plan' ->> 'name', 1, r.created_at
      from public.sp_records r where r.col = 'executions' and r.data ->> 'type' = 'plan-add' and r.data -> 'plan' ->> 'id' ~ '^\d+$' and coalesce(r.data -> 'plan' ->> 'name', '') <> ''
    union all
    select (r.data ->> 'planId')::int, r.data -> 'fields' ->> 'name', 2, r.created_at
      from public.sp_records r where r.col = 'executions' and r.data ->> 'type' = 'plan-edit' and r.data ->> 'planId' ~ '^\d+$' and coalesce(r.data -> 'fields' ->> 'name', '') <> ''
  ) s order by s.pid, s.ord desc, s.t desc nulls last $$;

-- آخر التوثيقات: اسم البرنامج (المضاف أو الأساسي بالرقم أو بالرمز) قبل الرمز
create or replace function public.lb_docs(p_limit int default 12)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
    select jsonb_build_object('id', r.id, 'at', r.created_at,
      'title', coalesce(nullif(p.name, ''), nullif(bc.name, ''), nullif(r.data ->> 'programName', ''), left(coalesce(r.data ->> 'description', ''), 70), 'توثيق تنفيذ'),
      'code', r.data ->> 'programCode', 'executor', coalesce(nullif(r.data ->> 'executor', ''), p.owner_name), 'date', r.data ->> 'date',
      'location', r.data ->> 'location', 'participants', r.data ->> 'participants', 'beneficiaries', r.data ->> 'beneficiaries',
      'description', r.data ->> 'description', 'outputs', r.data ->> 'outputs',
      'images', (select coalesce(jsonb_agg(i ->> 'id'), '[]'::jsonb) from jsonb_array_elements(r.data -> 'images') i where i ->> 'id' ~* '\.(png|jpe?g|webp|gif)$'),
      'link', '/smart-plans/') x
    from public.sp_records r
      left join public.lb_programs() p on p.pid = r.data ->> 'programId'
      left join public.lb_base_programs() bc on bc.code = r.data ->> 'programCode'
    where r.col = 'executions' and coalesce(r.data ->> 'type', '') = '' and jsonb_typeof(r.data -> 'images') = 'array' and jsonb_array_length(r.data -> 'images') > 0
    order by r.created_at desc limit least(greatest(coalesce(p_limit, 12), 1), 30)) q), '[]'::jsonb);
end $$;

revoke all on function public.lb_base_programs(), public.lb_base_plans() from public, anon, authenticated;
revoke all on function public.lb_docs(int) from public, anon;
grant execute on function public.lb_docs(int) to authenticated;
