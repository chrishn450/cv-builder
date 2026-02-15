-- Tables for Payhip purchases + magic links + customers

create table if not exists public.customers (
  id bigserial primary key,
  email text unique not null,
  created_at timestamptz not null default now(),
  has_access boolean not null default false
);

create table if not exists public.purchases (
  id bigserial primary key,
  payhip_transaction_id text unique not null,
  customer_email text not null,
  product_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.magic_links (
  id bigserial primary key,
  customer_email text not null,
  token_hash text unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

-- Optional index for faster lookup
create index if not exists magic_links_email_idx on public.magic_links(customer_email);
create index if not exists purchases_email_idx on public.purchases(customer_email);

-- RLS: We only access these tables with Service Role key from serverless functions.
-- You can keep RLS enabled and deny anon access.
alter table public.customers enable row level security;
alter table public.purchases enable row level security;
alter table public.magic_links enable row level security;

-- Deny all for anon/authenticated by default (service role bypasses RLS).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customers' and policyname='deny_all_customers') then
    create policy deny_all_customers on public.customers for all using (false) with check (false);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchases' and policyname='deny_all_purchases') then
    create policy deny_all_purchases on public.purchases for all using (false) with check (false);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='magic_links' and policyname='deny_all_magic_links') then
    create policy deny_all_magic_links on public.magic_links for all using (false) with check (false);
  end if;
end$$;
