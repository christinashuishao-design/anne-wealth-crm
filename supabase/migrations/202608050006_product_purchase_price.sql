alter table public.products
  add column if not exists purchase_unit_price_cny numeric(18,6),
  add column if not exists purchase_notes text;
