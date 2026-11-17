-- 0027: «يحدث في لبيد» – دوال عرض «اليوم» و«الأسبوع» وشريط التميز. قراءة فقط، دون جداول جديدة.
-- لا تُرجع أسماء متعلمين إلا في ما هو منشور أصلاً في لوحة الشرف (قيمي)، ولا أي حالة فردية في الحضور.

create or replace function public.lb_day(p_day date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  d date := coalesce(p_day, (now() at time zone 'Asia/Riyadh')::date);
  today date := (now() at time zone 'Asia/Riyadh')::date;
  nowt time := (now() at time zone 'Asia/Riyadh')::time;
  ds timestamptz := (d::timestamp at time zone 'Asia/Riyadh');
  de timestamptz := ((d + 1)::timestamp at time zone 'Asia/Riyadh');
  yr uuid := public.ind_current_year();
  meetings jsonb; programs jsonb; att jsonb; fac jsonb; due jsonb; ind jsonb; plans jsonb; com jsonb; qm jsonb; src jsonb; pulse jsonb;
  v_sess int; v_enr int; v_abs_u int; v_abs_e int; v_late int; v_secs int; v_school int; n_rec int;
  n_se int; n_pc int; n_prog int; n_book int; n_due int; n_over int; fac_total int; fac_busy int;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;

  -- الاجتماعات واللقاءات
  select coalesce(jsonb_agg(x order by x ->> 'starts_at'), '[]'::jsonb) into meetings from (
    select jsonb_build_object('sys', 'community', 'id', m.id, 'team', c.name, 'title', m.title, 'starts_at', m.starts_at,
      'ends_at', m.starts_at + make_interval(mins => coalesce(m.duration_min, 60)), 'location', m.location, 'owner', s.full_name,
      'state', case when m.status = 'cancelled' then 'cancelled' when m.status = 'postponed' then 'postponed' when now() < m.starts_at then 'upcoming'
                    when now() < m.starts_at + make_interval(mins => coalesce(m.duration_min, 60)) then 'running' else 'ended' end,
      'doc', case when mi.status = 'approved' then 'documented' when mi.status = 'review' then 'pending' else 'none' end,
      'link', '/teachers-community/#/community/' || m.community_id,
      'actions', case when mi.status = 'approved' then coalesce((select jsonb_agg(jsonb_build_object('title', a.title, 'assignee', sa.full_name, 'due', a.due_on))
          from public.pc_minute_actions a left join public.staff_members sa on sa.id = a.assignee_id where a.minute_id = mi.id), '[]'::jsonb) else '[]'::jsonb end) x
    from public.pc_meetings m join public.pc_communities c on c.id = m.community_id left join public.staff_members s on s.id = c.leader_id
    left join lateral (select mm.id, mm.status from public.pc_minutes mm where mm.meeting_id = m.id order by mm.version desc limit 1) mi on true
    where m.starts_at >= ds and m.starts_at < de
    union all
    select jsonb_build_object('sys', 'saas', 'id', m.id, 'team', 'فريق التقويم الذاتي' || coalesce(' – ' || dm.name_ar, ''), 'title', m.title,
      'starts_at', ((m.meeting_date + coalesce(m.start_time, time '08:00'))::timestamp at time zone 'Asia/Riyadh'),
      'ends_at', null, 'location', m.location, 'owner', s.full_name,
      'state', case when m.status = 'cancelled' then 'cancelled' when m.status = 'held' then 'ended'
                    when now() < ((m.meeting_date + coalesce(m.start_time, time '08:00'))::timestamp at time zone 'Asia/Riyadh') then 'upcoming'
                    when now() < ((m.meeting_date + coalesce(m.start_time, time '08:00'))::timestamp at time zone 'Asia/Riyadh') + interval '1 hour' then 'running' else 'ended' end,
      'doc', case when mm.approved_at is not null then 'documented' when mm.id is not null then 'pending' else 'none' end,
      'link', '/self-evaluation/admin.html', 'actions', '[]'::jsonb)
    from public.se_meetings m left join public.se_domains dm on dm.id = m.domain_id left join public.staff_members s on s.id = m.created_by
    left join lateral (select x.id, x.approved_at from public.se_meeting_minutes x where x.meeting_id = m.id limit 1) mm on true
    where m.meeting_date = d and m.status <> 'draft') q;
  select count(*) into n_se from public.se_meetings where meeting_date = d and status <> 'draft';
  select count(*) into n_pc from public.pc_meetings where starts_at >= ds and starts_at < de;

  -- برامج الخطط الذكية المجدولة (تقع في اليوم أو تمتد إليه)
  select coalesce(jsonb_agg(jsonb_build_object('id', p.pid, 'name', p.name, 'owner', p.owner_name, 'status', p.status, 'from', p.planned_date, 'to', p.planned_end, 'beneficiary', p.beneficiary,
    'plan', (select pl.name from public.lb_plans() pl where pl.plan_id = p.plan_id), 'link', '/smart-plans/') order by p.planned_date), '[]'::jsonb), count(*)
    into programs, n_prog
    from public.lb_programs() p where p.planned_date is not null and d between p.planned_date and coalesce(p.planned_end, p.planned_date);

  -- انضباطي: مجاميع فقط
  select count(*) into v_sess from public.ind_attendance_sessions where day = d;
  select count(*) into v_secs from public.class_sections where is_active and year_id = yr;
  select count(distinct e.student_id) into v_enr from public.student_enrollments e
    join public.ind_attendance_sessions ss on ss.section_id = e.section_id and ss.day = d and e.year_id = ss.year_id where e.status = 'enrolled';
  select count(*) filter (where status = 'absent_unexcused'), count(*) filter (where status = 'absent_excused') into v_abs_u, v_abs_e from public.ind_attendance_records where day = d;
  select count(*) into v_late from public.ind_lateness_records where day = d and voided_at is null;
  select count(*) into v_school from public.student_enrollments where year_id = yr and status = 'enrolled';
  att := jsonb_build_object('recorded', v_sess > 0, 'sections_recorded', v_sess, 'sections_total', v_secs, 'students_in_recorded', v_enr, 'students_total', v_school,
    'absent', v_abs_u + v_abs_e, 'absent_excused', v_abs_e, 'absent_unexcused', v_abs_u, 'present', case when v_sess > 0 then greatest(v_enr - v_abs_u - v_abs_e, 0) end,
    'late', v_late,
    'present_pct', case when v_enr > 0 then round(100.0 * greatest(v_enr - v_abs_u - v_abs_e, 0) / v_enr, 1) end,
    'absent_pct', case when v_enr > 0 then round(100.0 * (v_abs_u + v_abs_e) / v_enr, 1) end);

  -- احجز مرفق
  select coalesce(jsonb_agg(x order by x ->> 'start'), '[]'::jsonb), count(*) filter (where (x ->> 'status') = 'approved') into fac, n_book from (
    select jsonb_build_object('id', b.id, 'facility', fa.name, 'beneficiary', s.full_name, 'purpose', b.purpose, 'status', b.status,
      'start', min(p.starts_at)::text, 'end', max(p.ends_at)::text,
      'state', case when d > today or (d = today and nowt < min(p.starts_at)) then 'upcoming' when d = today and nowt <= max(p.ends_at) then 'running' else 'ended' end, 'link', '/facility-booking/bookings.html') x
    from public.fb_bookings b join public.fb_booking_periods bp on bp.booking_id = b.id and bp.active and bp.booking_date = d
    join public.fb_periods p on p.id = bp.period_id join public.facilities fa on fa.id = b.facility_id left join public.staff_members s on s.id = b.booked_by
    where b.status in ('approved', 'pending') group by b.id, fa.name, s.full_name, b.purpose, b.status) q;
  select count(*) into fac_total from public.facilities f join public.fb_facility_settings fs on fs.facility_id = f.id where fs.is_bookable and f.status = 'operational';
  select count(distinct b.facility_id) into fac_busy from public.fb_bookings b join public.fb_booking_periods bp on bp.booking_id = b.id and bp.active and bp.booking_date = d
    join public.fb_periods p on p.id = bp.period_id where b.status = 'approved' and d = today and nowt between p.starts_at and p.ends_at;
  fac := jsonb_build_object('bookings', fac, 'total_bookable', fac_total, 'busy_now', case when d = today then fac_busy end, 'available_now', case when d = today then greatest(fac_total - fac_busy, 0) end);

  -- المهام والاستحقاقات
  select coalesce(jsonb_agg(x order by x ->> 'sys'), '[]'::jsonb) into due from (
    select jsonb_build_object('sys', 'saas', 'title', k.title, 'owner', s.full_name, 'kind', 'task', 'link', '/self-evaluation/admin.html') x
      from public.se_tasks k left join public.staff_members s on s.id = k.assignee_staff_id where k.due_date = d and k.status not in ('completed', 'cancelled')
    union all
    select jsonb_build_object('sys', 'community', 'title', k.title, 'owner', s.full_name, 'kind', 'task', 'link', '/teachers-community/#/community/' || k.community_id)
      from public.pc_tasks k left join public.staff_members s on s.id = k.assignee_id where k.due_on = d and k.status <> 'done'
    union all
    select jsonb_build_object('sys', 'saas', 'title', k.title, 'owner', null, 'kind', 'deadline', 'link', '/self-evaluation/admin.html')
      from public.se_deadlines k where k.due_date = d) q;
  select jsonb_array_length(due) into n_due;
  select (select count(*) from public.se_tasks where due_date < d and status not in ('completed', 'cancelled')) + (select count(*) from public.pc_tasks where due_on < d and status <> 'done') into n_over;

  -- مؤشرات التقويم المدرسي (الدورة النشطة)
  with cyc as (select id from public.se_cycles where status = 'active' order by starts_on desc nulls last limit 1),
  base as (select i.id, i.code, dm.id dom, dm.name_ar dname, dm.sort_order so from public.se_indicators i join public.se_standards st on st.id = i.standard_id join public.se_domains dm on dm.id = st.domain_id),
  ev as (select e.indicator_id, e.status, e.achievement_pct, e.updated_at from public.se_evaluations e where e.cycle_id in (select id from cyc)),
  ed as (select e.indicator_id, max(e.updated_at) u from public.se_evidence e where e.cycle_id in (select id from cyc) group by 1),
  asg as (select distinct a.indicator_id, min(a.due_date) due from public.se_indicator_assignments a where a.cycle_id in (select id from cyc) group by 1),
  dom as (select b.dom, b.dname, b.so, count(*) total, count(ev.indicator_id) filter (where ev.status = 'approved') approved, count(ev.indicator_id) evaluated,
      count(ed.indicator_id) with_evidence, round(avg(ev.achievement_pct), 1) avg_pct,
      max(greatest(ev.updated_at, ed.u)) last_update,
      count(*) filter (where greatest(ev.updated_at, ed.u) > now() - interval '7 days') changed_7d
    from base b left join ev on ev.indicator_id = b.id left join ed on ed.indicator_id = b.id group by b.dom, b.dname, b.so),
  fu as (select b.code, a.due from base b join asg a on a.indicator_id = b.id left join ev on ev.indicator_id = b.id left join ed on ed.indicator_id = b.id
      where coalesce(ev.status, '') <> 'approved' and a.due is not null and a.due <= d + 7 order by a.due limit 6),
  st as (select b.code, greatest(ev.updated_at, ed.u) last_at from base b join asg a on a.indicator_id = b.id left join ev on ev.indicator_id = b.id left join ed on ed.indicator_id = b.id
      where greatest(ev.updated_at, ed.u) is null or greatest(ev.updated_at, ed.u) < now() - interval '14 days' order by 2 nulls first limit 6)
  select jsonb_build_object('has_cycle', exists (select 1 from cyc),
    'cycle', (select name from public.se_cycles where id in (select id from cyc)),
    'domains', coalesce((select jsonb_agg(jsonb_build_object('name', dname, 'total', total, 'approved', approved, 'evaluated', evaluated, 'with_evidence', with_evidence, 'avg_pct', avg_pct,
        'pct', round(100.0 * approved / nullif(total, 0), 1), 'last_update', last_update, 'changed_7d', changed_7d) order by so) from dom), '[]'::jsonb),
    'total', (select coalesce(sum(total), 0) from dom), 'approved', (select coalesce(sum(approved), 0) from dom), 'changed_7d', (select coalesce(sum(changed_7d), 0) from dom),
    'follow_up', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'due', due)) from fu), '[]'::jsonb),
    'not_updated', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'last', last_at)) from st), '[]'::jsonb),
    'link', '/self-evaluation/admin.html') into ind;

  -- الخطط الذكية: تقدم البرامج حسب الخطة
  with pr as (select p.*, (coalesce(p.status, '') ~ 'منجز|مكتمل|تم') done from public.lb_programs() p),
  g as (select coalesce(pr.plan_id, 0) plan_id, count(*) total, count(*) filter (where done) done,
      count(*) filter (where not done and planned_end is not null and planned_end < d) overdue,
      count(*) filter (where not done and last_at < now() - interval '30 days') stale
    from pr group by 1)
  select jsonb_build_object('plans', coalesce((select jsonb_agg(jsonb_build_object('plan_id', g.plan_id, 'name', coalesce((select pl.name from public.lb_plans() pl where pl.plan_id = g.plan_id), 'خطة رقم ' || g.plan_id),
        'total', g.total, 'done', g.done, 'overdue', g.overdue, 'stale', g.stale, 'pct', round(100.0 * g.done / nullif(g.total, 0), 1),
        'by_status', (select coalesce(jsonb_object_agg(s, n), '{}'::jsonb) from (select coalesce(pr.status, 'غير محدد') s, count(*) n from pr where coalesce(pr.plan_id, 0) = g.plan_id group by 1) z))
        order by g.plan_id) from g), '[]'::jsonb),
    'next7', (select count(*) from pr where not done and planned_date between d and d + 7),
    'last_update', (select max(last_at) from pr), 'link', '/smart-plans/') into plans;

  -- مجتمع لبيد المهني
  select jsonb_build_object(
    'communities_active', (select count(*) from public.pc_communities where status = 'active'),
    'held_today', (select count(*) from public.pc_meetings where starts_at >= ds and starts_at < de and (status = 'held' or starts_at + make_interval(mins => coalesce(duration_min, 60)) < now())),
    'documented_today', (select count(*) from public.pc_meetings m where m.starts_at >= ds and m.starts_at < de and exists (select 1 from public.pc_minutes mi where mi.meeting_id = m.id and mi.status = 'approved')),
    'awaiting_doc', coalesce((select jsonb_agg(jsonb_build_object('title', m.title, 'community', c.name, 'at', m.starts_at, 'link', '/teachers-community/#/community/' || m.community_id) order by m.starts_at desc)
        from (select * from public.pc_meetings mm where mm.status <> 'cancelled' and mm.starts_at < now() and mm.starts_at > now() - interval '30 days'
              and not exists (select 1 from public.pc_minutes mi where mi.meeting_id = mm.id and mi.status in ('review', 'approved')) order by mm.starts_at desc limit 8) m
        join public.pc_communities c on c.id = m.community_id), '[]'::jsonb),
    'latest_minutes', coalesce((select jsonb_agg(jsonb_build_object('title', m.title, 'community', c.name, 'at', mi.approved_at, 'link', '/teachers-community/#/community/' || mi.community_id) order by mi.approved_at desc)
        from (select * from public.pc_minutes x where x.status = 'approved' order by x.approved_at desc nulls last limit 5) mi join public.pc_meetings m on m.id = mi.meeting_id join public.pc_communities c on c.id = mi.community_id), '[]'::jsonb),
    'active_teams', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'activity', t.act, 'link', '/teachers-community/#/community/' || t.id) order by t.act desc)
        from (select * from (select c.id, c.name,
          (select count(*) from public.pc_meetings m where m.community_id = c.id and m.starts_at > now() - interval '30 days')
          + (select count(*) from public.pc_posts p where p.community_id = c.id and p.created_at > now() - interval '30 days')
          + (select count(*) from public.pc_tasks k where k.community_id = c.id and k.created_at > now() - interval '30 days')
          + (select count(*) from public.pc_minutes mi where mi.community_id = c.id and mi.updated_at > now() - interval '30 days') act
          from public.pc_communities c where c.status = 'active') z where z.act > 0 order by z.act desc limit 5) t), '[]'::jsonb),
    'link', '/teachers-community/#/communities') into com;

  -- قيمي: منشور أصلاً في لوحة الشرف
  select jsonb_build_object(
    'top3', coalesce(public.qm_pub_leaderboard('school', null, null, 3, 'all'), '[]'::jsonb),
    'recent_points', coalesce((select jsonb_agg(x) from (select st.full_name student, t.name_ar type, r.points, s.full_name by, r.created_at as "at"
        from public.qm_reinforcements r join public.qm_reinforcement_types t on t.id = r.type_id join public.students st on st.id = r.student_id left join public.staff_members s on s.id = r.given_by
        where r.voided_at is null and r.points > 0 order by r.created_at desc limit 5) x), '[]'::jsonb),
    'recent_badges', coalesce((select jsonb_agg(x) from (select st.full_name student, b.name_ar badge, s.full_name by, sb.created_at as "at"
        from public.qm_student_badges sb join public.qm_badges b on b.id = sb.badge_id join public.students st on st.id = sb.student_id left join public.staff_members s on s.id = sb.awarded_by
        where sb.revoked_at is null order by sb.created_at desc limit 5) x), '[]'::jsonb),
    'values', coalesce((select jsonb_agg(x) from (select t.name_ar name, count(*) n, sum(r.points)::int points from public.qm_reinforcements r join public.qm_reinforcement_types t on t.id = r.type_id
        where r.voided_at is null and r.created_at > now() - interval '30 days' group by t.name_ar order by count(*) desc limit 4) x), '[]'::jsonb),
    'givers', coalesce((select jsonb_agg(x) from (select s.full_name name, sum(g.r)::int reinforcements, sum(g.b)::int badges from (
        select given_by sid, 1 r, 0 b from public.qm_reinforcements where voided_at is null union all select awarded_by, 0, 1 from public.qm_student_badges where revoked_at is null) g
        join public.staff_members s on s.id = g.sid group by s.full_name order by sum(g.r) + sum(g.b) desc limit 3) x), '[]'::jsonb),
    'today', jsonb_build_object('reinforcements', (select count(*) from public.qm_reinforcements where voided_at is null and created_at >= ds and created_at < de),
        'points', (select coalesce(sum(points), 0) from public.qm_points_ledger where created_at >= ds and created_at < de),
        'badges', (select count(*) from public.qm_student_badges where revoked_at is null and created_at >= ds and created_at < de)),
    'week', jsonb_build_object('reinforcements', (select count(*) from public.qm_reinforcements where voided_at is null and created_at > now() - interval '7 days'),
        'badges', (select count(*) from public.qm_student_badges where revoked_at is null and created_at > now() - interval '7 days')),
    'link', '/qiyami/leaderboard.html') into qm;

  -- حالة المصادر: آخر نشاط مسجل في كل نظام (لإظهار التأخر بوضوح)
  src := jsonb_build_object(
    'core', (select max(changed_at) from public.change_events),
    'saas', (select max(g) from (select max(updated_at) g from public.se_evidence union all select max(updated_at) from public.se_evaluations union all select max(updated_at) from public.se_tasks union all select max(created_at) from public.se_meetings) z),
    'plans', (select max(created_at) from public.sp_records where col = 'executions'),
    'community', (select max(g) from (select max(updated_at) g from public.pc_meetings union all select max(created_at) from public.pc_posts union all select max(updated_at) from public.pc_minutes union all select max(updated_at) from public.pc_tasks union all select max(updated_at) from public.pc_growth_records) z),
    'indibati', (select max(saved_at) from public.ind_attendance_sessions),
    'qiyami', (select max(created_at) from public.qm_points_ledger),
    'booking', (select max(updated_at) from public.fb_bookings));

  n_rec := coalesce(((public.lb_feed(ds, de, null, null, null, null, 1, 0)) ->> 'total')::int, 0);
  pulse := jsonb_build_object('meetings', n_se, 'programs', n_prog, 'pro_meetings', n_pc, 'present_pct', att -> 'present_pct', 'absent', case when v_sess > 0 then v_abs_u + v_abs_e end,
    'late', case when v_sess > 0 then v_late end, 'bookings', n_book, 'tasks_due', n_due, 'overdue', n_over, 'records', n_rec, 'attendance_recorded', v_sess > 0);

  return jsonb_build_object('day', d, 'is_today', d = today, 'generated_at', now(), 'pulse', pulse, 'meetings', meetings, 'programs', programs, 'attendance', att,
    'facilities', fac, 'due', due, 'indicators', ind, 'plans', plans, 'community', com, 'qiyami', qm, 'sources', src);
