-- Campaign Engine: re-engagement & targeted promotions
-- Run in Supabase SQL editor before deploying api/admin/campaigns.js

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  name text not null,
  segment_type text not null check (segment_type in ('lapsed_days','service_type','never_returned','manual_list')),
  segment_config jsonb not null default '{}',
  promotion_id uuid references promotions(id) on delete set null,
  channel text not null check (channel in ('email','sms','vapi','all')),
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','failed')),
  sent_count int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  business_id text not null,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  customer_email text,
  customer_phone text,
  channel_used text not null check (channel_used in ('email','sms','vapi')),
  promo_code_id uuid references promo_codes(id) on delete set null,
  promo_code text,
  status text not null default 'pending' check (status in ('pending','sent','failed','called','no-answer')),
  sent_at timestamptz,
  error_text text,
  created_at timestamptz not null default now()
);

create index if not exists campaign_sends_campaign_id_idx on campaign_sends(campaign_id);
create index if not exists campaigns_business_id_idx on campaigns(business_id);
create index if not exists campaigns_status_scheduled_idx on campaigns(status, scheduled_at);
