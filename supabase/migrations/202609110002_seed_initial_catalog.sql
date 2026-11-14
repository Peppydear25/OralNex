-- Initial OralNex catalog. Safe to run more than once.
insert into public.categories (name, slug, description, image_path, display_order, is_active)
values
  (
    'Gloves',
    'gloves',
    'Disposable examination gloves available in small, medium, and large sizes, with blue and black color options.',
    '/logo.jpg',
    1,
    true
  ),
  (
    'Masks',
    'masks',
    'Blue disposable face masks in one convenient universal size.',
    '/logo.jpg',
    2,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_path = excluded.image_path,
  display_order = excluded.display_order,
  is_active = excluded.is_active;

insert into public.products (
  category_id,
  name,
  slug,
  sku,
  summary,
  description,
  price_cents,
  compare_at_price_cents,
  stock_quantity,
  low_stock_threshold,
  status,
  is_featured
)
values
  (
    (select id from public.categories where slug = 'gloves'),
    'Nitrile Exam Gloves',
    'nitrile-exam-gloves',
    'ON-0003',
    'Comfortable disposable nitrile gloves for routine examinations and general protection.',
    'These examination gloves provide a practical barrier for routine care and cleaning tasks. Their flexible nitrile construction supports dexterity while offering a latex-free option for appropriate users.',
    1800,
    2400,
    500,
    25,
    'active',
    true
  ),
  (
    (select id from public.categories where slug = 'masks'),
    'Disposable Face Mask',
    'disposable-face-mask',
    'ON-0009',
    'Lightweight blue disposable face masks for everyday protection in care and workplace settings.',
    'These single-use blue face masks feature a pleated design, flexible nose strip, and soft ear loops for comfortable everyday wear.',
    1200,
    1500,
    800,
    50,
    'active',
    true
  )
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  sku = excluded.sku,
  summary = excluded.summary,
  description = excluded.description,
  price_cents = excluded.price_cents,
  compare_at_price_cents = excluded.compare_at_price_cents,
  stock_quantity = excluded.stock_quantity,
  low_stock_threshold = excluded.low_stock_threshold,
  status = excluded.status,
  is_featured = excluded.is_featured;

insert into public.product_images (product_id, storage_path, alt_text, display_order)
values
  (
    (select id from public.products where slug = 'nitrile-exam-gloves'),
    '/logo.jpg',
    'Blue nitrile examination gloves',
    0
  ),
  (
    (select id from public.products where slug = 'disposable-face-mask'),
    '/logo.jpg',
    'Blue disposable face mask',
    0
  )
on conflict (product_id, display_order) do update set
  storage_path = excluded.storage_path,
  alt_text = excluded.alt_text;

insert into public.product_variants (product_id, options, sku, stock_quantity, is_active)
values
  ((select id from public.products where slug = 'nitrile-exam-gloves'), '{"Size":"Small","Color":"Blue"}', 'ON-0003-S-BLU', 90, true),
  ((select id from public.products where slug = 'nitrile-exam-gloves'), '{"Size":"Small","Color":"Black"}', 'ON-0003-S-BLK', 60, true),
  ((select id from public.products where slug = 'nitrile-exam-gloves'), '{"Size":"Medium","Color":"Blue"}', 'ON-0003-M-BLU', 100, true),
  ((select id from public.products where slug = 'nitrile-exam-gloves'), '{"Size":"Medium","Color":"Black"}', 'ON-0003-M-BLK', 70, true),
  ((select id from public.products where slug = 'nitrile-exam-gloves'), '{"Size":"Large","Color":"Blue"}', 'ON-0003-L-BLU', 110, true),
  ((select id from public.products where slug = 'nitrile-exam-gloves'), '{"Size":"Large","Color":"Black"}', 'ON-0003-L-BLK', 70, true),
  ((select id from public.products where slug = 'disposable-face-mask'), '{"Size":"One Size","Color":"Blue"}', 'ON-0009-OS-BLU', 800, true)
on conflict (sku) do update set
  options = excluded.options,
  stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active;

insert into public.product_bulk_pricing_tiers (product_id, min_quantity, discount_percent)
values
  ((select id from public.products where slug = 'nitrile-exam-gloves'), 10, 5),
  ((select id from public.products where slug = 'nitrile-exam-gloves'), 25, 10),
  ((select id from public.products where slug = 'nitrile-exam-gloves'), 50, 15),
  ((select id from public.products where slug = 'disposable-face-mask'), 10, 5),
  ((select id from public.products where slug = 'disposable-face-mask'), 25, 10),
  ((select id from public.products where slug = 'disposable-face-mask'), 50, 15)
on conflict (product_id, min_quantity) do update set
  discount_percent = excluded.discount_percent;

insert into public.product_features (product_id, feature, display_order)
select product_id, feature, display_order
from (
  values
    ((select id from public.products where slug = 'nitrile-exam-gloves'), 'Latex-free nitrile material', 0),
    ((select id from public.products where slug = 'nitrile-exam-gloves'), 'Textured grip', 1),
    ((select id from public.products where slug = 'nitrile-exam-gloves'), 'Ambidextrous fit', 2),
    ((select id from public.products where slug = 'nitrile-exam-gloves'), 'Disposable protection', 3),
    ((select id from public.products where slug = 'disposable-face-mask'), 'Pleated lightweight design', 0),
    ((select id from public.products where slug = 'disposable-face-mask'), 'Flexible nose strip', 1),
    ((select id from public.products where slug = 'disposable-face-mask'), 'Soft elastic ear loops', 2)
) as seed(product_id, feature, display_order)
where not exists (
  select 1 from public.product_features existing
  where existing.product_id = seed.product_id and existing.display_order = seed.display_order
);

insert into public.product_specifications (product_id, label, value, display_order)
select product_id, label, value, display_order
from (
  values
    ((select id from public.products where slug = 'nitrile-exam-gloves'), 'Material', 'Nitrile', 0),
    ((select id from public.products where slug = 'nitrile-exam-gloves'), 'Fit', 'Ambidextrous', 1),
    ((select id from public.products where slug = 'nitrile-exam-gloves'), 'Finish', 'Textured fingertips', 2),
    ((select id from public.products where slug = 'nitrile-exam-gloves'), 'Use', 'Single use', 3),
    ((select id from public.products where slug = 'disposable-face-mask'), 'Use', 'Single use', 0)
) as seed(product_id, label, value, display_order)
where not exists (
  select 1 from public.product_specifications existing
  where existing.product_id = seed.product_id and existing.display_order = seed.display_order
);
