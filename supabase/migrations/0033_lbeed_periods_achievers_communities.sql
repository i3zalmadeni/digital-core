-- 0033: «يحدث في لبيد» – حجوزات المرافق حسب الحصص، المعلمون الأكثر إنجازاً في النمو المهني، والمجتمعات المهنية. قراءة فقط.
create or replace function public.lb_periods(p_day date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare d date := coalesce(p_day, (now() at time zone 'Asia/Riyadh')::date); today date := (now() at time zone 'Asia/Riyadh')::date; nowt time := (now() at time zone 'Asia/Riyadh')::time; tot int;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  select count(*) into tot from public.facilities f join public.fb_facility_settings fs on fs.facility_id = f.id where fs.is_bookable and f.status = 'operational';
  return jsonb_build_object('day', d, 'total_bookable', tot, 'periods', coalesce((select jsonb_agg(x order by (x ->> 'ord')::int) from (
    select jsonb_build_object('ord', p.sort_order, 'code', p.code, 'name', p.name_ar, 'from', p.starts_at::text, 'to', p.ends_at::text,
      'state', case when d > today or (d = today and nowt < p.starts_at) then 'upcoming' when d = today and nowt <= p.ends_at then 'running' else 'ended' end,
      'bookings', coalesce((select jsonb_agg(jsonb_build_object('facility', fa.name, 'who', s.full_name, 'purpose', b.purpose, 'status', b.status) order by fa.name)
          from public.fb_booking_periods bp join public.fb_bookings b on b.id = bp.booking_id and b.status in ('approved', 'pending')
          join public.facilities fa on fa.id = b.facility_id left join public.staff_members s on s.id = b.booked_by
          where bp.period_id = p.id and bp.active and bp.booking_date = d), '[]'::jsonb)) x
    from public.fb_periods p where p.kind = 'class' and p.is_bookable) q), '[]'::jsonb), 'link', '/facility-booking/bookings.html');
end $$;

create or replace function public.lb_achievers(p_n int default 6)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('name', s.full_name, 'specialty', s.specialty, 'photo', case when s.publish_public then s.public_photo_path end,
      'hours', coalesce(sum(g.hours), 0), 'records', count(*), 'last', max(coalesce(g.reviewed_at, g.created_at)), 'link', '/teachers-community/#/growth') x
    from public.pc_growth_records g join public.staff_members s on s.id = g.staff_id
    where g.status = 'approved' and s.is_active group by s.id, s.full_name, s.specialty, s.publish_public, s.public_photo_path
    order by coalesce(sum(g.hours), 0) desc, count(*) desc limit least(greatest(coalesce(p_n, 6), 1), 20)) q), '[]'::jsonb);
end $$;

create or replace function public.lb_communities()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'last' desc nulls last) from (
    select jsonb_build_object('id', c.id, 'name', c.name, 'kind', c.kind, 'leader', s.full_name,
      'members', (select count(*) from public.pc_community_members m where m.community_id = c.id),
      'meetings_30d', (select count(*) from public.pc_meetings mm where mm.community_id = c.id and mm.starts_at > now() - interval '30 days'),
      'last', greatest(c.updated_at, (select max(mm.updated_at) from public.pc_meetings mm where mm.community_id = c.id), (select max(p.created_at) from public.pc_posts p where p.community_id = c.id)),
      'link', '/teachers-community/#/community/' || c.id) x
    from public.pc_communities c left join public.staff_members s on s.id = c.leader_id where c.status = 'active') q), '[]'::jsonb);
end $$;
revoke all on function public.lb_periods(date), public.lb_achievers(int), public.lb_communities() from public, anon;
grant execute on function public.lb_periods(date), public.lb_achievers(int), public.lb_communities() to authenticated;