end $$;

-- «الأسبوع»: الأحداث الموحدة + حصاد الأسبوع (الأسبوع يبدأ الأحد)
create or replace function public.lb_week(p_from date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  base date := coalesce(p_from, (now() at time zone 'Asia/Riyadh')::date);
  w0 date := base - extract(dow from base)::int;
  w1 date := w0 + 7;
  a timestamptz := (w0::timestamp at time zone 'Asia/Riyadh');
  b timestamptz := (w1::timestamp at time zone 'Asia/Riyadh');
  ev jsonb; hv jsonb; ach jsonb;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(x order by x ->> 'day', coalesce(x ->> 'starts_at', '')), '[]'::jsonb) into ev from (
    select jsonb_build_object('day', (m.starts_at at time zone 'Asia/Riyadh')::date, 'kind', 'meeting', 'sys', 'community', 'title', m.title, 'team', c.name, 'starts_at', m.starts_at,
      'place', m.location, 'owner', s.full_name, 'state', case when m.status = 'cancelled' then 'cancelled' when m.starts_at + make_interval(mins => coalesce(m.duration_min, 60)) < now() then 'ended' when m.starts_at < now() then 'running' else 'upcoming' end,
      'doc', case when exists (select 1 from public.pc_minutes mi where mi.meeting_id = m.id and mi.status = 'approved') then 'documented' when exists (select 1 from public.pc_minutes mi where mi.meeting_id = m.id and mi.status = 'review') then 'pending' else 'none' end,
      'link', '/teachers-community/#/community/' || m.community_id) x
      from public.pc_meetings m join public.pc_communities c on c.id = m.community_id left join public.staff_members s on s.id = c.leader_id where m.starts_at >= a and m.starts_at < b
    union all
    select jsonb_build_object('day', m.meeting_date, 'kind', 'meeting', 'sys', 'saas', 'title', m.title, 'team', 'فريق التقويم الذاتي', 'starts_at', ((m.meeting_date + coalesce(m.start_time, time '08:00'))::timestamp at time zone 'Asia/Riyadh'),
      'place', m.location, 'owner', s.full_name, 'state', case when m.status = 'cancelled' then 'cancelled' when m.status = 'held' then 'ended' else 'upcoming' end, 'link', '/self-evaluation/admin.html')
      from public.se_meetings m left join public.staff_members s on s.id = m.created_by where m.meeting_date >= w0 and m.meeting_date < w1 and m.status <> 'draft'
    union all
    select jsonb_build_object('day', p.planned_date, 'kind', 'program', 'sys', 'plans', 'title', p.name, 'owner', p.owner_name, 'status', p.status, 'until', p.planned_end, 'beneficiary', p.beneficiary, 'link', '/smart-plans/')
      from public.lb_programs() p where p.planned_date >= w0 and p.planned_date < w1
    union all
    select jsonb_build_object('day', bp.booking_date, 'kind', 'booking', 'sys', 'booking', 'title', fa.name || ' – ' || coalesce(bk.purpose, 'حجز'), 'owner', s.full_name,
        'from', min(pe.starts_at)::text, 'to', max(pe.ends_at)::text, 'state', case when bk.status = 'pending' then 'pending' else 'approved' end, 'link', '/facility-booking/bookings.html')
      from public.fb_bookings bk join public.fb_booking_periods bp on bp.booking_id = bk.id and bp.active join public.fb_periods pe on pe.id = bp.period_id
      join public.facilities fa on fa.id = bk.facility_id left join public.staff_members s on s.id = bk.booked_by
      where bk.status in ('approved', 'pending') and bp.booking_date >= w0 and bp.booking_date < w1 group by bp.booking_date, bk.id, fa.name, bk.purpose, s.full_name, bk.status
    union all
    select jsonb_build_object('day', k.due_date, 'kind', 'deadline', 'sys', 'saas', 'title', k.title, 'link', '/self-evaluation/admin.html') from public.se_deadlines k where k.due_date >= w0 and k.due_date < w1
    union all
    select jsonb_build_object('day', k.due_date, 'kind', 'task', 'sys', 'saas', 'title', k.title, 'owner', s.full_name, 'link', '/self-evaluation/admin.html')
      from public.se_tasks k left join public.staff_members s on s.id = k.assignee_staff_id where k.due_date >= w0 and k.due_date < w1 and k.status not in ('cancelled')
    union all
    select jsonb_build_object('day', k.due_on, 'kind', 'task', 'sys', 'community', 'title', k.title, 'owner', s.full_name, 'link', '/teachers-community/#/community/' || k.community_id)
      from public.pc_tasks k left join public.staff_members s on s.id = k.assignee_id where k.due_on >= w0 and k.due_on < w1
    union all
    select jsonb_build_object('day', c.ends_on, 'kind', 'calendar', 'sys', 'saas', 'title', 'نهاية ' || c.name, 'link', '/self-evaluation/admin.html') from public.se_cycles c where c.ends_on >= w0 and c.ends_on < w1
    union all
    select jsonb_build_object('day', c.starts_on, 'kind', 'calendar', 'sys', 'saas', 'title', 'بداية ' || c.name, 'link', '/self-evaluation/admin.html') from public.se_cycles c where c.starts_on >= w0 and c.starts_on < w1) q;

  select coalesce(jsonb_agg(x), '[]'::jsonb) into ach from (select e ->> 'title' as title, e ->> 'actor' as actor, e ->> 'at' as "at", e ->> 'sys' as sys, e ->> 'link' as link
    from jsonb_array_elements((public.lb_feed(a, least(b, now()), null, null, null, true, 8, 0)) -> 'items') e) x;

  hv := jsonb_build_object(
    'meetings_held', (select count(*) from public.pc_meetings where starts_at >= a and starts_at < least(b, now()) and status <> 'cancelled' and status <> 'postponed')
        + (select count(*) from public.se_meetings where meeting_date >= w0 and meeting_date < w1 and status = 'held'),
    'documented', (select count(*) from public.pc_minutes where status = 'approved' and approved_at >= a and approved_at < b) + (select count(*) from public.se_meeting_minutes where approved_at >= a and approved_at < b),
    'programs_done', (select count(*) from public.lb_programs() p where p.planned_date >= w0 and p.planned_date < w1 and coalesce(p.status, '') ~ 'منجز|مكتمل|تم'),
    'programs_planned', (select count(*) from public.lb_programs() p where p.planned_date >= w0 and p.planned_date < w1),
    'achievements', coalesce(((public.lb_feed(a, least(b, now()), null, null, null, true, 1, 0)) ->> 'total')::int, 0),
    'badges', (select count(*) from public.qm_student_badges where revoked_at is null and created_at >= a and created_at < b),
    'reinforcements', (select count(*) from public.qm_reinforcements where voided_at is null and created_at >= a and created_at < b),
    'indicators_changed', (select count(*) from public.se_evaluations where updated_at >= a and updated_at < b),
    'evidence_added', (select count(*) from public.se_evidence where created_at >= a and created_at < b),
    'records', coalesce(((public.lb_feed(a, least(b, now()), null, null, null, null, 1, 0)) ->> 'total')::int, 0),
    'attendance_days', (select count(distinct day) from public.ind_attendance_sessions where day >= w0 and day < w1),
    'highlights', ach);
  return jsonb_build_object('from', w0, 'to', w1 - 1, 'events', ev, 'harvest', hv, 'generated_at', now());
