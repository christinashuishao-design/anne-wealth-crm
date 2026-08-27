alter table public.customers add column if not exists lark_record_id text;
alter table public.customers add column if not exists lark_updated_at timestamptz;
alter table public.customers add column if not exists lark_created_at timestamptz;
alter table public.customers add column if not exists customer_type text;
alter table public.customers add column if not exists business_products text;
alter table public.customers add column if not exists inquiry_grade text;
alter table public.customers add column if not exists email_content text;
alter table public.customers add column if not exists contact_name text;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists position text;
alter table public.customers add column if not exists social_media text;
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists follow_up_reminder text;
alter table public.customers add column if not exists follow_up_checkin text;

alter table public.opportunities add column if not exists project_progress text;
alter table public.suppliers add column if not exists location text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists image_path text;
alter table public.products add column if not exists purchase_unit_price_cny numeric(18,6);
alter table public.products add column if not exists purchase_notes text;
alter table public.products add column if not exists primary_supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.products add column if not exists purchase_moq integer;
alter table public.products add column if not exists delivery_lead_time_days integer;
alter table public.products add column if not exists special_notes text;
alter table public.orders add column if not exists order_categories text;

create table if not exists public.financial_records (
  id uuid primary key default gen_random_uuid(),
  record_type text not null,
  category text,
  counterparty text,
  amount numeric(18,4) not null default 0,
  currency char(3) not null default 'CNY',
  amount_cny numeric(18,4) not null default 0,
  occurred_at timestamptz not null default now(),
  status text,
  notes text,
  order_id uuid references public.orders(id) on delete set null,
  product_cost_cny numeric(18,4) default 0,
  freight_cny numeric(18,4) default 0,
  miscellaneous_cny numeric(18,4) default 0,
  other_cost_cny numeric(18,4) default 0,
  total_cost_cny numeric(18,4) default 0,
  calculated_profit_cny numeric(18,4) default 0,
  profit_margin numeric(9,4) default 0,
  order_revenue_cny numeric(18,4) default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;

alter table public.financial_records enable row level security;
drop policy if exists authenticated_access on public.financial_records;
create policy authenticated_access on public.financial_records
  for all to authenticated using (true) with check (true);
