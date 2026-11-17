-- 0029: «يحدث في لبيد» – كثافة أحداث الشهر لعرض التقويم (قراءة فقط؛ تجمع lb_week لأسابيع الشهر).
create or replace function public.lb_month(p_month date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare m0 date := date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Riyadh')::date))::date; m1 date := (date_trunc('month', coalesce(p_month, (now() at time zone 'Asia/Riyadh')::date)) + interval '1 month')::date;
  ws date; res jsonb := '[]'::jsonb; e jsonb;
begin
  if not public.lb_ok() then raise exception 'forbidden' using errcode = '42501'; end if;
  ws := m0 - extract(dow from m0)::int;
  while ws < m1 loop
    for e in select * from jsonb_array_elements(coalesce(public.lb_week(ws) -> 'events', '[]'::jsonb)) loop
      res := res || jsonb_build_array(jsonb_build_object('day', e ->> 'day', 'kind', e ->> 'kind', 'sys', e ->> 'sys'));
    end loop;
    ws := ws + 7;
  end loop;
  return jsonb_build_object('month', m0, 'events', coalesce((select jsonb_agg(x) from jsonb_array_elements(res) x where (x ->> 'day')::date >= m0 and (x ->> 'day')::date < m1), '[]'::jsonb));
end $$;
revoke all on function public.lb_month(date) from public, anon;
grant execute on function public.lb_month(date) to authenticated;
