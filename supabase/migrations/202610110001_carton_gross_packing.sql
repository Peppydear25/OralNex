begin;
create or replace function public.valid_automatic_packing(p jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare u jsonb; c jsonb; k text; entry record; weight numeric; dims numeric[]; seen text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'object' or jsonb_typeof(p->'verified') is distinct from 'boolean'
    or jsonb_typeof(p->'units') is distinct from 'array' or jsonb_typeof(p->'cartons') is distinct from 'array' then return false; end if;
  if p->>'mode' = 'carton_gross' then
    if jsonb_array_length(p->'units')>100 or jsonb_array_length(p->'cartons')>12 then return false; end if;
    if (p->>'verified')::boolean and (jsonb_array_length(p->'units')=0 or jsonb_array_length(p->'cartons')=0) then return false; end if;
    for u in select value from jsonb_array_elements(p->'units') loop
      if jsonb_typeof(u->'variantSku') is distinct from 'string' or length(u->>'variantSku')>80
        or (u->>'variantSku')=any(seen) then return false; end if;
      seen:=array_append(seen,u->>'variantSku');
    end loop;
    if (p->>'verified')::boolean then
      foreach k in array seen loop
        if not exists(select 1 from jsonb_array_elements(p->'cartons') as carton_entry(value)
          where carton_entry.value->'capacityBySku' ? k) then return false; end if;
      end loop;
    end if;
    for c in select value from jsonb_array_elements(p->'cartons') loop
      if jsonb_typeof(c->'name') is distinct from 'string' or length(trim(c->>'name'))=0 or length(c->>'name')>80
        or jsonb_typeof(c->'capacityBySku') is distinct from 'object'
        or jsonb_typeof(c->'grossWeightBySku') is distinct from 'object' then return false; end if;
      if (select count(*) from jsonb_each(c->'capacityBySku')) not between 1 and 100
        or (select count(*) from jsonb_each(c->'capacityBySku'))<>(select count(*) from jsonb_each(c->'grossWeightBySku')) then return false; end if;
      foreach k in array array['lengthCm','widthCm','heightCm'] loop
        if jsonb_typeof(c->k) is distinct from 'number' or (c->>k)::numeric<=0 or (c->>k)::numeric>274 then return false; end if;
      end loop;
      for entry in select key,value from jsonb_each(c->'capacityBySku') loop
        if not(entry.key=any(seen)) or jsonb_typeof(entry.value)<>'number'
          or entry.value::numeric<>trunc(entry.value::numeric) or entry.value::numeric not between 1 and 999
          or jsonb_typeof(c->'grossWeightBySku'->entry.key) is distinct from 'number'
          or (c->'grossWeightBySku'->>entry.key)::numeric<=0
          or (c->'grossWeightBySku'->>entry.key)::numeric>68 then return false; end if;
      end loop;
      dims:=array[ceil((c->>'lengthCm')::numeric/2.54),ceil((c->>'widthCm')::numeric/2.54),ceil((c->>'heightCm')::numeric/2.54)];
      if greatest(dims[1],dims[2],dims[3])>108 or 2*(dims[1]+dims[2]+dims[3])-greatest(dims[1],dims[2],dims[3])>165 then return false; end if;
    end loop;
    return true;
  end if;
  if not exists(select 1 from jsonb_array_elements(p->'cartons') as carton_entry(value) where carton_entry.value ? 'capacityBySku') then return public.valid_geometric_packing(p); end if;
  if jsonb_array_length(p->'units')>100 or jsonb_array_length(p->'cartons')>12 then return false; end if;
  if (p->>'verified')::boolean and (jsonb_array_length(p->'units')=0 or jsonb_array_length(p->'cartons')=0) then return false; end if;
  for u in select value from jsonb_array_elements(p->'units') loop
    if jsonb_typeof(u->'variantSku') is distinct from 'string' or length(u->>'variantSku')>80 or (u->>'variantSku')=any(seen)
      or jsonb_typeof(u->'weightKg') is distinct from 'number' or (u->>'weightKg')::numeric<=0 or (u->>'weightKg')::numeric>68 then return false; end if;
    seen:=array_append(seen,u->>'variantSku');
  end loop;
  for c in select value from jsonb_array_elements(p->'cartons') loop
    if jsonb_typeof(c->'name') is distinct from 'string' or length(trim(c->>'name'))=0 or length(c->>'name')>80
      or jsonb_typeof(c->'capacityBySku') is distinct from 'object' then return false; end if;
    if (select count(*) from jsonb_each(c->'capacityBySku')) not between 1 and 100 then return false; end if;
    foreach k in array array['lengthCm','widthCm','heightCm','tareKg'] loop
      if jsonb_typeof(c->k) is distinct from 'number' or (c->>k)::numeric<=0 or (c->>k)::numeric>274 then return false; end if;
    end loop;
    if (c->>'tareKg')::numeric>68 then return false; end if;
    for entry in select key,value from jsonb_each(c->'capacityBySku') loop
      if not(entry.key=any(seen)) or jsonb_typeof(entry.value)<>'number' or entry.value::numeric<>trunc(entry.value::numeric) or entry.value::numeric not between 1 and 999 then return false; end if;
      select (v->>'weightKg')::numeric into weight from jsonb_array_elements(p->'units') v where v->>'variantSku'=entry.key;
      if weight*entry.value::numeric+(c->>'tareKg')::numeric>68 then return false; end if;
    end loop;
    dims:=array[ceil((c->>'lengthCm')::numeric/2.54),ceil((c->>'widthCm')::numeric/2.54),ceil((c->>'heightCm')::numeric/2.54)];
    if greatest(dims[1],dims[2],dims[3])>108 or 2*(dims[1]+dims[2]+dims[3])-greatest(dims[1],dims[2],dims[3])>165 then return false; end if;
  end loop;
  return true;
exception when others then return false;
end;
$$;
alter table public.products drop constraint if exists products_valid_automatic_packing;
alter table public.products add constraint products_valid_automatic_packing check(public.valid_automatic_packing(automatic_packing));
commit;
