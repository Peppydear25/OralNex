-- An issued JWT can outlive an administrator role assignment. Check the
-- current database assignment on every privileged request, as well as MFA.
begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'user_role') = 'admin'
    and (auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = 'admin'::public.app_role
    ),
    false
  )
$$;

commit;
