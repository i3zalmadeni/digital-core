-- 0029 · وحدة إدارة التكليفات المدرسية: تكليف أساسي وفرعي، إصدارات محفوظة، إقرار إلكتروني، ومتابعة.
-- الكتابة كلها عبر دوال (RPC) تتحقق من الصلاحية؛ الجداول للقراءة فقط وفق RLS.

insert into public.permissions (code, system_code, level, name_ar)
select 'assignments:manage', null, 'edit', 'التكليفات – إدارة كاملة (إنشاء وإصدار وإلغاء)'
where not exists (select 1 from public.permissions where code = 'assignments:manage');

-- مسميات التكليفات الفرعية: قابلة للإضافة والتعديل
create table if not exists public.assignment_titles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  nature text not null check (nature in ('official_post','extra_task')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
insert into public.assignment_titles (name, nature, sort_order) values
  ('القيام بعمل وكيل شؤون الطلاب','official_post',1),
  ('القيام بعمل وكيل الشؤون التعليمية','official_post',2),
  ('منسق الإذاعة المدرسية','extra_task',3),
  ('منسق الموهوبين','extra_task',4),
  ('منسق الإعلام','extra_task',5),
  ('منسق التنمية الذاتية','extra_task',6)
on conflict (name) do nothing;

create sequence if not exists public.assignment_seq;

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_no text not null unique default ('ت-' || extract(year from now())::int || '-' || lpad(nextval('public.assignment_seq')::text, 4, '0')),
  kind text not null check (kind in ('primary','secondary')),
  nature text check (nature in ('official_post','extra_task')),
  staff_id uuid not null references public.staff_members(id),
  title text not null,
  status text not null default 'draft' check (status in ('draft','issued','ended','cancelled')),   -- حالة السجل
  exec_status text not null default 'not_started' check (exec_status in ('not_started','in_progress','completed')), -- التنفيذ منفصل عن الإقرار
  current_version int not null default 1,
  cancelled_reason text,
  created_by uuid references public.staff_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_nature_ck check ((kind = 'secondary' and nature is not null) or (kind = 'primary' and nature is null))
);
create index if not exists assignments_staff on public.assignments (staff_id);
-- تكليف أساسي واحد قائم للموظف
create unique index if not exists assignments_one_primary on public.assignments (staff_id) where kind = 'primary' and status in ('draft','issued');

create table if not exists public.assignment_versions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  version_no int not null,
  title text not null,
  description text,
  tasks text,
  start_date date not null,
  end_date date not null,
  supervisor_id uuid not null references public.staff_members(id),
  notes text,
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid references public.staff_members(id),
  created_at timestamptz not null default now(),
  issued_at timestamptz,
  issued_by uuid references public.staff_members(id),
  ack_at timestamptz,
  ack_by uuid,
  unique (assignment_id, version_no),
  check (end_date >= start_date)
);

create table if not exists public.assignment_followups (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  version_no int not null,
  author_id uuid references public.staff_members(id),
  note text,
  progress int check (progress between 0 and 100),
  exec_status text,
  created_at timestamptz not null default now()
);
create index if not exists assignment_followups_a on public.assignment_followups (assignment_id, created_at desc);

-- الإصدار المُصدَر لا يتغير محتواه أبداً؛ يُسمح فقط بتسجيل الإقرار مرة واحدة. المسودة وحدها تُحذف.
create or replace function public.assignment_version_guard() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.issued_at is not null then raise exception 'لا يمكن حذف إصدار مُصدر'; end if;
    return old;
  end if;
  if old.issued_at is not null then
    if (new.title, new.description, new.tasks, new.start_date, new.end_date, new.supervisor_id, new.notes, new.attachments, new.version_no, new.assignment_id, new.issued_at, new.issued_by)
       is distinct from (old.title, old.description, old.tasks, old.start_date, old.end_date, old.supervisor_id, old.notes, old.attachments, old.version_no, old.assignment_id, old.issued_at, old.issued_by) then
      raise exception 'الإصدار المُصدر لا يُعدَّل؛ يُنشأ إصدار جديد';
    end if;
    if old.ack_at is not null and (new.ack_at is distinct from old.ack_at or new.ack_by is distinct from old.ack_by) then
      raise exception 'الإقرار مسجّل ولا يُعدَّل';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists t_assignment_version_guard on public.assignment_versions;
create trigger t_assignment_version_guard before update or delete on public.assignment_versions for each row execute function public.assignment_version_guard();

drop trigger if exists a_assignments on public.assignments;
create trigger a_assignments after insert or delete or update on public.assignments for each row execute function public.audit_generic();
drop trigger if exists a_assignment_versions on public.assignment_versions;
create trigger a_assignment_versions after insert or delete or update on public.assignment_versions for each row execute function public.audit_generic();
drop trigger if exists a_assignment_followups on public.assignment_followups;
create trigger a_assignment_followups after insert or delete or update on public.assignment_followups for each row execute function public.audit_generic();

