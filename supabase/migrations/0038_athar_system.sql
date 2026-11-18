-- إضافة بوابة «أثر» (قياس الأثر وإدارة الاستبانات) إلى سجل الأنظمة، وتعيين منسقها: عبدالعزيز يوسف عبدالرحمن المديني.
insert into public.systems (code, name_ar, status, description, scopes)
values ('athar', 'نظام أثر', 'connected', 'قياس الأثر وإدارة الاستبانات وإعداد الدراسات والتوصيات', array['school:read','staff:read','identity:verify'])
on conflict (code) do nothing;

-- السماح بدور «منسق» على أثر، وبإعلانات اللوحة الموحدة له
alter table public.staff_roles drop constraint if exists staff_roles_coordinator_scope_chk;
alter table public.staff_roles add constraint staff_roles_coordinator_scope_chk
  check (role_code <> 'coordinator' or system_code is null or system_code = any (array['self_evaluation','teachers_community','smart_plans','labeed_facilities','athar'])) not valid;
alter table public.portal_announcements drop constraint if exists portal_announcements_system_code_check;
alter table public.portal_announcements add constraint portal_announcements_system_code_check
  check (system_code in ('core','self_evaluation','smart_plans','teachers_community','indibati','qiyami','facility_booking','mirat','athar'));

-- منسق أثر (تكليف واحد فعّال لكل نظام)
insert into public.staff_roles (staff_id, role_code, system_code)
select id, 'coordinator', 'athar' from public.staff_members
where id = '826c620d-3e13-4117-a4e8-0fde2cdaa456'
  and not exists (select 1 from public.staff_roles r where r.role_code = 'coordinator' and r.system_code = 'athar' and r.ended_on is null);
