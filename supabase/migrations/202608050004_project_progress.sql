alter table public.opportunities
  add column if not exists project_progress text;
