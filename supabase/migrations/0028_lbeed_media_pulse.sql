-- 0028: «يحدث في لبيد» – الوسائط العامة المنشورة أصلاً (صور المنسوبين المنشورين، صور الأوسمة، صور الأنشطة العامة) ونبض النشاط.
-- قراءة فقط. لا تُعاد إلا صور مفعّل نشرها صراحة (publish_public) أو موجودة في دلاء عامة.

create or replace function public.lb_media()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'people', coalesce((select jsonb_agg(jsonb_build_object('name', s.full_name, 'job', s.job_title, 'specialty', s.specialty, 'photo', s.public_photo_path) order by s.full_name)
        from public.staff_members s where s.is_active and s.publish_public and s.public_photo_path is not null), '[]'::jsonb),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('name', b.name_ar, 'image', b.image_path, 'points', b.points, 'awarded_30d',
          (select count(*) from public.qm_student_badges sb where sb.badge_id = b.id and sb.revoked_at is null and sb.created_at > now() - interval '30 days')) order by b.sort_order)
        from public.qm_badges b where b.is_active and b.image_path is not null), '[]'::jsonb),
    'gallery', coalesce((select jsonb_agg(jsonb_build_object('path', o.name, 'at', o.created_at, 'link', '/smart-plans/') order by o.created_at desc)
        from (select name, created_at from storage.objects where bucket_id = 'sp-evidence' and name ~* '\.(png|jpe?g|webp|gif)$' order by created_at desc limit 12) o), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- نبض النشاط: عدد السجلات الموحدة لكل يوم (آخر n يوماً) ولكل نظام، من سجل التحديثات نفسه
create or replace function public.lb_pulse(p_days int default 14)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare n int := least(greatest(coalesce(p_days, 14), 7), 30); today date := (now() at time zone 'Asia/Riyadh')::date; d date; days jsonb := '[]'::jsonb; bys jsonb := '{}'::jsonb; s text; a timestamptz; b timestamptz; c int;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  for i in reverse (n - 1)..0 loop
    d := today - i; a := d::timestamp at time zone 'Asia/Riyadh'; b := (d + 1)::timestamp at time zone 'Asia/Riyadh';
    c := coalesce((public.lb_feed(a, b, null, null, null, null, 1, 0) ->> 'total')::int, 0);
    days := days || jsonb_build_array(jsonb_build_object('d', d, 'n', c));
  end loop;
  a := (today - (n - 1))::timestamp at time zone 'Asia/Riyadh';
  foreach s in array array['core','saas','plans','community','indibati','qiyami','booking'] loop
    bys := bys || jsonb_build_object(s, coalesce((public.lb_feed(a, now(), s, null, null, null, 1, 0) ->> 'total')::int, 0));
  end loop;
  return jsonb_build_object('days', days, 'by_sys', bys, 'generated_at', now());
end $$;

revoke all on function public.lb_media(), public.lb_pulse(int) from public, anon;
grant execute on function public.lb_media(), public.lb_pulse(int) to authenticated;
