alter table public.tasks
  add column if not exists opportunity_id uuid references public.opportunities(id);
