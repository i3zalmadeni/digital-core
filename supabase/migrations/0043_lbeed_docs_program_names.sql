-- 0043: «يحدث في لبيد» – شريط آخر التوثيقات يعرض اسم البرنامج بدل رقمه/رمزه.
-- السبب: سجل التوثيق يخزّن programId وprogramCode فقط، وlb_programs() لا تحوي إلا البرامج المضافة يدوياً (c-…)،
-- فكان عنوان البرامج الأساسية يسقط إلى الرمز (PL-001…). نضيف جدول مطابقة للبرامج الأساسية (من بيانات الخطط الذكية) يُستخدم قبل الرمز.
-- قراءة فقط، دون جداول جديدة.
create or replace function public.lb_base_programs()
returns table(pid text, code text, name text) language sql immutable set search_path = '' as $$
  select * from (values
    ('1', 'PL-001', 'رخصتي المهنية'),
    ('2', 'PL-002', 'الخطة المدرسية الإلكترونية'),
    ('3', 'PL-003', 'الخطة المدرسية الإلكترونية'),
    ('4', 'PL-004', 'نادي موهبة'),
    ('5', 'PL-005', 'المدرسة المؤثرة'),
    ('6', 'PL-006', 'خطة التحسين المدرسي'),
    ('7', 'PL-007', 'التعليم المتميز'),
    ('8', 'PL-008', 'استراتيجيات التدريس'),
    ('9', 'PL-009', 'التعلم الإلكتروني'),
    ('10', 'PL-010', 'المتعلم المفكر'),
    ('11', 'PL-011', 'ساعة برمجة'),
    ('12', 'PL-012', 'أدوات التقويم الذكية'),
    ('13', 'PL-013', 'مشروع نافس للقراءة'),
    ('14', 'PL-014', 'مشروع نافس للرياضيات'),
    ('15', 'PL-015', 'مشروع نافس للعلوم'),
    ('16', 'PL-016', 'مدرستي جاذبة'),
    ('17', 'PL-017', 'مدرستي جاذبة'),
    ('18', 'PL-018', 'فصلي تقني'),
    ('19', 'SP-001', 'تحسين التحصيل العلمي والدراسي'),
    ('20', 'SP-002', 'تنفيذ الدرس'),
    ('21', 'SP-003', 'الشراكة مع الأسرة والمجتمع'),
    ('22', 'SP-004', 'البرامج والأنشطة المدرسية الصفية وغير الصفية'),
    ('23', 'OP-001', 'وطن هو المجد'),
    ('24', 'OP-002', 'إلا وطني'),
    ('25', 'OP-003', 'الرقم المعلم'),
    ('26', 'OP-004', 'برنامج تبادل الزيارات'),
    ('27', 'OP-005', 'المهام الإشرافية'),
    ('28', 'OP-006', 'برنامج تبادل الزيارات'),
    ('29', 'OP-007', 'مدرستي آمنة'),
    ('30', 'OP-008', 'الإخلاء المدرسي'),
    ('31', 'OP-009', 'أنا مهيأ'),
    ('32', 'OP-010', 'الرحال الإنجليزي'),
    ('33', 'OP-011', 'الأب المعلم'),
    ('34', 'OP-012', 'الطالب الطبيب'),
    ('35', 'OP-013', 'راقٍ بأخلاقي'),
    ('36', 'OP-014', 'جائزة غياب صفر'),
    ('37', 'OP-015', 'جائزة الطالب المثالي – النسخة الأولى'),
    ('38', 'OP-016', 'جائزة غياب صفر')
  ) as t(pid, code, name) $$;

create or replace function public.lb_docs(p_limit int default 12)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
    select jsonb_build_object('id', r.id, 'at', r.created_at,
      'title', coalesce(nullif(p.name, ''), nullif(bp.name, ''), nullif(bc.name, ''), nullif(r.data ->> 'programName', ''), left(coalesce(r.data ->> 'description', ''), 70), 'توثيق تنفيذ'),
      'code', r.data ->> 'programCode', 'executor', coalesce(nullif(r.data ->> 'executor', ''), p.owner_name), 'date', r.data ->> 'date',
      'location', r.data ->> 'location', 'participants', r.data ->> 'participants', 'beneficiaries', r.data ->> 'beneficiaries',
      'description', r.data ->> 'description', 'outputs', r.data ->> 'outputs',
      'images', (select coalesce(jsonb_agg(i ->> 'id'), '[]'::jsonb) from jsonb_array_elements(r.data -> 'images') i where i ->> 'id' ~* '\.(png|jpe?g|webp|gif)$'),
      'link', '/smart-plans/') x
    from public.sp_records r
      left join public.lb_programs() p on p.pid = r.data ->> 'programId'
      left join public.lb_base_programs() bp on bp.pid = r.data ->> 'programId'
      left join public.lb_base_programs() bc on bc.code = r.data ->> 'programCode'
    where r.col = 'executions' and coalesce(r.data ->> 'type', '') = '' and jsonb_typeof(r.data -> 'images') = 'array' and jsonb_array_length(r.data -> 'images') > 0
    order by r.created_at desc limit least(greatest(coalesce(p_limit, 12), 1), 30)) q), '[]'::jsonb);
end $$;
revoke all on function public.lb_docs(int) from public, anon;
grant execute on function public.lb_docs(int) to authenticated;