end $$;

-- شريط التميز والعطاء: كل عنصر من بيانات فعلية، والقسم الخالي لا يظهر
create or replace function public.lb_ticker()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb := '[]'::jsonb; x record;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  for x in select s.full_name nm, count(*) n from public.qm_student_badges sb join public.staff_members s on s.id = sb.awarded_by where sb.revoked_at is null group by s.full_name order by count(*) desc, s.full_name limit 3 loop
    r := r || jsonb_build_array(jsonb_build_object('type', 'badge_giver', 'tag', 'الأكثر منحاً للأوسمة', 'text', x.nm || ' – ' || x.n || ' وساماً', 'link', '/qiyami/leaderboard.html')); end loop;
  for x in select s.full_name nm, count(*) n from public.qm_reinforcements rr join public.staff_members s on s.id = rr.given_by where rr.voided_at is null group by s.full_name order by count(*) desc, s.full_name limit 3 loop
    r := r || jsonb_build_array(jsonb_build_object('type', 'giver', 'tag', 'الأكثر عطاءً في التعزيز', 'text', x.nm || ' – ' || x.n || ' تعزيزاً', 'link', '/qiyami/leaderboard.html')); end loop;
  for x in select c.id, c.name, (select count(*) from public.pc_meetings m where m.community_id = c.id and m.starts_at > now() - interval '30 days')
        + (select count(*) from public.pc_posts p where p.community_id = c.id and p.created_at > now() - interval '30 days')
        + (select count(*) from public.pc_tasks k where k.community_id = c.id and k.created_at > now() - interval '30 days')
        + (select count(*) from public.pc_minutes mi where mi.community_id = c.id and mi.updated_at > now() - interval '30 days') act
      from public.pc_communities c where c.status = 'active' order by 3 desc limit 3 loop
    if x.act > 0 then r := r || jsonb_build_array(jsonb_build_object('type', 'team', 'tag', 'من أنشط الفرق', 'text', x.name || ' – ' || x.act || ' نشاطاً خلال 30 يوماً', 'link', '/teachers-community/#/community/' || x.id)); end if; end loop;
  for x in select g.title, s.full_name nm from public.pc_growth_records g join public.staff_members s on s.id = g.staff_id where g.status = 'approved' and g.kind in ('workshop', 'visit', 'publication', 'award') order by g.reviewed_at desc nulls last limit 3 loop
    r := r || jsonb_build_array(jsonb_build_object('type', 'practice', 'tag', 'ممارسة مهنية معتمدة', 'text', x.title || ' – ' || x.nm, 'link', '/teachers-community/#/growth')); end loop;
  for x in select e ->> 'title' as title, e ->> 'actor' as actor, e ->> 'link' as link from jsonb_array_elements((public.lb_feed(now() - interval '14 days', null, null, null, null, true, 60, 0)) -> 'items') e where e ->> 'kind' not in ('points', 'attendance') limit 6 loop
    r := r || jsonb_build_array(jsonb_build_object('type', 'achievement', 'tag', 'إنجاز حديث', 'text', x.title || coalesce(' – ' || x.actor, ''), 'link', x.link)); end loop;
  return r;
end $$;

revoke all on function public.lb_day(date), public.lb_week(date), public.lb_ticker() from public, anon;
grant execute on function public.lb_day(date), public.lb_week(date), public.lb_ticker() to authenticated;
-- المساعدات الداخلية لا تُستدعى مباشرة من المتصفح
revoke execute on function public.lb_programs(), public.lb_plans() from authenticated;
