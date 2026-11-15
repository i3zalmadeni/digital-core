-- 0025 · صورة المستخدم الحالي لشريط المستخدم الموحّد في كل أنظمة النواة الرقمية.
-- قراءة فقط: صورته في مجتمع لبيد المهني، ثم صورته المنشورة، ثم صورته في سجل النواة (حاوية خاصة برابط موقّع).
create or replace function public.core_my_photo() returns jsonb language sql stable security definer set search_path to '' as $$
  select case when pp.avatar_path is not null then jsonb_build_object('bucket', 'pc-avatars', 'path', pp.avatar_path, 'public', true)
    when s.public_photo_path is not null then jsonb_build_object('bucket', 'public-photos', 'path', s.public_photo_path, 'public', true)
    when s.photo_path is not null then jsonb_build_object('bucket', 'registry-media', 'path', s.photo_path, 'public', false) end
  from public.staff_members s left join public.pc_profiles pp on pp.staff_id = s.id
  where s.user_id = auth.uid() and s.is_active limit 1 $$;
revoke all on function public.core_my_photo() from public, anon;
grant execute on function public.core_my_photo() to authenticated;
