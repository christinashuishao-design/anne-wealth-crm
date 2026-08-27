create table if not exists public.customer_research_reports (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null unique references public.customers(id) on delete cascade,
  report_data jsonb not null default '{}', verification_status text not null default '待核验', researched_at date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.customer_research_contacts (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade,
  name text, position text, email text, phone text, linkedin text, source_url text, verification_status text not null default '待核验', created_at timestamptz not null default now()
);
create table if not exists public.customer_research_sources (
  id uuid primary key default gen_random_uuid(), customer_id uuid not null references public.customers(id) on delete cascade,
  title text, url text not null, fact_summary text, verification_status text not null default '待核验', checked_at date, created_at timestamptz not null default now()
);
alter table public.customer_research_reports enable row level security;
alter table public.customer_research_contacts enable row level security;
alter table public.customer_research_sources enable row level security;
create policy authenticated_access on public.customer_research_reports for all to authenticated using (true) with check (true);
create policy authenticated_access on public.customer_research_contacts for all to authenticated using (true) with check (true);
create policy authenticated_access on public.customer_research_sources for all to authenticated using (true) with check (true);

create table if not exists public.communication_sync_events (
  id uuid primary key default gen_random_uuid(), source text not null, external_id text not null,
  customer_id uuid references public.customers(id) on delete set null, occurred_at timestamptz,
  summary text, task_id uuid references public.tasks(id) on delete set null, created_at timestamptz not null default now(),
  unique(source, external_id)
);
alter table public.communication_sync_events enable row level security;
create policy authenticated_access on public.communication_sync_events for all to authenticated using (true) with check (true);
