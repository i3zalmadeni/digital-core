-- المنسوب يعدّل بريده وجواله من «حسابي» (البريد للتواصل فقط في حسابات المعرّف).
create or replace function public.core_update_my_contact(p_email text, p_phone text) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare sid uuid := public.current_staff_id(); em text := nullif(lower(trim(coalesce(p_email, ''))), '');
        ph text := nullif(regexp_replace(coalesce(p_phone, ''), '[\s-]', '', 'g'), ''); login_email text;
begin
  if auth.uid() is null or sid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select email into login_email from auth.users where id = auth.uid();
  -- حساب يدخل ببريد حقيقي: تغيير البريد يغيّر الدخول، فيبقى من صلاحية الإدارة
  if login_email is not null and login_email not like '%@id.invalid' and em is distinct from lower(login_email) then
    return jsonb_build_object('ok', false, 'error', 'email_login'); end if;
  if em is not null and (em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or em like '%@id.invalid') then return jsonb_build_object('ok', false, 'error', 'invalid_email'); end if;
  if ph is not null then
    ph := regexp_replace(ph, '^(\+?966|00966)5', '05');
    if ph !~ '^05[0-9]{8}$' then return jsonb_build_object('ok', false, 'error', 'invalid_phone'); end if;
  end if;
  if em is not null and exists (select 1 from public.staff_private where lower(email) = em and staff_id <> sid) then
    return jsonb_build_object('ok', false, 'error', 'email_taken'); end if;
  insert into public.staff_private (staff_id, email, phone) values (sid, em, ph)
    on conflict (staff_id) do update set email = excluded.email, phone = excluded.phone, updated_at = now();
  insert into public.audit_logs (actor_id, action, table_name, record_id, new_data)
    values (auth.uid(), 'update_contact', 'staff_members', sid, jsonb_build_object('email', em is not null, 'phone', ph is not null));
  return jsonb_build_object('ok', true, 'email', em, 'phone', ph);
end $f$;
revoke all on function public.core_update_my_contact(text, text) from public, anon;
grant execute on function public.core_update_my_contact(text, text) to authenticated;
