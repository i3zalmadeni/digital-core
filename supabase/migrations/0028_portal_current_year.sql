-- العام الدراسي الحالي لبطاقة الترحيب (مطبّق باسم core_0028_portal_current_year)
create or replace function public.portal_current_year() returns text
language sql stable security definer set search_path = '' as $$
  select name from public.academic_years where status = 'current' and auth.uid() is not null order by starts_on desc limit 1 $$;
revoke all on function public.portal_current_year() from public, anon;
grant execute on function public.portal_current_year() to authenticated;
