-- 0034: «يحدث في لبيد» – آخر ما أُضيف من نمو مهني للمعلمين (صورة المعلم، العنوان، النوع، الساعات). قراءة فقط.
create or replace function public.lb_growth_latest(p_n int default 8)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', g.id, 'who', s.full_name, 'specialty', s.specialty, 'photo', case when s.publish_public then s.public_photo_path end,
      'title', g.title, 'kind', g.kind, 'hours', g.hours, 'provider', g.provider, 'status', g.status, 'done_on', g.done_on, 'at', g.created_at, 'link', '/teachers-community/#/growth') x
    from public.pc_growth_records g join public.staff_members s on s.id = g.staff_id
    where s.is_active and g.status not in ('draft', 'rejected') order by g.created_at desc limit least(greatest(coalesce(p_n, 8), 1), 20)) q), '[]'::jsonb);
end $$;
revoke all on function public.lb_growth_latest(int) from public, anon;
grant execute on function public.lb_growth_latest(int) to authenticated;
