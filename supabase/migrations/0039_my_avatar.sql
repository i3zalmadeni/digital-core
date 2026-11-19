-- 0039 · صورة واحدة للمنسوب: صورة الملف المهني (pc_profiles.avatar_path في الحاوية العامة pc-avatars).
-- يرفعها المنسوب من «حسابي» في النواة أو من المجتمع المهني، فتظهر في الموضعين وفي ملفه بالنواة.
create or replace function public.core_set_my_avatar(p_path text) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare sid uuid := public.current_staff_id(); old text;
begin
  if auth.uid() is null or sid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_path is not null and (p_path !~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$' or split_part(p_path, '/', 1) <> sid::text) then
    return jsonb_build_object('ok', false, 'error', 'invalid_path');
  end if;
  select avatar_path into old from public.pc_profiles where staff_id = sid;
  insert into public.pc_profiles (staff_id, avatar_path, updated_at) values (sid, p_path, now())
    on conflict (staff_id) do update set avatar_path = excluded.avatar_path, updated_at = now();
  insert into public.audit_logs (actor_id, action, table_name, record_id) values (auth.uid(), 'UPDATE', 'staff_members', sid);
  return jsonb_build_object('ok', true, 'old', old);
end $f$;
revoke all on function public.core_set_my_avatar(text) from public, anon;
grant execute on function public.core_set_my_avatar(text) to authenticated;