-- من يرى التكليف: المدير، والموظف المكلف، والمسؤول المباشر (بعد الإصدار فقط، ولا يرى أحدهم المسودات)
create or replace function public.assignment_visible(p uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public.core_can('assignments:manage') or exists (
    select 1 from public.assignments a
    where a.id = p and a.status <> 'draft'
      and (a.staff_id = public.current_staff_id()
        or exists (select 1 from public.assignment_versions v where v.assignment_id = a.id and v.issued_at is not null and v.supervisor_id = public.current_staff_id()))) $$;

alter table public.assignment_titles enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_versions enable row level security;
alter table public.assignment_followups enable row level security;
drop policy if exists at_r on public.assignment_titles; create policy at_r on public.assignment_titles for select to authenticated using (true);
drop policy if exists at_w on public.assignment_titles; create policy at_w on public.assignment_titles for all to authenticated using (public.core_can('assignments:manage')) with check (public.core_can('assignments:manage'));
drop policy if exists asg_r on public.assignments; create policy asg_r on public.assignments for select to authenticated using (public.assignment_visible(id));
drop policy if exists asgv_r on public.assignment_versions; create policy asgv_r on public.assignment_versions for select to authenticated using (public.assignment_visible(assignment_id) and (issued_at is not null or public.core_can('assignments:manage')));
drop policy if exists asgf_r on public.assignment_followups; create policy asgf_r on public.assignment_followups for select to authenticated using (public.assignment_visible(assignment_id));
grant select on public.assignments, public.assignment_versions, public.assignment_followups to authenticated;
grant select, insert, update, delete on public.assignment_titles to authenticated;

-- حفظ مسودة أو إنشاء إصدار جديد (التكليف المُصدر يُنشأ له إصدار جديد غير نافذ حتى إقرار الموظف)
create or replace function public.assignment_save(p_id uuid, p jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_staff_id(); a public.assignments; v public.assignment_versions; aid uuid; ver int;
  t text := nullif(btrim(p->>'title'), ''); sd date := nullif(p->>'start_date','')::date; ed date := nullif(p->>'end_date','')::date; sup uuid := nullif(p->>'supervisor_id','')::uuid;
begin
  if not public.core_can('assignments:manage') then raise exception 'غير مصرح'; end if;
  if t is null then raise exception 'مسمى التكليف مطلوب'; end if;
  if sd is null or ed is null then raise exception 'تاريخ البداية والنهاية مطلوبان'; end if;
  if ed < sd then raise exception 'تاريخ النهاية قبل تاريخ البداية'; end if;
  if sup is null then raise exception 'حدد المسؤول المباشر عن المتابعة'; end if;
  if p_id is null then
    insert into public.assignments (kind, nature, staff_id, title, created_by)
    values (p->>'kind', nullif(p->>'nature',''), (p->>'staff_id')::uuid, t, me) returning id into aid;
    insert into public.assignment_versions (assignment_id, version_no, title, description, tasks, start_date, end_date, supervisor_id, notes, attachments, created_by)
    values (aid, 1, t, nullif(p->>'description',''), nullif(p->>'tasks',''), sd, ed, sup, nullif(p->>'notes',''), coalesce(p->'attachments','[]'::jsonb), me);
    return aid;
  end if;
  select * into a from public.assignments where id = p_id for update;
  if not found then raise exception 'التكليف غير موجود'; end if;
  if a.status in ('cancelled','ended') then raise exception 'التكليف مغلق ولا يُعدَّل'; end if;
  select * into v from public.assignment_versions where assignment_id = p_id and version_no = a.current_version;
  if v.issued_at is null then
    update public.assignment_versions set title = t, description = nullif(p->>'description',''), tasks = nullif(p->>'tasks',''), start_date = sd, end_date = ed,
      supervisor_id = sup, notes = nullif(p->>'notes',''), attachments = coalesce(p->'attachments','[]'::jsonb) where id = v.id;
    if a.status = 'draft' then update public.assignments set title = t, nature = coalesce(nullif(p->>'nature',''), nature), updated_at = now() where id = p_id; end if;
  else
    ver := v.version_no + 1;
    insert into public.assignment_versions (assignment_id, version_no, title, description, tasks, start_date, end_date, supervisor_id, notes, attachments, created_by)
    values (p_id, ver, t, nullif(p->>'description',''), nullif(p->>'tasks',''), sd, ed, sup, nullif(p->>'notes',''), coalesce(p->'attachments','[]'::jsonb), me);
    update public.assignments set current_version = ver, updated_at = now() where id = p_id;
  end if;
  return p_id;
end $$;

-- إصدار النسخة الأخيرة للموظف (يصله إشعار ويُطلب إقراره)
create or replace function public.assignment_issue(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_staff_id(); a public.assignments; v public.assignment_versions;
begin
  if not public.core_can('assignments:manage') then raise exception 'غير مصرح'; end if;
  select * into a from public.assignments where id = p_id for update;
  if not found then raise exception 'التكليف غير موجود'; end if;
  if a.status in ('cancelled','ended') then raise exception 'التكليف مغلق'; end if;
  select * into v from public.assignment_versions where assignment_id = p_id and version_no = a.current_version;
  if v.issued_at is not null then raise exception 'لا يوجد إصدار غير مُصدر'; end if;
  update public.assignment_versions set issued_at = now(), issued_by = me where id = v.id;
  update public.assignments set status = 'issued', title = v.title, updated_at = now() where id = p_id;
end $$;

-- إقرار الموظف بآخر إصدار مُصدر (الاطلاع والموافقة والالتزام والعلم بالمدة والمتابع)
create or replace function public.assignment_acknowledge(p_id uuid) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare a public.assignments; v public.assignment_versions; t timestamptz := now();
begin
  select * into a from public.assignments where id = p_id;
  if not found or a.staff_id is distinct from public.current_staff_id() then raise exception 'غير مصرح'; end if;
  if a.status <> 'issued' then raise exception 'التكليف غير صادر'; end if;
  select * into v from public.assignment_versions where assignment_id = p_id and issued_at is not null order by version_no desc limit 1;
  if v.ack_at is not null then raise exception 'سبق الإقرار بهذا الإصدار'; end if;
  update public.assignment_versions set ack_at = t, ack_by = auth.uid() where id = v.id;
  return t;
end $$;

-- متابعة التنفيذ: للمسؤول المباشر أو المدير، بعد إقرار الموظف
create or replace function public.assignment_followup(p_id uuid, p_note text, p_progress int, p_exec text) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_staff_id(); a public.assignments; v public.assignment_versions;
begin
  select * into a from public.assignments where id = p_id;
  if not found or a.status <> 'issued' then raise exception 'التكليف غير صادر'; end if;
  select * into v from public.assignment_versions where assignment_id = p_id and issued_at is not null order by version_no desc limit 1;
  if not (public.core_can('assignments:manage') or v.supervisor_id = me) then raise exception 'غير مصرح'; end if;
  if not exists (select 1 from public.assignment_versions where assignment_id = p_id and ack_at is not null) then raise exception 'لم يُقرّ الموظف بالتكليف بعد'; end if;
  if p_exec is not null and p_exec not in ('not_started','in_progress','completed') then raise exception 'حالة تنفيذ غير صحيحة'; end if;
  if nullif(btrim(p_note),'') is null and p_progress is null and p_exec is null then raise exception 'أدخل ملاحظة أو مستوى إنجاز أو حالة'; end if;
  insert into public.assignment_followups (assignment_id, version_no, author_id, note, progress, exec_status) values (p_id, v.version_no, me, nullif(btrim(p_note),''), p_progress, p_exec);
  if p_exec is not null then update public.assignments set exec_status = p_exec, updated_at = now() where id = p_id; end if;
end $$;

-- إلغاء أو إنهاء (المدير)
create or replace function public.assignment_close(p_id uuid, p_action text, p_reason text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.core_can('assignments:manage') then raise exception 'غير مصرح'; end if;
  if p_action = 'cancel' then update public.assignments set status = 'cancelled', cancelled_reason = nullif(btrim(p_reason),''), updated_at = now() where id = p_id and status in ('draft','issued');
  elsif p_action = 'end' then update public.assignments set status = 'ended', updated_at = now() where id = p_id and status = 'issued';
  else raise exception 'إجراء غير صحيح'; end if;
  if not found then raise exception 'تعذر تنفيذ الإجراء على حالة التكليف الحالية'; end if;
end $$;

create or replace function public.assignment_delete_draft(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.core_can('assignments:manage') then raise exception 'غير مصرح'; end if;
  delete from public.assignments where id = p_id and status = 'draft';
  if not found then raise exception 'يُحذف المسودة فقط؛ للمُصدَر استخدم الإلغاء'; end if;
end $$;

revoke all on function public.assignment_save(uuid, jsonb), public.assignment_issue(uuid), public.assignment_acknowledge(uuid), public.assignment_followup(uuid, text, int, text), public.assignment_close(uuid, text, text), public.assignment_delete_draft(uuid) from public, anon;
grant execute on function public.assignment_save(uuid, jsonb), public.assignment_issue(uuid), public.assignment_acknowledge(uuid), public.assignment_followup(uuid, text, int, text), public.assignment_close(uuid, text, text), public.assignment_delete_draft(uuid) to authenticated;

-- مرفقات التكليفات (مسار الملف: <معرّف التكليف>/<ملف>)
insert into storage.buckets (id, name, public) values ('assignment-files', 'assignment-files', false) on conflict (id) do nothing;
drop policy if exists asg_files_r on storage.objects;
create policy asg_files_r on storage.objects for select to authenticated using (bucket_id = 'assignment-files' and public.assignment_visible(((storage.foldername(name))[1])::uuid));
drop policy if exists asg_files_i on storage.objects;
create policy asg_files_i on storage.objects for insert to authenticated with check (bucket_id = 'assignment-files' and public.core_can('assignments:manage'));
drop policy if exists asg_files_u on storage.objects;
create policy asg_files_u on storage.objects for update to authenticated using (bucket_id = 'assignment-files' and public.core_can('assignments:manage'));
drop policy if exists asg_files_d on storage.objects;
create policy asg_files_d on storage.objects for delete to authenticated using (bucket_id = 'assignment-files' and public.core_can('assignments:manage'));
