-- 0031: «يحدث في لبيد» – أفضل 5 طلاب (المنشور أصلاً في لوحة الشرف) وآخر الأوسمة الممنوحة بصورها. قراءة فقط.
create or replace function public.lb_honor()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'top', coalesce(public.qm_pub_leaderboard('school', null, null, 5, 'all'), '[]'::jsonb),
    'badges', coalesce((select jsonb_agg(x) from (select st.full_name student, b.name_ar badge, b.image_path image, b.points pts, s.full_name "by", sb.created_at as "at"
        from public.qm_student_badges sb join public.qm_badges b on b.id = sb.badge_id join public.students st on st.id = sb.student_id left join public.staff_members s on s.id = sb.awarded_by
        where sb.revoked_at is null order by sb.created_at desc limit 8) x), '[]'::jsonb),
    'link', '/qiyami/leaderboard.html');
end $$;
revoke all on function public.lb_honor() from public, anon;
grant execute on function public.lb_honor() to authenticated;
