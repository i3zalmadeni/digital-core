-- 0037: الدخول بالبصمة (مفاتيح المرور WebAuthn): بصمة الوجه أو الإصبع في جهاز المستخدم.
-- لا تُخزَّن أي بيانات بيومترية: يُحفظ المفتاح العام فقط، والتحقق من الوجه يتم داخل الجهاز.
-- الإضافة والتحديث من دالة core-api فقط (service role). للمستخدم قراءة مفاتيحه وحذفها.
create table if not exists public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists passkeys_user_idx on public.passkeys (user_id);
alter table public.passkeys enable row level security;

drop policy if exists passkeys_select_own on public.passkeys;
create policy passkeys_select_own on public.passkeys for select to authenticated using (user_id = auth.uid());
drop policy if exists passkeys_delete_own on public.passkeys;
create policy passkeys_delete_own on public.passkeys for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.passkeys to authenticated;

-- تحديات قصيرة العمر تُستهلك مرة واحدة؛ لا وصول من المتصفح إطلاقاً.
create table if not exists public.passkey_challenges (
  challenge text primary key,
  kind text not null check (kind in ('register','login')),
  user_id uuid,
  expires_at timestamptz not null default (now() + interval '5 minutes')
);
alter table public.passkey_challenges enable row level security;
revoke all on public.passkey_challenges from anon, authenticated;
