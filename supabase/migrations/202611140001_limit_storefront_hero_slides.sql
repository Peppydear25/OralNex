begin;

-- Preserve older settings while enforcing the three-slide limit on all new saves.
-- Administrators can remove extra existing slides in the storefront editor.
alter table public.storefront_settings
  add constraint storefront_hero_slides_max_three
  check (jsonb_array_length(hero_slides) <= 3) not valid;

commit;
