-- Preserve checkout address fields without lossy name parsing.
alter table public.addresses
  add column if not exists label text not null default 'Shipping address',
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists company text;

update public.addresses
set
  first_name = case
    when first_name = '' then split_part(recipient_name, ' ', 1)
    else first_name
  end,
  last_name = case
    when last_name = '' then trim(substr(recipient_name, length(split_part(recipient_name, ' ', 1)) + 1))
    else last_name
  end;

create or replace function public.set_default_address(target_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.addresses
    where id = target_address_id and user_id = auth.uid()
  ) then
    raise exception 'Address not found';
  end if;

  update public.addresses set is_default = false where user_id = auth.uid();
  update public.addresses set is_default = true
  where id = target_address_id and user_id = auth.uid();
end;
$$;

grant execute on function public.set_default_address(uuid) to authenticated;
