-- حسابات المنسوبين بكلمة مرور افتراضية، وتغيير كلمة المرور من «حسابي»، واستعادتها من ملف المنسوب.
-- كلمة المرور الافتراضية لا تُكتب في المستودع: تُحفظ سراً في Vault باسم core_default_staff_password
--   select vault.create_secret('<كلمة المرور>', 'core_default_staff_password');
-- سياسة كلمة المرور الجديدة: 10 خانات على الأقل (حتى 72)، حرف إنجليزي ورقم على الأقل، بلا مسافات،
-- ولا تساوي الافتراضية ولا معرّف الدخول.

alter table public.staff_private add column if not exists must_change_password boolean not null default false;
alter table public.staff_private add column if not exists password_changed_at timestamptz;

-- ===== داخلية (غير متاحة للمستخدمين) =====
create or replace function public._core_default_password() returns text
language sql stable security definer set search_path to '' as $f$
  select decrypted_secret from vault.decrypted_secrets where name = 'core_default_staff_password' limit 1 $f$;

create or replace function public._core_set_password(p_user uuid, p_pw text) returns void
language sql security definer set search_path to '' as $f$
  update auth.users set encrypted_password = extensions.crypt(p_pw, extensions.gen_salt('bf', 10)), updated_at = now()
  where id = p_user $f$;

create or replace function public.core_password_problem(p_pw text, p_login text) returns text
language sql stable security definer set search_path to '' as $f$
  select case
    when p_pw is null or length(p_pw) < 10 then 'too_short'
    when octet_length(p_pw) > 72 then 'too_long'
    when p_pw ~ '\s' then 'has_space'
    when p_pw !~ '[A-Za-z]' then 'need_letter'
    when p_pw !~ '[0-9]' then 'need_digit'
    when p_pw = public._core_default_password() then 'is_default'
    when lower(p_pw) = lower(coalesce(p_login, '')) then 'is_login'
  end $f$;

-- إنشاء حساب لكل منسوب فعّال بلا حساب: المعرّف = رقم الهوية (employee_no)، وكلمة المرور الافتراضية
create or replace function public._core_create_staff_accounts() returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare r record; uid uuid; em text; pw text := public._core_default_password(); made int := 0; skipped jsonb := '[]'::jsonb;
begin
  if pw is null then raise exception 'default_password_missing'; end if;
  for r in select m.id, m.full_name, p.employee_no from public.staff_members m left join public.staff_private p on p.staff_id = m.id
           where m.user_id is null and m.employment_status in ('active','on_leave') order by m.full_name loop
    if r.employee_no is null or r.employee_no !~ '^[0-9]{10}$' then
      skipped := skipped || jsonb_build_object('id', r.id, 'name', r.full_name, 'reason', 'no_national_id'); continue; end if;
    em := r.employee_no || '@id.invalid';
    if exists (select 1 from auth.users where lower(email) = em)
       or exists (select 1 from public.staff_private where lower(login_id) = r.employee_no and staff_id <> r.id) then
      skipped := skipped || jsonb_build_object('id', r.id, 'name', r.full_name, 'reason', 'login_taken'); continue; end if;
    uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token, is_sso_user, is_anonymous)
    values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
      extensions.crypt(pw, extensions.gen_salt('bf', 10)), now(),
      '{"provider":"email","providers":["email"]}', '{"email_verified":true}', now(), now(),
      '', '', '', '', '', '', '', '', false, false);
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (uid::text, uid, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true, 'phone_verified', false), 'email', null, now(), now());
    update public.staff_members set user_id = uid, account_status = 'active' where id = r.id;
    insert into public.staff_private (staff_id, login_id, must_change_password) values (r.id, r.employee_no, true)
      on conflict (staff_id) do update set login_id = excluded.login_id, must_change_password = true;
    made := made + 1;
  end loop;
  return jsonb_build_object('created', made, 'skipped', skipped);
end $f$;

revoke all on function public._core_default_password() from public, anon, authenticated;
revoke all on function public._core_set_password(uuid, text) from public, anon, authenticated;
revoke all on function public._core_create_staff_accounts() from public, anon, authenticated;
revoke all on function public.core_password_problem(text, text) from public, anon, authenticated;

-- ===== متاحة =====
-- مدير النواة: إنشاء الحسابات الناقصة دفعة واحدة (للمنسوبين الجدد لاحقاً)
create or replace function public.core_create_staff_accounts() returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare res jsonb;
begin
  if not public.is_core_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  res := public._core_create_staff_accounts();
  insert into public.audit_logs (actor_id, action, table_name, new_data) values (auth.uid(), 'bulk_accounts', 'staff_members', res);
  return res;
end $f$;

-- المنسوب نفسه: تغيير كلمة المرور بعد التحقق من الحالية
create or replace function public.core_change_my_password(p_current text, p_new text) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare sid uuid := public.current_staff_id(); hash text; lid text; prob text;
begin
  if auth.uid() is null or sid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select encrypted_password into hash from auth.users where id = auth.uid();
  if hash is null or extensions.crypt(coalesce(p_current, ''), hash) <> hash then return jsonb_build_object('ok', false, 'error', 'wrong_current'); end if;
  select login_id into lid from public.staff_private where staff_id = sid;
  prob := public.core_password_problem(p_new, lid);
  if prob is not null then return jsonb_build_object('ok', false, 'error', prob); end if;
  if p_new = p_current then return jsonb_build_object('ok', false, 'error', 'same_as_current'); end if;
  perform public._core_set_password(auth.uid(), p_new);
  insert into public.staff_private (staff_id, must_change_password, password_changed_at) values (sid, false, now())
    on conflict (staff_id) do update set must_change_password = false, password_changed_at = now();
  insert into public.audit_logs (actor_id, action, table_name, record_id) values (auth.uid(), 'change_password', 'staff_members', sid);
  return jsonb_build_object('ok', true);
end $f$;

-- مدير النواة أو صاحب users:manage: استعادة كلمة المرور الافتراضية من ملف المنسوب
-- (الحساب المحمي لا يستعيده إلا مدير النواة، ولا يستعيد أحد كلمة مروره بهذه الطريقة)
create or replace function public.core_reset_staff_password(p_staff uuid) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare u uuid; pw text := public._core_default_password();
begin
  if not (public.is_core_admin() or public.core_can('users:manage')) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not public.is_core_admin() and public.is_protected_staff(p_staff) then return jsonb_build_object('ok', false, 'error', 'admin_protected'); end if;
  if p_staff = public.current_staff_id() then return jsonb_build_object('ok', false, 'error', 'self_reset'); end if;
  select user_id into u from public.staff_members where id = p_staff;
  if u is null then return jsonb_build_object('ok', false, 'error', 'no_account'); end if;
  if pw is null then return jsonb_build_object('ok', false, 'error', 'default_password_missing'); end if;
  perform public._core_set_password(u, pw);
  insert into public.staff_private (staff_id, must_change_password) values (p_staff, true)
    on conflict (staff_id) do update set must_change_password = true;
  insert into public.audit_logs (actor_id, action, table_name, record_id) values (auth.uid(), 'reset_password', 'staff_members', p_staff);
  return jsonb_build_object('ok', true);
end $f$;

revoke all on function public.core_create_staff_accounts() from public, anon;
revoke all on function public.core_change_my_password(text, text) from public, anon;
revoke all on function public.core_reset_staff_password(uuid) from public, anon;
grant execute on function public.core_create_staff_accounts() to authenticated;
grant execute on function public.core_change_my_password(text, text) to authenticated;
grant execute on function public.core_reset_staff_password(uuid) to authenticated;
