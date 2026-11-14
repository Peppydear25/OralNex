begin;

-- Fixed-window counters for public API abuse protection. Keys are HMACs, not emails.
create table public.api_rate_limits (
  scope text not null,
  identity_hash text not null,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (scope, identity_hash, window_started_at)
);

create index api_rate_limits_window_started_at_idx
  on public.api_rate_limits(window_started_at);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_scope text,
  p_identity_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempts integer;
  bucket_start timestamptz;
begin
  if p_scope not in ('checkout', 'contact', 'bulk_quote')
    or (p_identity_hash <> 'global' and p_identity_hash !~ '^[0-9a-f]{64}$')
    or p_limit not between 1 and 1000
    or p_window_seconds not between 60 and 86400 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits(scope, identity_hash, window_started_at, attempts)
  values (p_scope, p_identity_hash, bucket_start, 1)
  on conflict (scope, identity_hash, window_started_at)
  do update set attempts = public.api_rate_limits.attempts + 1
  returning attempts into current_attempts;

  -- Opportunistic cleanup keeps the table bounded without requiring pg_cron.
  if random() < 0.01 then
    delete from public.api_rate_limits
    where window_started_at < clock_timestamp() - interval '2 days';
  end if;

  return current_attempts <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;

commit;
