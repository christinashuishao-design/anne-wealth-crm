create table if not exists public.communication_connections (
  source_key text primary key,
  display_name text not null,
  source_type text not null check (source_type in ('laifaxin','email','whatsapp')),
  account_identifier text not null,
  transport text not null default 'connector',
  status text not null default '待配置',
  cursor text,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  read_count bigint not null default 0,
  customer_message_count bigint not null default 0,
  matched_count bigint not null default 0,
  research_count bigint not null default 0,
  follow_up_count bigint not null default 0,
  task_count bigint not null default 0,
  draft_count bigint not null default 0,
  duplicate_count bigint not null default 0,
  manual_match_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.communication_connections enable row level security;
create policy authenticated_access on public.communication_connections for all to authenticated using (true) with check (true);

alter table public.communication_sync_events
  add column if not exists payload jsonb not null default '{}',
  add column if not exists processing_status text not null default '已记录',
  add column if not exists match_reason text;

insert into public.communication_connections(source_key,display_name,source_type,account_identifier,transport)
values
 ('laifaxin:xiaofupo','来发信 · 小富婆','laifaxin','小富婆','connector'),
 ('email:anne@skincarepkg.com','企业邮箱 · anne@skincarepkg.com','email','anne@skincarepkg.com','connector'),
 ('email:christina@skincarepkg.com','企业邮箱 · christina@skincarepkg.com','email','christina@skincarepkg.com','connector'),
 ('email:christina.s@chinabeautytools.com','企业邮箱 · christina.s@chinabeautytools.com','email','christina.s@chinabeautytools.com','connector'),
 ('email:christina.s@acfoldingbox.com','企业邮箱 · christina.s@acfoldingbox.com','email','christina.s@acfoldingbox.com','connector'),
 ('email:anne@oceanpackagings.com','企业邮箱 · anne@oceanpackagings.com','email','anne@oceanpackagings.com','connector'),
 ('email:angela.s@skincareform.com','企业邮箱 · angela.s@skincareform.com','email','angela.s@skincareform.com','connector'),
 ('whatsapp:business-1','WhatsApp Business · 账号 1','whatsapp','待绑定号码 1','meta_webhook'),
 ('whatsapp:business-2','WhatsApp Business · 账号 2','whatsapp','待绑定号码 2','meta_webhook')
on conflict(source_key) do update set display_name=excluded.display_name,source_type=excluded.source_type,transport=excluded.transport;

create or replace function public.add_communication_counts(
  p_source_key text,
  p_read bigint default 0,
  p_customer bigint default 0,
  p_matched bigint default 0,
  p_research bigint default 0,
  p_follow_up bigint default 0,
  p_task bigint default 0,
  p_draft bigint default 0,
  p_duplicate bigint default 0,
  p_manual bigint default 0
) returns void language sql security definer set search_path=public as $$
  update public.communication_connections set
    read_count=read_count+p_read,
    customer_message_count=customer_message_count+p_customer,
    matched_count=matched_count+p_matched,
    research_count=research_count+p_research,
    follow_up_count=follow_up_count+p_follow_up,
    task_count=task_count+p_task,
    draft_count=draft_count+p_draft,
    duplicate_count=duplicate_count+p_duplicate,
    manual_match_count=manual_match_count+p_manual,
    updated_at=now()
  where source_key=p_source_key;
$$;
