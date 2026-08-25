alter table public.products
  add column if not exists primary_supplier_id uuid references public.suppliers(id),
  add column if not exists purchase_moq integer,
  add column if not exists delivery_lead_time_days integer,
  add column if not exists special_notes text;
