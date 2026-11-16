-- شريط الإعلانات والتحديثات الموحّد (مطبّق على القاعدة باسم core_0027_portal_announcements). إضافة فقط.
create table if not exists public.portal_announcements (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('central','portal')),
  system_code text check (system_code in ('core','self_evaluation','smart_plans','teachers_community','indibati','qiyami','facility_booking','mirat')),
  targets text[] not null default '{}',
  kind text not null default 'announcement' check (kind in ('announcement','update')),
  priority text not null default 'normal' check (priority in ('normal','important')),
  message text not null check (length(btrim(message)) between 1 and 600),
  show_on text not null default 'all' check (show_on in ('home','all')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scope = 'central' or system_code is not null),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists portal_announcements_scope_idx on public.portal_announcements (scope, system_code, is_active);
alter table public.portal_announcements enable row level security;

create or replace function public.portal_system_alias(p text) returns text
language sql immutable set search_path = '' as $$
  select case p when 'qiyami' then 'student_incentives' when 'facility_booking' then 'labeed_facilities' else p end $$;

create or replace function public.portal_can_manage_announcements(p_scope text, p_system text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.is_core_admin(), false)
    or (p_scope = 'portal' and p_system is not null and (
         public.core_can(public.portal_system_alias(p_system) || ':approve')
         or exists (select 1 from public.staff_members s join public.staff_roles r on r.staff_id = s.id
              where s.user_id = auth.uid() and s.is_active and r.role_code = 'coordinator'
                and r.system_code in (p_system, public.portal_system_alias(p_system)) and r.ended_on is null))) $$;

create policy pa_manage_select on public.portal_announcements for select to authenticated
  using (public.portal_can_manage_announcements(scope, system_code));
create policy pa_manage_insert on public.portal_announcements for insert to authenticated
  with check (public.portal_can_manage_announcements(scope, system_code));
create policy pa_manage_update on public.portal_announcements for update to authenticated
  using (public.portal_can_manage_announcements(scope, system_code))
  with check (public.portal_can_manage_announcements(scope, system_code));
create policy pa_manage_delete on public.portal_announcements for delete to authenticated
  using (public.portal_can_manage_announcements(scope, system_code));
grant select, insert, update, delete on public.portal_announcements to authenticated;

create trigger t_touch_portal_announcements before update on public.portal_announcements
  for each row execute function public.touch_updated_at();

-- الرسائل الفعّالة لبوابة: مركزية أولاً ثم الخاصة، بلا تكرار للنص نفسه
create or replace function public.portal_announcements_active(p_system text, p_page text default 'all')
returns jsonb language sql stable security definer set search_path = '' as $$
  with a as (
    select x.*, row_number() over (partition by lower(btrim(x.message)) order by (x.scope = 'central') desc, x.sort_order, x.created_at) rn
    from public.portal_announcements x
    where auth.uid() is not null and x.is_active and x.starts_at <= now() and (x.ends_at is null or x.ends_at > now())
      and (p_page = 'home' or x.show_on = 'all')
      and ((x.scope = 'central' and (cardinality(x.targets) = 0 or p_system = any (x.targets)))
        or (x.scope = 'portal' and x.system_code = p_system)))
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'scope', scope, 'kind', kind, 'priority', priority, 'message', message)
    order by (scope = 'central') desc, (priority = 'important') desc, sort_order, created_at), '[]'::jsonb)
  from a where rn = 1 $$;
revoke all on function public.portal_announcements_active(text, text) from public, anon;
grant execute on function public.portal_announcements_active(text, text) to authenticated;
revoke all on function public.portal_can_manage_announcements(text, text) from public, anon;
grant execute on function public.portal_can_manage_announcements(text, text) to authenticated;
