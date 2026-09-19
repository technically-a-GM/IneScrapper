create extension if not exists "pgcrypto";

create table if not exists public.tracked_products (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  name text not null,
  brand text,
  category text,
  sku text,
  url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracked_products_product_id_unique unique (product_id),
  constraint tracked_products_product_id_not_blank check (btrim(product_id) <> ''),
  constraint tracked_products_name_not_blank check (btrim(name) <> ''),
  constraint tracked_products_url_not_blank check (btrim(url) <> '')
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  tracked_product_id uuid not null references public.tracked_products(id) on delete cascade,
  price numeric(12, 2) not null,
  stock_text text not null,
  stock_quantity integer not null,
  in_stock boolean not null,
  scraped_at timestamptz not null default now(),
  constraint price_history_price_valid check (price >= 0),
  constraint price_history_stock_quantity_valid check (stock_quantity >= 0),
  constraint price_history_stock_text_not_blank check (btrim(stock_text) <> '')
);

create table if not exists public.scrape_logs (
  id uuid primary key default gen_random_uuid(),
  tracked_product_id uuid not null references public.tracked_products(id) on delete cascade,
  attempt_number integer not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  error_message text,
  price_found numeric(12, 2),
  stock_text text,
  stock_quantity integer,
  in_stock boolean,
  constraint scrape_logs_status_valid check (status in ('SUCCESS', 'FAILED', 'RETRYING')),
  constraint scrape_logs_attempt_number_valid check (attempt_number > 0),
  constraint scrape_logs_price_found_valid check (price_found is null or price_found >= 0),
  constraint scrape_logs_stock_quantity_valid check (stock_quantity is null or stock_quantity >= 0),
  constraint scrape_logs_success_has_valid_data check (
    status <> 'SUCCESS'
    or (
      error_message is null
      and price_found is not null
      and stock_text is not null
      and btrim(stock_text) <> ''
      and stock_quantity is not null
      and in_stock is not null
    )
  )
);

create index if not exists tracked_products_active_idx
  on public.tracked_products(active);

create index if not exists price_history_product_scraped_at_idx
  on public.price_history(tracked_product_id, scraped_at desc);

create index if not exists scrape_logs_product_started_at_idx
  on public.scrape_logs(tracked_product_id, started_at desc);

create index if not exists scrape_logs_product_attempt_idx
  on public.scrape_logs(tracked_product_id, attempt_number);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tracked_products_updated_at on public.tracked_products;

create trigger set_tracked_products_updated_at
before update on public.tracked_products
for each row
execute function public.set_updated_at();
