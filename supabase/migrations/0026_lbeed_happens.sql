-- 0026: «يحدث في لبيد» – طبقة قراءة وتجميع موحدة (لا جداول جديدة ولا نسخ للسجلات).
-- الأنظمة الأصلية هي المصدر الوحيد للحقيقة؛ هذه الدوال للقراءة فقط وتُرجع مجاميع وعناوين لا بيانات حساسة.
-- الوصول: منسوب فعّال بحساب نشط فقط (lb_ok). لا وصول لـ anon. لا ربط بنظام مرآة.

create or replace function public.lb_ok() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_members s where s.user_id = auth.uid() and s.is_active and s.account_status = 'active') $$;

-- برامج الخطط الذكية بحالتها الحالية: سجل الإضافة + تعديلات الحقول − المحذوف
create or replace function public.lb_programs()
returns table(pid text, name text, status text, planned_date date, planned_end date, owner_name text, plan_id int, beneficiary text, created_at timestamptz, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with adds as (
    select 'c-' || r.id::text as pid, r.data -> 'data' as d, r.created_at
    from public.sp_records r where r.col = 'executions' and r.data ->> 'type' = 'add' and jsonb_typeof(r.data -> 'data') = 'object'),
  rem as (select r.data ->> 'progId' as pid from public.sp_records r where r.col = 'executions' and r.data ->> 'type' = 'remove'),
  ed as (
    select r.data ->> 'progId' as pid, max(r.created_at) as last_at, jsonb_object_agg(e.key, e.value order by r.created_at) as f
    from public.sp_records r, lateral jsonb_each(r.data -> 'fields') e
    where r.col = 'executions' and r.data ->> 'type' = 'edit' and jsonb_typeof(r.data -> 'fields') = 'object' group by 1)
  select a.pid, coalesce(m.d ->> 'name', ''), m.d ->> 'status',
    case when m.d ->> 'planned_date' ~ '^\d{4}-\d\d-\d\d$' then (m.d ->> 'planned_date')::date end,
    case when m.d ->> 'planned_end' ~ '^\d{4}-\d\d-\d\d$' then (m.d ->> 'planned_end')::date end,
    m.d ->> 'owner_name',
    case when m.d ->> 'plan_id' ~ '^\d+$' then (m.d ->> 'plan_id')::int end,
    m.d ->> 'beneficiary', a.created_at, coalesce(ed.last_at, a.created_at)
  from adds a left join ed on ed.pid = a.pid
  cross join lateral (select a.d || coalesce(ed.f, '{}'::jsonb) as d) m
  where a.pid not in (select rem.pid from rem where rem.pid is not null) $$;

create or replace function public.lb_plans() returns table(plan_id int, name text) language sql stable security definer set search_path = '' as $$
  select distinct on (r.data ->> 'planId') (r.data ->> 'planId')::int, r.data -> 'fields' ->> 'name'
  from public.sp_records r where r.col = 'executions' and r.data ->> 'type' = 'plan-edit' and r.data ->> 'planId' ~ '^\d+$'
  order by r.data ->> 'planId', r.created_at desc $$;

-- السجل الزمني الموحد (أحداث الأنظمة السبعة). op: new | update
create or replace function public.lb_feed(p_from timestamptz default null, p_to timestamptz default null, p_sys text default null, p_kind text default null, p_op text default null, p_ach boolean default null, p_limit int default 40, p_offset int default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare f timestamptz := coalesce(p_from, now() - interval '30 days'); t timestamptz := coalesce(p_to, now() + interval '1 minute'); lim int := least(greatest(coalesce(p_limit, 40), 1), 200); items jsonb; tot bigint;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  with ev as (
    -- مجتمع لبيد المهني
    select 'community' sys, 'meeting' kind, 'new' op, 'جدولة لقاء: ' || m.title title, c.name detail, s.full_name actor, m.created_at at, '/teachers-community/#/community/' || m.community_id link, false ach, 'pc_meetings:' || m.id::text ref
      from public.pc_meetings m join public.pc_communities c on c.id = m.community_id left join public.staff_members s on s.id = m.created_by
    union all
    select 'community', 'meeting', 'update', case m.status when 'held' then 'تم تنفيذ لقاء: ' when 'cancelled' then 'إلغاء لقاء: ' when 'postponed' then 'تأجيل لقاء: ' else 'تحديث لقاء: ' end || m.title, c.name, s.full_name, m.updated_at, '/teachers-community/#/community/' || m.community_id, m.status = 'held', 'pc_meetings_u:' || m.id::text
      from public.pc_meetings m join public.pc_communities c on c.id = m.community_id left join public.staff_members s on s.id = m.created_by where m.updated_at > m.created_at + interval '1 minute'
    union all
    select 'community', 'minutes', 'new', 'رفع محضر اجتماع: ' || coalesce(m.title, ''), c.name, s.full_name, mi.submitted_at, '/teachers-community/#/community/' || mi.community_id, true, 'pc_minutes_s:' || mi.id::text
      from public.pc_minutes mi join public.pc_meetings m on m.id = mi.meeting_id join public.pc_communities c on c.id = mi.community_id left join public.staff_members s on s.id = mi.prepared_by where mi.submitted_at is not null
    union all
    select 'community', 'minutes', 'update', 'اعتماد محضر اجتماع: ' || coalesce(m.title, ''), c.name, s.full_name, mi.approved_at, '/teachers-community/#/community/' || mi.community_id, true, 'pc_minutes_a:' || mi.id::text
      from public.pc_minutes mi join public.pc_meetings m on m.id = mi.meeting_id join public.pc_communities c on c.id = mi.community_id left join public.staff_members s on s.id = mi.approved_by where mi.approved_at is not null
    union all
    select 'community', 'post', 'new', case p.kind when 'announcement' then 'إعلان في المجتمع: ' when 'question' then 'سؤال مهني: ' else 'نقاش مهني: ' end || p.title, c.name, s.full_name, p.created_at, '/teachers-community/#/community/' || p.community_id, false, 'pc_posts:' || p.id::text
      from public.pc_posts p join public.pc_communities c on c.id = p.community_id left join public.staff_members s on s.id = p.author_id
    union all
    select 'community', 'growth', 'new', 'توثيق نشاط نمو مهني: ' || g.title, null, s.full_name, g.created_at, '/teachers-community/#/growth', false, 'pc_growth:' || g.id::text
      from public.pc_growth_records g left join public.staff_members s on s.id = g.staff_id
    union all
    select 'community', 'growth', 'update', 'اعتماد نشاط نمو مهني: ' || g.title, null, s.full_name, g.reviewed_at, '/teachers-community/#/growth', true, 'pc_growth_a:' || g.id::text
      from public.pc_growth_records g left join public.staff_members s on s.id = g.staff_id where g.status = 'approved' and g.reviewed_at is not null
    union all
    select 'community', 'task', 'new', 'مهمة جديدة: ' || k.title, c.name, s.full_name, k.created_at, '/teachers-community/#/community/' || k.community_id, false, 'pc_tasks:' || k.id::text
      from public.pc_tasks k join public.pc_communities c on c.id = k.community_id left join public.staff_members s on s.id = k.assignee_id
    union all
    select 'community', 'task', 'update', 'إغلاق مهمة: ' || k.title, c.name, s.full_name, k.updated_at, '/teachers-community/#/community/' || k.community_id, true, 'pc_tasks_d:' || k.id::text
      from public.pc_tasks k join public.pc_communities c on c.id = k.community_id left join public.staff_members s on s.id = k.assignee_id where k.status = 'done' and k.updated_at > k.created_at + interval '1 minute'
    union all
    select 'community', 'initiative', 'new', 'مبادرة: ' || i.title, null, s.full_name, i.created_at, '/teachers-community/#/communities', false, 'pc_init:' || i.id::text
      from public.pc_initiatives i left join public.staff_members s on s.id = i.owner_id where i.status <> 'draft'
    union all
    select 'community', 'community', 'new', 'مجتمع مهني جديد: ' || c.name, c.kind, s.full_name, c.created_at, '/teachers-community/#/community/' || c.id, false, 'pc_comm:' || c.id::text
      from public.pc_communities c left join public.staff_members s on s.id = c.leader_id
    -- التقويم المدرسي الذكي
    union all
    select 'saas', 'evidence', 'new', 'رفع شاهد: ' || e.title, i.code, s.full_name, e.created_at, '/self-evaluation/admin.html', false, 'se_evidence:' || e.id::text
      from public.se_evidence e join public.se_indicators i on i.id = e.indicator_id left join public.staff_members s on s.id = e.submitted_by
    union all
    select 'saas', 'evidence', 'update', 'اعتماد شاهد: ' || e.title, i.code, s.full_name, e.reviewed_at, '/self-evaluation/admin.html', true, 'se_evidence_a:' || e.id::text
      from public.se_evidence e join public.se_indicators i on i.id = e.indicator_id left join public.staff_members s on s.id = e.reviewed_by where e.status = 'approved' and e.reviewed_at is not null
    union all
    select 'saas', 'evaluation', case when v.updated_at > v.created_at + interval '1 minute' then 'update' else 'new' end, 'تحديث مؤشر ' || i.code || case when v.achievement_pct is not null then ' (' || round(v.achievement_pct)::text || '%)' else '' end, null, s.full_name, v.updated_at, '/self-evaluation/admin.html', true, 'se_eval:' || v.id::text
      from public.se_evaluations v join public.se_indicators i on i.id = v.indicator_id left join public.staff_members s on s.id = v.evaluated_by
    union all
    select 'saas', 'task', 'new', 'مهمة تقويم: ' || k.title, null, s.full_name, k.created_at, '/self-evaluation/admin.html', false, 'se_tasks:' || k.id::text
      from public.se_tasks k left join public.staff_members s on s.id = k.assignee_staff_id
    union all
    select 'saas', 'task', 'update', 'إغلاق مهمة: ' || k.title, null, s.full_name, k.completed_at, '/self-evaluation/admin.html', true, 'se_tasks_d:' || k.id::text
      from public.se_tasks k left join public.staff_members s on s.id = k.assignee_staff_id where k.status = 'completed' and k.completed_at is not null
    union all
    select 'saas', 'meeting', 'new', 'جدولة اجتماع: ' || m.title, null, s.full_name, m.created_at, '/self-evaluation/admin.html', false, 'se_meet:' || m.id::text
      from public.se_meetings m left join public.staff_members s on s.id = m.created_by
    union all
    select 'saas', 'minutes', 'update', 'اعتماد محضر اجتماع: ' || m.title, null, s.full_name, mm.approved_at, '/self-evaluation/admin.html', true, 'se_min:' || mm.id::text
      from public.se_meeting_minutes mm join public.se_meetings m on m.id = mm.meeting_id left join public.staff_members s on s.id = mm.approved_by where mm.approved_at is not null
    union all
    select 'saas', 'announcement', 'new', 'إعلان: ' || a.title, null, s.full_name, a.created_at, '/self-evaluation/admin.html', false, 'se_ann:' || a.id::text
      from public.se_announcements a left join public.staff_members s on s.id = a.created_by
    union all
    select 'saas', 'task', 'new', 'إجراء تحسيني: ' || left(coalesce(a.action, a.goal, ''), 80), null, s.full_name, a.created_at, '/self-evaluation/admin.html', false, 'se_imp:' || a.id::text
      from public.se_improvement_actions a left join public.staff_members s on s.id = a.responsible_staff_id
    -- الخطط الذكية
    union all
    select 'plans', 'program', case r.data ->> 'type' when 'add' then 'new' else 'update' end,
      case r.data ->> 'type' when 'add' then 'إضافة برنامج: ' when 'edit' then 'تعديل برنامج: ' when 'remove' then 'حذف برنامج: ' else 'تحديث خطة: ' end || coalesce(r.data ->> 'name', ''),
      r.data ->> 'summary', r.data ->> 'by',
      case when r.data ->> 'at' ~ '^\d{4}-\d\d-\d\dT' then (r.data ->> 'at')::timestamptz else r.created_at end, '/smart-plans/',
      (r.data ->> 'type' = 'edit' and coalesce(r.data -> 'fields' ->> 'status', '') ~ 'منجز|مكتمل|تم'), 'sp:' || r.id::text
      from public.sp_records r where r.col = 'executions' and r.data ->> 'type' in ('add', 'edit', 'remove', 'plan-edit')
    -- انضباطي (مجاميع فقط، دون أسماء متعلمين)
    union all
    select 'indibati', 'attendance', 'new', 'رصد حضور وغياب: ' || coalesce(g.name_ar, cs.grade_code, '') || ' / ' || cs.name, coalesce(ab.n, 0)::text || ' غائب', s.full_name, ss.saved_at, '/indibati/dashboard.html', true, 'ind_att:' || ss.id::text
      from public.ind_attendance_sessions ss
      join public.class_sections cs on cs.id = ss.section_id left join public.grade_levels g on g.code = cs.grade_code left join public.staff_members s on s.id = ss.saved_by
      left join lateral (select count(*) n from public.ind_attendance_records r where r.session_id = ss.id and r.status like 'absent%') ab on true
    -- قيمي (التعزيز الإيجابي والأوسمة فقط)
    union all
    select 'qiyami', 'points', 'new', 'منح ' || r.points::text || ' نقطة تعزيز: ' || t.name_ar, st.full_name, s.full_name, r.created_at, '/qiyami/leaderboard.html', true, 'qm_r:' || r.id::text
      from public.qm_reinforcements r join public.qm_reinforcement_types t on t.id = r.type_id join public.students st on st.id = r.student_id left join public.staff_members s on s.id = r.given_by where r.voided_at is null and r.points > 0
    union all
    select 'qiyami', 'badge', 'new', 'منح وسام: ' || b.name_ar, st.full_name, s.full_name, sb.created_at, '/qiyami/leaderboard.html', true, 'qm_b:' || sb.id::text
      from public.qm_student_badges sb join public.qm_badges b on b.id = sb.badge_id join public.students st on st.id = sb.student_id left join public.staff_members s on s.id = sb.awarded_by where sb.revoked_at is null
    -- احجز مرفق
    union all
    select 'booking', 'booking', 'new', 'حجز مرفق: ' || fa.name, b.purpose, s.full_name, b.created_at, '/facility-booking/bookings.html', false, 'fb_b:' || b.id::text
      from public.fb_bookings b join public.facilities fa on fa.id = b.facility_id left join public.staff_members s on s.id = b.booked_by
    union all
    select 'booking', 'booking', 'update', case b.status when 'approved' then 'اعتماد حجز: ' when 'rejected' then 'رفض حجز: ' else 'إلغاء حجز: ' end || fa.name, b.decision_note, s.full_name, b.decided_at, '/facility-booking/bookings.html', false, 'fb_bd:' || b.id::text
      from public.fb_bookings b join public.facilities fa on fa.id = b.facility_id left join public.staff_members s on s.id = b.decided_by where b.decided_at is not null
    -- النواة الرقمية
    union all
    select 'core', 'announcement', 'new', 'إعلان مركزي: ' || left(pa.message, 110), null, null, pa.created_at, '/digital-core/dashboard.html', false, 'core_ann:' || pa.id::text
      from public.portal_announcements pa where pa.is_active and pa.scope = 'central'
  )
  select coalesce(jsonb_agg(to_jsonb(q) - 'total_' order by q.at desc), '[]'::jsonb), coalesce(max(q.total_), 0) into items, tot from (
    select ev.sys, ev.kind, ev.op, ev.title, ev.detail, ev.actor, ev.at, ev.link, ev.ach, ev.ref, count(*) over () total_
    from ev where ev.at is not null and ev.at >= f and ev.at <= t
      and (p_sys is null or ev.sys = p_sys) and (p_kind is null or ev.kind = p_kind) and (p_op is null or ev.op = p_op) and (p_ach is null or ev.ach = p_ach)
    order by ev.at desc limit lim offset greatest(coalesce(p_offset, 0), 0)) q;
  return jsonb_build_object('total', tot, 'items', items);
end $$;
