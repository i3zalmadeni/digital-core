-- 0026 · تخفيف سياسة كلمة المرور: 8 خانات على الأقل بدل 10 (الباقي كما هو: حرف إنجليزي ورقم على الأقل، بلا مسافات).
create or replace function public.core_password_problem(p_pw text, p_login text) returns text
language sql stable security definer set search_path to '' as $f$
  select case
    when p_pw is null or length(p_pw) < 8 then 'too_short'
    when octet_length(p_pw) > 72 then 'too_long'
    when p_pw ~ '\s' then 'has_space'
    when p_pw !~ '[A-Za-z]' then 'need_letter'
    when p_pw !~ '[0-9]' then 'need_digit'
    when p_pw = public._core_default_password() then 'is_default'
    when lower(p_pw) = lower(coalesce(p_login, '')) then 'is_login'
  end $f$;
