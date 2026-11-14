-- Database-backed administrator roles and JWT custom claims.
begin;

create type public.app_role as enum ('admin');

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

revoke all on public.user_roles from anon, authenticated, public;
grant select on public.user_roles to supabase_auth_admin;

create policy "Auth service can read user roles"
on public.user_roles
for select
to supabase_auth_admin
using (true);

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims jsonb;
  assigned_role public.app_role;
begin
  select role
  into assigned_role
  from public.user_roles
  where user_id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  claims := jsonb_set(
    claims,
    '{user_role}',
    coalesce(to_jsonb(assigned_role), 'null'::jsonb)
  );

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb)
from anon, authenticated, public;

-- Admin access requires both an assigned database role and completed MFA.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'user_role') = 'admin'
    and (auth.jwt() ->> 'aal') = 'aal2',
    false
  )
$$;

commit;
