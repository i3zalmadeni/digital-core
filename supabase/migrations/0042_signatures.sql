-- 0042 · التوقيع الإلكتروني: يرسم المنسوب توقيعه مرة واحدة في «حسابي»، ويُضاف تلقائياً إلى التكليفات وتقارير ReportKit عند الإصدار.
-- الجدول مغلق (RLS بلا سياسات)؛ الوصول عبر الدوال فقط. صحة أي تقرير يثبتها رمز التحقق (QR) لا صورة التوقيع وحدها.
create table if not exists public.staff_signatures (
  staff_id uuid primary key references public.staff_members(id) on delete cascade,
  image text not null check (image like 'data:image/png;base64,%' and length(image) <= 200000),
  updated_at timestamptz not null default now()
);
alter table public.staff_signatures enable row level security;
revoke all on public.staff_signatures from public, anon, authenticated;

-- توقيعي (للعرض في «حسابي»)
create or replace function public.core_my_signature() returns jsonb
language sql stable security definer set search_path to '' as $f$
  select jsonb_build_object('image', s.image, 'updated_at', s.updated_at) from public.staff_signatures s where s.staff_id = public.current_staff_id()
$f$;

-- حفظ توقيعي أو حذفه (p_image = null)
create or replace function public.core_set_my_signature(p_image text) returns jsonb
language plpgsql security definer set search_path to '' as $f$
declare sid uuid := public.current_staff_id();
begin
  if auth.uid() is null or sid is null then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_image is null then delete from public.staff_signatures where staff_id = sid;
  else
    if p_image not like 'data:image/png;base64,%' or length(p_image) > 200000 then return jsonb_build_object('ok', false, 'error', 'invalid_image'); end if;
    insert into public.staff_signatures (staff_id, image, updated_at) values (sid, p_image, now())
      on conflict (staff_id) do update set image = excluded.image, updated_at = now();
  end if;
  insert into public.audit_logs (actor_id, action, table_name, record_id) values (auth.uid(), 'UPDATE', 'staff_signatures', sid);
  return jsonb_build_object('ok', true);
end $f$;

-- توقيعات الموقّعين على تقرير يصدره منسوب فعّال: بالمعرّف، أو بالدور (principal = مدير المدرسة، issuer = المُصدِر الحالي)
create or replace function public.core_signatures(p_staff uuid[] default '{}', p_roles text[] default '{}') returns jsonb
language plpgsql stable security definer set search_path to '' as $f$
declare me uuid := public.current_staff_id();
begin
  if auth.uid() is null or me is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('key', x.key, 'staff_id', m.id, 'name', m.full_name, 'job', j.name_ar, 'image', s.image))
    from (
      select u::text key, u sid from unnest(coalesce(p_staff, '{}')) u
      union all select 'issuer', me where 'issuer' = any(coalesce(p_roles, '{}'))
      union all select 'principal', (select id from public.staff_members where job_title = 'principal' and is_active order by created_at limit 1) where 'principal' = any(coalesce(p_roles, '{}'))
    ) x join public.staff_members m on m.id = x.sid
    left join public.job_titles j on j.code = m.job_title
    left join public.staff_signatures s on s.staff_id = m.id), '[]'::jsonb);
end $f$;

revoke all on function public.core_my_signature(), public.core_set_my_signature(text), public.core_signatures(uuid[], text[]) from public, anon;
grant execute on function public.core_my_signature(), public.core_set_my_signature(text), public.core_signatures(uuid[], text[]) to authenticated;

-- 0043 (مطبّق): core_signatures يقبل أيضاً الدور coordinator:<رمز النظام> (منسق النظام الفعّال في staff_roles)، مثل coordinator:self_evaluation
