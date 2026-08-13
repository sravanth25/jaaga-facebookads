-- Supabase SQL schema for Meta Ads Results & Leads Dashboard

create table if not exists meta_leads (
  id text primary key,                    -- Meta leadgen id (dedupe)
  full_name text,
  phone text,
  email text,
  field_data jsonb,                       -- all form answers
  campaign_id text,
  campaign_name text,
  adset_id text,
  ad_id text,
  form_id text,
  sheet_name text,
  created_time timestamptz,
  synced_at timestamptz default now()
);

alter table meta_leads add column if not exists campaign_name text;

create table if not exists meta_forms (
  id text primary key,
  name text,
  page_id text,
  updated_at timestamptz default now()
);

create table if not exists meta_views (
  id uuid primary key default gen_random_uuid(),
  scope text,                             -- overview | campaigns
  name text default 'Default',
  metrics jsonb,                          -- ordered array of metric keys
  is_default boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_meta_leads_campaign on meta_leads(campaign_id);
create index if not exists idx_meta_leads_created on meta_leads(created_time);
