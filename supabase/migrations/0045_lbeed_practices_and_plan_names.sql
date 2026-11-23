-- 0045: «يحدث في لبيد» – (1) اسم الخطة الأساسية من lb_plans() بدل «خطة N»؛ (2) lb_practices_detail لبطاقة الممارسات التعليمية.
-- تعتمد على 0044 (lb_plans). قراءة فقط.

create or replace function public.lb_plans_detail() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; td date := (now() at time zone 'Asia/Riyadh')::date;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  with meta as (
    select x.pid, jsonb_object_agg(x.k, x.v order by x.at) m from (
      select coalesce(r.data ->> 'planId', r.data -> 'plan' ->> 'id') pid, r.created_at at, e.key k, e.value v
      from public.sp_records r, lateral jsonb_each(case when r.data ->> 'type' = 'plan-add' then r.data -> 'plan' else r.data -> 'fields' end) e
      where r.col = 'executions' and r.data ->> 'type' in ('plan-add', 'plan-edit')) x
    where x.pid ~ '^\d+$' group by x.pid),
  stf as (select distinct on (full_name) full_name, job_title, case when publish_public then public_photo_path end photo from public.staff_members where is_active order by full_name, created_at),
  pr as (
    select p.*, coalesce(p.status, '') ~ 'منف|مكتمل|تم|انته' as done, (coalesce(p.status, '') ~ 'قيد|جار|بدأ' and coalesce(p.status, '') !~ 'لم') as run,
      exists (select 1 from public.sp_records d where d.col = 'executions' and d.data ->> 'type' is null and d.data ->> 'programId' = p.pid) as documented
    from public.lb_programs() p),
  ids as (select pid::int plan_id from meta union select plan_id from pr where plan_id is not null)
  select coalesce(jsonb_agg(o.j order by (o.j ->> 'total')::int desc, o.j ->> 'name'), '[]'::jsonb) into r from (
    select jsonb_build_object(
      'plan_id', i.plan_id, 'name', coalesce(nullif(m.m ->> 'name', ''), (select l.name from public.lb_plans() l where l.plan_id = i.plan_id), 'خطة ' || i.plan_id), 'desc', nullif(m.m ->> 'desc', ''), 'year', m.m ->> 'year',
      'owner', m.m ->> 'owner', 'owner_job', (select s.job_title from stf s where s.full_name = m.m ->> 'owner'), 'owner_photo', (select s.photo from stf s where s.full_name = m.m ->> 'owner'),
      'total', (select count(*) from pr where pr.plan_id = i.plan_id),
      'done', (select count(*) from pr where pr.plan_id = i.plan_id and pr.done),
      'running', (select count(*) from pr where pr.plan_id = i.plan_id and pr.run and not pr.done),
      'late', (select count(*) from pr where pr.plan_id = i.plan_id and not pr.done and pr.planned_date < td),
      'documented', (select count(*) from pr where pr.plan_id = i.plan_id and pr.documented),
      'undocumented', (select count(*) from pr where pr.plan_id = i.plan_id and pr.done and not pr.documented),
      'last_at', (select max(pr.last_at) from pr where pr.plan_id = i.plan_id),
      'programs', coalesce((select jsonb_agg(jsonb_build_object('name', pr.name, 'status', pr.status, 'day', pr.planned_date, 'until', pr.planned_end, 'owner', pr.owner_name,
          'beneficiary', pr.beneficiary, 'documented', pr.documented, 'photo', (select s.photo from stf s where s.full_name = pr.owner_name),
          'state', case when pr.done then 'done' when pr.planned_date < td then 'late' when pr.run then 'run' else 'new' end) order by pr.planned_date nulls last) from pr where pr.plan_id = i.plan_id), '[]'::jsonb)
    ) j from ids i left join meta m on m.pid = i.plan_id::text) o;
  return r;
end $$;

create or replace function public.lb_practices_detail() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(q.j order by q.j ->> 'last' desc nulls last), '[]'::jsonb) into r from (
    select jsonb_build_object(
      'id', p.id, 'title', p.title, 'summary', nullif(p.summary, ''), 'kind', p.kind, 'category', cat.name, 'status', p.status,
      'starts_on', p.starts_on, 'ends_on', p.ends_on, 'owner', o.full_name, 'owner_photo', case when o.publish_public then o.public_photo_path end,
      'link', '/teachers-community/#/practices',
      'members', (select count(*) from public.pc_pr_members m where m.practice_id = p.id),
      'targets', (select count(*) from public.pc_pr_targets t where t.practice_id = p.id),
      'experts', (select count(*) from public.pc_pr_experts e where e.practice_id = p.id),
      'resources', (select count(*) from public.pc_pr_resources x where x.practice_id = p.id),
      'reports_total', (select count(*) from public.pc_pr_reports x where x.practice_id = p.id),
      'reports_approved', (select count(*) from public.pc_pr_reports x where x.practice_id = p.id and x.status = 'approved'),
      'reports_pending', (select count(*) from public.pc_pr_reports x where x.practice_id = p.id and x.status in ('submitted', 'pending')),
      'students', (select coalesce(sum(x.students_count), 0) from public.pc_pr_reports x where x.practice_id = p.id and x.status = 'approved'),
      'support_total', (select count(*) from public.pc_pr_support x where x.practice_id = p.id),
      'support_done', (select count(*) from public.pc_pr_support x where x.practice_id = p.id and x.done_at is not null),
      'member_list', coalesce((select jsonb_agg(jsonb_build_object('name', s.full_name, 'photo', case when s.publish_public then s.public_photo_path end,
          'expert', exists (select 1 from public.pc_pr_experts e where e.practice_id = p.id and e.staff_id = s.id)) order by s.full_name)
        from public.pc_pr_members m join public.staff_members s on s.id = m.staff_id where m.practice_id = p.id), '[]'::jsonb),
      'activity', coalesce((select jsonb_agg(a order by a ->> 'at' desc) from (select a from (
          select jsonb_build_object('kind', 'join', 'text', 'انضمام إلى الممارسة', 'who', s.full_name, 'at', m.joined_at) a
            from public.pc_pr_members m join public.staff_members s on s.id = m.staff_id where m.practice_id = p.id
          union all
          select jsonb_build_object('kind', 'report', 'text', 'تقرير تنفيذ: ' || coalesce(nullif(x.subject, ''), p.title), 'who', s.full_name, 'at', x.created_at)
            from public.pc_pr_reports x left join public.staff_members s on s.id = x.staff_id where x.practice_id = p.id
          union all
          select jsonb_build_object('kind', 'resource', 'text', 'مورد جديد: ' || x.title, 'who', s.full_name, 'at', x.created_at)
            from public.pc_pr_resources x left join public.staff_members s on s.id = x.created_by where x.practice_id = p.id
          union all
          select jsonb_build_object('kind', 'support', 'text', 'طلب دعم من خبير', 'who', s.full_name, 'at', x.created_at)
            from public.pc_pr_support x left join public.staff_members s on s.id = x.requester_id where x.practice_id = p.id) u
          where a ->> 'at' is not null order by a ->> 'at' desc limit 10) y), '[]'::jsonb),
      'last', p.updated_at) j
    from public.pc_practices p
      left join public.pc_pr_categories cat on cat.id = p.category_id
      left join public.staff_members o on o.id = p.owner_id
    where p.status = 'open' ) q;
  return r;
end $$;
revoke all on function public.lb_practices_detail() from public, anon;
grant execute on function public.lb_practices_detail() to authenticated;
