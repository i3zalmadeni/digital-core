-- النواة الرقمية · سجل التقارير الموحد ورمز التحقق لكل الأنظمة
-- كل تقرير يُطبع من أي نظام عبر أداة الطباعة الموحدة (assets/report-kit.js) يُسجَّل برقم فريد ونسخة ثابتة.
-- صفحة التحقق (/digital-core/verify/): بيانات الإصدار للجميع، والنسخة الكاملة لمن يملك صلاحية في النظام المُصدِر
-- (أو للجميع إن صدر التقرير بخيار public_full، كتقارير المجتمع المهني). وتقرأ أيضًا تقارير pc_report_issues القديمة.

create table if not exists public.core_report_issues (
  id uuid primary key,
  code text not null unique,
  system text not null check (system ~ '^[a-z_]{2,40}$'),
  system_name text not null check (char_length(system_name) <= 120),
  title text not null check (char_length(title) between 1 and 500),
  subtitle text check (char_length(subtitle) <= 500),
  pages int check (pages between 1 and 2000),
  public_full boolean not null default false,
  doc_html text not null check (octet_length(doc_html) <= 4000000),
  issued_by uuid not null references public.staff_members(id),
  issued_at timestamptz not null default now(),
  constraint core_report_issues_code_chk check (code = upper(substr(replace(id::text, '-', ''), 1, 16)))
);
create index if not exists core_report_issues_by_idx on public.core_report_issues (issued_by, issued_at desc);
create index if not exists core_report_issues_sys_idx on public.core_report_issues (system, issued_at desc);

create or replace function public.core_report_issues_stamp() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  new.issued_by := public.current_staff_id();
  new.issued_at := now();
  if new.issued_by is null then raise exception 'لا يُصدر التقرير إلا منسوب مرتبط بالنواة'; end if;
  return new;
end $$;
revoke all on function public.core_report_issues_stamp() from public, anon, authenticated;
drop trigger if exists core_report_issues_stamp on public.core_report_issues;
create trigger core_report_issues_stamp before insert on public.core_report_issues for each row execute function public.core_report_issues_stamp();

alter table public.core_report_issues enable row level security;
revoke all on public.core_report_issues from anon, authenticated;
grant select, insert on public.core_report_issues to authenticated;
drop policy if exists core_ri_i on public.core_report_issues;
create policy core_ri_i on public.core_report_issues for insert to authenticated with check (public.current_staff_id() is not null);
drop policy if exists core_ri_r on public.core_report_issues;
create policy core_ri_r on public.core_report_issues for select to authenticated using (issued_by = public.current_staff_id() or public.is_core_admin());

-- من يطّلع على النسخة الكاملة: المُصدِر، مدير النواة، ومن له أي صلاحية في النظام المُصدِر
create or replace function public.core_report_can_read(p_system text, p_issuer uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select auth.uid() is not null and (
    p_issuer = public.current_staff_id() or public.is_core_admin()
    or exists (select 1 from public.permissions p where p.system_code = p_system and public.core_can(p.code)))
$$;
revoke all on function public.core_report_can_read(text, uuid) from public, anon;
grant execute on function public.core_report_can_read(text, uuid) to authenticated;

create or replace function public.core_verify_report(p_code text) returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare c text := upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Fa-f]', '', 'g')); r record; full_ok boolean;
begin
  if length(c) <> 16 then return null; end if;
  select i.*, s.full_name as issuer into r from public.core_report_issues i left join public.staff_members s on s.id = i.issued_by where i.code = c;
  if found then
    full_ok := r.public_full or public.core_report_can_read(r.system, r.issued_by);
    return jsonb_build_object('code', r.code, 'system', r.system, 'system_name', r.system_name, 'title', r.title, 'subtitle', r.subtitle,
      'pages', r.pages, 'issued_at', r.issued_at, 'issuer', r.issuer, 'full', full_ok, 'signed_in', auth.uid() is not null,
      'html', case when full_ok then r.doc_html end);
  end if;
  -- تقارير المجتمع المهني الصادرة قبل التوحيد
  select i.*, s.full_name as issuer into r from public.pc_report_issues i left join public.staff_members s on s.id = i.issued_by where i.code = c;
  if found then
    return jsonb_build_object('code', r.code, 'system', 'teachers_community', 'system_name', r.kind, 'title', r.title, 'subtitle', r.subtitle,
      'issued_at', r.issued_at, 'issuer', r.issuer, 'full', true, 'signed_in', auth.uid() is not null, 'html', r.doc_html);
  end if;
  return null;
end $$;
revoke all on function public.core_verify_report(text) from public;
grant execute on function public.core_verify_report(text) to anon, authenticated;
