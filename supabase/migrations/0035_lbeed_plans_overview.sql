-- نظرة عامة على الخطط الذكية: نسب الإنجاز والبرنامج القادم (قراءة فقط)
create or replace function public.lb_plans_overview() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; td date := (now() at time zone 'Asia/Riyadh')::date;
begin
  if not public.lb_ok() then raise exception 'forbidden'; end if;
  with p as (select *, (coalesce(status,'') ~ 'منف|مكتمل|تم|انته') as done, (coalesce(status,'') ~ 'قيد|جار|بدأ' and coalesce(status,'') !~ 'لم') as run from public.lb_programs()),
  pl as (select plan_id, coalesce((select l.name from public.lb_plans() l where l.plan_id = p.plan_id), 'خطة ' || p.plan_id) as name, count(*) n, count(*) filter (where done) d, count(*) filter (where run) r from p where plan_id is not null group by plan_id)
  select jsonb_build_object(
    'total', (select count(*) from p), 'done', (select count(*) from p where done), 'running', (select count(*) from p where run),
    'late', (select count(*) from p where not done and planned_date < td),
    'next', (select to_jsonb(x) from (select name, planned_date as day, planned_end as until, owner_name as owner, beneficiary, status from p where not done and planned_date >= td order by planned_date limit 1) x),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'n', n, 'done', d, 'running', r) order by n desc) from pl), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke execute on function public.lb_plans_overview() from public, anon;
grant execute on function public.lb_plans_overview() to authenticated;
