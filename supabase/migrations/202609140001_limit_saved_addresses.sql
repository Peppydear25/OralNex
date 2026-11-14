-- Limit each account to two saved shipping addresses without deleting existing data.
-- Lock the owning user row so concurrent inserts cannot bypass the count check.
create or replace function public.enforce_saved_address_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is not distinct from old.user_id then
      return new;
    end if;
  end if;

  perform 1 from auth.users where id = new.user_id for update;

  if (
    select count(*) from public.addresses where user_id = new.user_id
  ) >= 2 then
    raise exception 'An account may have at most two saved shipping addresses'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_saved_address_limit() from public;

create trigger addresses_limit_per_user
before insert or update of user_id on public.addresses
for each row execute function public.enforce_saved_address_limit();
