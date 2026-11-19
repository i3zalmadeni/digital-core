-- 0040 · تعديل صورة أي منسوب (الصورة الموحّدة pc_profiles.avatar_path) لمن يملك تعديل سجلات المنسوبين أو مدير النواة.
create policy pcav_admin_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'pc-avatars' and (public.is_core_admin() or public.core_can('personnel:edit')));
create policy pcav_admin_upd on storage.objects for update to authenticated
  using (bucket_id = 'pc-avatars' and (public.is_core_admin() or public.core_can('personnel:edit')));
create policy pcav_admin_del on storage.objects for delete to authenticated
  using (bucket_id = 'pc-avatars' and (public.is_core_admin() or public.core_can('personnel:edit')));

create or replace function public.core_set_staff_avatar(p_staff uuid, p_path text) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare old text;
begin
  if not (public.is_core_admin() or public.core_can('personnel:edit')) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from public.staff_members where id = p_staff) then return jsonb_build_object('ok', false, 'error', 'no_staff'); end if;
  if p_path is not null and (p_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$' or split_part(p_path, '/', 1) <> p_staff::text) then
    return jsonb_build_object('ok', false, 'error', 'invalid_path');
  end if;
  select avatar_path into old from public.pc_profiles where staff_id = p_staff;
  insert into public.pc_profiles (staff_id, avatar_path, updated_at) values (p_staff, p_path, now())
    on conflict (staff_id) do update set avatar_path = excluded.avatar_path, updated_at = now();
  insert into public.audit_logs (actor_id, action, table_name, record_id) values (auth.uid(), 'UPDATE', 'staff_members', p_staff);
  return jsonb_build_object('ok', true, 'old', old);
end $f$;
revoke all on function public.core_set_staff_avatar(uuid, text) from public, anon;
grant execute on function public.core_set_staff_avatar(uuid, text) to authenticated;
