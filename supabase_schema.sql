-- Run this in Supabase SQL editor
create table if not exists license_codes (
  code text primary key,
  used boolean not null default false,
  used_at timestamptz,
  used_by text
);

-- Helpful index (optional)
create index if not exists license_codes_used_idx on license_codes (used);
