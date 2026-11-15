-- 0026 · المواد الدراسية وإسناد التدريس: لكل مادة في كل فصل معلّم واحد في العام الدراسي.
-- مرجع واحد تقرأه الأنظمة المستقلة (قيمي وغيره) لمعرفة المتعلمين الذين يدرّسهم المعلم.

create table if not exists public.subjects (
  code text primary key,
  name_ar text not null unique,
  specialty text,                          -- التخصص المقابل في سجل المنسوبين (لاقتراح المعلمين)
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.subjects (code, name_ar, specialty, sort_order) values
  ('islamic', 'الدراسات الإسلامية', 'تربية إسلامية', 1),
  ('arabic', 'لغتي الخالدة', 'لغة عربية', 2),
  ('math', 'الرياضيات', 'رياضيات', 3),
  ('science', 'العلوم', 'علوم', 4),
  ('english', 'اللغة الإنجليزية', 'لغة إنجليزية', 5),
  ('social', 'الدراسات الاجتماعية', 'دراسات اجتماعية', 6),
  ('digital', 'المهارات الرقمية', 'حاسب آلي', 7),
  ('critical', 'التفكير الناقد', null, 8),
  ('art', 'التربية الفنية', 'تربية فنية', 9),
  ('pe', 'التربية البدنية والدفاع عن النفس', 'تربية بدنية', 10)
on conflict (code) do nothing;

create table if not exists public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  year_id uuid not null references public.academic_years(id),
  section_id uuid not null references public.class_sections(id) on delete cascade,
  subject_code text not null references public.subjects(code),
  staff_id uuid not null references public.staff_members(id),
  created_by uuid references public.staff_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, subject_code)
);
create index if not exists teaching_assignments_staff on public.teaching_assignments (staff_id, year_id);

-- العام يُؤخذ من الفصل دائماً (لا يُدخل يدوياً)، ومن أنشأ الإسناد يُسجَّل
create or replace function public.teaching_assignment_fill() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select year_id into new.year_id from public.class_sections where id = new.section_id;
  if new.year_id is null then raise exception 'الفصل غير موجود'; end if;
  if tg_op = 'INSERT' then new.created_by := (select id from public.staff_members where user_id = auth.uid() limit 1); end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists t_fill_teaching on public.teaching_assignments;
create trigger t_fill_teaching before insert or update on public.teaching_assignments for each row execute function public.teaching_assignment_fill();
drop trigger if exists t_guard_year_teaching on public.teaching_assignments;
create trigger t_guard_year_teaching before insert or delete or update on public.teaching_assignments for each row execute function public.guard_closed_year();
drop trigger if exists a_teaching_assignments on public.teaching_assignments;
create trigger a_teaching_assignments after insert or delete or update on public.teaching_assignments for each row execute function public.audit_generic();
drop trigger if exists c_teaching_assignments on public.teaching_assignments;
create trigger c_teaching_assignments after insert or delete or update on public.teaching_assignments for each row execute function public.emit_change('school', 'id');

-- القراءة لكل منسوب مسجّل الدخول (ليست بيانات شخصية)، والتعديل لمن يملك «سجل المدرسة – تعديل»
alter table public.subjects enable row level security;
alter table public.teaching_assignments enable row level security;
drop policy if exists subjects_r on public.subjects;
create policy subjects_r on public.subjects for select to authenticated using (true);
drop policy if exists subjects_w on public.subjects;
create policy subjects_w on public.subjects for all to authenticated using (public.core_can('school:edit')) with check (public.core_can('school:edit'));
drop policy if exists teaching_r on public.teaching_assignments;
create policy teaching_r on public.teaching_assignments for select to authenticated using (true);
drop policy if exists teaching_w on public.teaching_assignments;
create policy teaching_w on public.teaching_assignments for all to authenticated using (public.core_can('school:edit')) with check (public.core_can('school:edit'));
grant select, insert, update, delete on public.subjects, public.teaching_assignments to authenticated;

-- للأنظمة المستقلة: فصول المعلم ومواده في العام الحالي (للمستخدم الحالي أو لمنسوب محدد)
create or replace function public.core_teaching_of(p_staff uuid default null)
returns table (section_id uuid, section text, grade_code text, subject_code text, subject text)
language sql stable security definer set search_path = '' as $$
  select ta.section_id, cs.name, cs.grade_code, ta.subject_code, sj.name_ar
  from public.teaching_assignments ta
  join public.class_sections cs on cs.id = ta.section_id
  join public.academic_years y on y.id = ta.year_id and y.status = 'current'
  join public.subjects sj on sj.code = ta.subject_code
  where ta.staff_id = coalesce(p_staff, (select id from public.staff_members where user_id = auth.uid() and is_active limit 1))
  order by cs.grade_code, cs.name, sj.sort_order $$;
revoke all on function public.core_teaching_of(uuid) from public, anon;
grant execute on function public.core_teaching_of(uuid) to authenticated;
