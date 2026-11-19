-- «يحدث في لبيد» التفاعلية: تفاصيل كل خطة وكل مجتمع مهني (قراءة فقط، لمنسوبي المدرسة المفعّلة حساباتهم)

-- تفاصيل الخطط الذكية: لكل خطة مسؤولها وصورته وبرامجها وحالاتها وتوثيقها
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
      'plan_id', i.plan_id, 'name', coalesce(m.m ->> 'name', 'خطة ' || i.plan_id), 'desc', nullif(m.m ->> 'desc', ''), 'year', m.m ->> 'year',
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

-- تفاصيل المجتمعات المهنية: الأعضاء واللقاءات والحضور والتوثيق والمحاضر والمهام، مع سجل نشاط مفصل
create or replace function public.lb_communities_detail() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(q.j order by q.j ->> 'last' desc nulls last), '[]'::jsonb) into r from (
    select jsonb_build_object(
      'id', c.id, 'name', c.name, 'kind', c.kind, 'domain', c.domain, 'description', nullif(c.description, ''), 'objectives', nullif(c.objectives, ''), 'start_on', c.start_on, 'end_on', c.end_on,
      'leader', ld.full_name, 'leader_photo', case when ld.publish_public then ld.public_photo_path end,
      'link', '/teachers-community/#/community/' || c.id,
      'members', (select count(*) from public.pc_community_members m where m.community_id = c.id and m.status = 'active'),
      'member_list', coalesce((select jsonb_agg(jsonb_build_object('name', s.full_name, 'role', m.role, 'photo', case when s.publish_public then s.public_photo_path end) order by (m.role = 'leader') desc, m.sort_order, s.full_name)
        from public.pc_community_members m join public.staff_members s on s.id = m.staff_id where m.community_id = c.id and m.status = 'active'), '[]'::jsonb),
      'meetings_total', (select count(*) from public.pc_meetings x where x.community_id = c.id),
      'meetings_held', (select count(*) from public.pc_meetings x where x.community_id = c.id and x.status = 'held'),
      'meetings_upcoming', (select count(*) from public.pc_meetings x where x.community_id = c.id and x.status = 'planned' and x.starts_at >= now()),
      'meetings_cancelled', (select count(*) from public.pc_meetings x where x.community_id = c.id and x.status in ('cancelled', 'postponed')),
      'docs', (select count(*) from public.pc_meeting_docs d where d.community_id = c.id),
      'minutes_approved', (select count(*) from public.pc_minutes mi where mi.community_id = c.id and mi.approved_at is not null),
      'minutes_pending', (select count(*) from public.pc_minutes mi where mi.community_id = c.id and mi.approved_at is null and mi.submitted_at is not null),
      'att_total', (select count(*) from public.pc_meeting_attendance a where a.community_id = c.id),
      'att_present', (select count(*) from public.pc_meeting_attendance a where a.community_id = c.id and a.status = 'present'),
      'att_approved', (select count(*) from public.pc_meeting_attendance a where a.community_id = c.id and a.approval = 'approved'),
      'hours', (select coalesce(sum(a.hours), 0) from public.pc_meeting_attendance a where a.community_id = c.id and a.approval = 'approved'),
      'tasks_open', (select count(*) from public.pc_tasks t where t.community_id = c.id and t.status <> 'done'),
      'tasks_done', (select count(*) from public.pc_tasks t where t.community_id = c.id and t.status = 'done'),
      'tasks_late', (select count(*) from public.pc_tasks t where t.community_id = c.id and t.status <> 'done' and t.due_on < (now() at time zone 'Asia/Riyadh')::date),
      'posts', (select count(*) from public.pc_posts p where p.community_id = c.id),
      'outputs', (select count(*) from public.pc_outputs o where o.community_id = c.id),
      'meetings', coalesce((select jsonb_agg(w order by w ->> 'at' desc) from (
        select jsonb_build_object('no', x.meeting_no, 'title', x.title, 'at', x.starts_at, 'status', x.status, 'location', x.location, 'mode', x.mode,
          'present', (select count(*) from public.pc_meeting_attendance a where a.meeting_id = x.id and a.status = 'present'),
          'invited', (select count(*) from public.pc_meeting_attendance a where a.meeting_id = x.id),
          'documented', exists (select 1 from public.pc_meeting_docs d where d.meeting_id = x.id),
          'images', (select coalesce(sum(jsonb_array_length(case when jsonb_typeof(d.images) = 'array' then d.images else '[]'::jsonb end)), 0) from public.pc_meeting_docs d where d.meeting_id = x.id),
          'minutes', (select mi.status from public.pc_minutes mi where mi.meeting_id = x.id limit 1),
          'decisions', nullif(x.decisions, '')) w
        from public.pc_meetings x where x.community_id = c.id order by x.starts_at desc limit 8) z), '[]'::jsonb),
      'activity', coalesce((select jsonb_agg(a order by a ->> 'at' desc) from (select a from (
          select jsonb_build_object('kind', 'meeting', 'text', case x.status when 'held' then 'تم تنفيذ لقاء «' else 'جدولة لقاء «' end || x.title || '»' || coalesce(' · ' || x.location, ''), 'who', s.full_name, 'at', case when x.status = 'held' then x.starts_at else x.created_at end) a
            from public.pc_meetings x left join public.staff_members s on s.id = x.created_by where x.community_id = c.id
          union all
          select jsonb_build_object('kind', 'attendance', 'text', 'تأكيد حضور لقاء «' || x.title || '»', 'who', s.full_name, 'at', a.self_confirmed_at)
            from public.pc_meeting_attendance a join public.pc_meetings x on x.id = a.meeting_id join public.staff_members s on s.id = a.staff_id where a.community_id = c.id and a.self_confirmed_at is not null
          union all
          select jsonb_build_object('kind', 'approval', 'text', 'اعتماد حضور ' || coalesce(a.hours::text || ' ساعة ', '') || 'في «' || x.title || '»', 'who', s.full_name, 'at', a.decided_at)
            from public.pc_meeting_attendance a join public.pc_meetings x on x.id = a.meeting_id join public.staff_members s on s.id = a.staff_id where a.community_id = c.id and a.approval = 'approved' and a.decided_at is not null
          union all
          select jsonb_build_object('kind', 'doc', 'text', 'توثيق لقاء «' || x.title || '»' || coalesce(' · المشاركون: ' || d.participants, '') , 'who', s.full_name, 'at', d.created_at)
            from public.pc_meeting_docs d join public.pc_meetings x on x.id = d.meeting_id left join public.staff_members s on s.id = d.created_by where d.community_id = c.id
          union all
          select jsonb_build_object('kind', 'minutes', 'text', case when mi.approved_at is not null then 'اعتماد محضر لقاء «' else 'رفع محضر لقاء «' end || x.title || '»', 'who', s.full_name, 'at', coalesce(mi.approved_at, mi.submitted_at))
            from public.pc_minutes mi join public.pc_meetings x on x.id = mi.meeting_id left join public.staff_members s on s.id = coalesce(mi.approved_by, mi.prepared_by) where mi.community_id = c.id and coalesce(mi.approved_at, mi.submitted_at) is not null
          union all
          select jsonb_build_object('kind', 'task', 'text', case when t.status = 'done' then 'إنجاز مهمة «' else 'مهمة جديدة «' end || t.title || '»' || coalesce(' · موعدها ' || t.due_on::text, ''), 'who', s.full_name, 'at', case when t.status = 'done' then t.updated_at else t.created_at end)
            from public.pc_tasks t left join public.staff_members s on s.id = t.assignee_id where t.community_id = c.id
          union all
          select jsonb_build_object('kind', 'post', 'text', 'منشور: ' || p.title, 'who', s.full_name, 'at', p.created_at)
            from public.pc_posts p left join public.staff_members s on s.id = p.author_id where p.community_id = c.id
          union all
          select jsonb_build_object('kind', 'output', 'text', 'مُخرَج جديد: ' || o.title, 'who', s.full_name, 'at', o.created_at)
            from public.pc_outputs o left join public.staff_members s on s.id = o.created_by where o.community_id = c.id) u
          where a ->> 'at' is not null order by a ->> 'at' desc limit 14) y), '[]'::jsonb),
      'last', greatest(c.updated_at, (select max(mm.updated_at) from public.pc_meetings mm where mm.community_id = c.id), (select max(p.created_at) from public.pc_posts p where p.community_id = c.id))
    ) j
    from public.pc_communities c left join public.staff_members ld on ld.id = c.leader_id where c.status = 'active') q;
  return r;
end $$;

revoke all on function public.lb_plans_detail(), public.lb_communities_detail() from public, anon;
grant execute on function public.lb_plans_detail(), public.lb_communities_detail() to authenticated;
