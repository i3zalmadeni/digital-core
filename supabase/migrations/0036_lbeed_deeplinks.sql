-- روابط عميقة: البرنامج يفتح بطاقته (#p-<pid>) في الخطط الذكية
do $$ declare d text; begin
  select pg_get_functiondef('public.lb_week(date)'::regprocedure) into d;
  d := replace(d, $q$'beneficiary', p.beneficiary, 'link', '/smart-plans/')$q$, $q$'beneficiary', p.beneficiary, 'link', '/smart-plans/#p-' || p.pid)$q$);
  execute d;
  select pg_get_functiondef('public.lb_plans_overview()'::regprocedure) into d;
  d := replace(d, 'select name, planned_date as day,', $q$select name, '/smart-plans/#p-' || pid as link, planned_date as day,$q$);
  execute d;
end $$;
