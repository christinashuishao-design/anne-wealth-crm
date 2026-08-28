alter table public.products
  add column if not exists commercial_status text not null default '未成交'
    check (commercial_status in ('未成交','已报价','已打样','已下单','已成交'));

create table if not exists public.product_price_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  source_type text not null default '截图识别',
  source_date date default current_date,
  currency char(3) not null default 'CNY',
  minimum_quantity int not null default 1 check (minimum_quantity > 0),
  maximum_quantity int,
  unit_price numeric(18,6) not null check (unit_price >= 0),
  tax_included boolean,
  trade_term text,
  valid_until date,
  status text not null default '待核验',
  confidence numeric(5,4),
  source_image_path text,
  raw_text text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.product_price_records enable row level security;
create policy authenticated_access on public.product_price_records for all to authenticated using (true) with check (true);
create index if not exists product_price_lookup on public.product_price_records(product_id,currency,minimum_quantity,status) where deleted_at is null;

insert into storage.buckets(id,name,public) values('pricing-screenshots','pricing-screenshots',false) on conflict do nothing;
create policy pricing_screenshots_read on storage.objects for select to authenticated using(bucket_id='pricing-screenshots');
create policy pricing_screenshots_write on storage.objects for insert to authenticated with check(bucket_id='pricing-screenshots');
