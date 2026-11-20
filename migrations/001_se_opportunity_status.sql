create table if not exists se_opportunity_status (
  opportunity_id text not null,
  app_stage text not null check (app_stage in ('production', 'preview')),
  status text not null check (status in ('not_started', 'in_progress', 'done')),
  updated_by text not null,
  updated_at timestamptz not null default now(),
  primary key (opportunity_id, app_stage)
);

create index if not exists se_opportunity_status_updated_at_idx
  on se_opportunity_status (updated_at desc);
