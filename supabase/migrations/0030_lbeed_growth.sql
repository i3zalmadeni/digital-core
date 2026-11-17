-- 0030: «يحدث في لبيد» – النمو المهني (مجاميع من مجتمع لبيد المهني). الاحتياجات مجمعة حسب المجال دون أسماء المعلمين.
create or replace function public.lb_growth()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare r jsonb;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'records_total', (select count(*) from public.pc_growth_records),
    'records_30d', (select count(*) from public.pc_growth_records where created_at > now() - interval '30 days'),
    'pending_review', (select count(*) from public.pc_growth_records where status in ('pending','submitted','review')),
    'approved_hours', (select coalesce(sum(hours), 0) from public.pc_growth_records where status = 'approved'),
    'plans', (select count(*) from public.pc_growth_plans),
    'target_hours', (select coalesce(sum(target_hours), 0) from public.pc_growth_plans),
    'teachers', (select count(*) from public.staff_members where is_active and job_title = 'teacher'),
    'latest', coalesce((select jsonb_agg(x) from (select jsonb_build_object('title', g.title, 'kind', g.kind, 'hours', g.hours, 'done_on', g.done_on, 'provider', g.provider, 'who', s.full_name, 'link', '/teachers-community/#/growth') x
        from public.pc_growth_records g join public.staff_members s on s.id = g.staff_id where g.status = 'approved' order by coalesce(g.reviewed_at, g.created_at) desc limit 5) q), '[]'::jsonb),
    'needs_open', (select count(*) from public.pc_needs where status = 'open'),
    'needs', coalesce((select jsonb_agg(x order by (x ->> 'n')::int desc) from (select jsonb_build_object('domain', domain_title, 'n', count(*), 'high', count(*) filter (where level = 'high')) x
        from public.pc_needs where status = 'open' group by domain_title) q), '[]'::jsonb),
    'initiatives', coalesce((select jsonb_agg(x) from (select jsonb_build_object('title', i.title, 'status', i.status, 'from', i.start_on, 'to', i.end_on, 'owner', s.full_name, 'link', '/teachers-community/#/community/' || i.community_id) x
        from public.pc_initiatives i left join public.staff_members s on s.id = i.owner_id order by i.created_at desc limit 4) q), '[]'::jsonb),
    'outputs_30d', (select count(*) from public.pc_outputs where created_at > now() - interval '30 days') + (select count(*) from public.pc_resources where created_at > now() - interval '30 days'),
    'last_at', (select max(t) from (select max(updated_at) t from public.pc_growth_records union all select max(updated_at) from public.pc_growth_plans union all select max(updated_at) from public.pc_needs) z)
  ) into r;
  return r;
end $$;
revoke all on function public.lb_growth() from public, anon;
grant execute on function public.lb_growth() to authenticated;
