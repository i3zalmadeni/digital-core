-- 0032: «يحدث في لبيد» – آخر توثيقات الخطط الذكية (صورة + عنوان + منفذ + تفاصيل الخبر) وأفضل n طلاب. قراءة فقط.
create or replace function public.lb_docs(p_limit int default 12)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(x order by x ->> 'at' desc) from (
    select jsonb_build_object('id', r.id, 'at', r.created_at,
      'title', coalesce(nullif(p.name, ''), nullif(r.data ->> 'programName', ''), nullif(r.data ->> 'programCode', ''), left(coalesce(r.data ->> 'description', ''), 70), 'توثيق تنفيذ'),
      'code', r.data ->> 'programCode', 'executor', coalesce(nullif(r.data ->> 'executor', ''), p.owner_name), 'date', r.data ->> 'date',
      'location', r.data ->> 'location', 'participants', r.data ->> 'participants', 'beneficiaries', r.data ->> 'beneficiaries',
      'description', r.data ->> 'description', 'outputs', r.data ->> 'outputs',
      'images', (select coalesce(jsonb_agg(i ->> 'id'), '[]'::jsonb) from jsonb_array_elements(r.data -> 'images') i where i ->> 'id' ~* '\.(png|jpe?g|webp|gif)$'),
      'link', '/smart-plans/') x
    from public.sp_records r left join public.lb_programs() p on p.pid = r.data ->> 'programId'
    where r.col = 'executions' and coalesce(r.data ->> 'type', '') = '' and jsonb_typeof(r.data -> 'images') = 'array' and jsonb_array_length(r.data -> 'images') > 0
    order by r.created_at desc limit least(greatest(coalesce(p_limit, 12), 1), 30)) q), '[]'::jsonb);
end $$;
create or replace function public.lb_top(p_n int default 10)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce(public.qm_pub_leaderboard('school', null, null, least(greatest(coalesce(p_n, 10), 1), 20), 'all'), '[]'::jsonb);
end $$;
revoke all on function public.lb_docs(int), public.lb_top(int) from public, anon;
grant execute on function public.lb_docs(int), public.lb_top(int) to authenticated;
