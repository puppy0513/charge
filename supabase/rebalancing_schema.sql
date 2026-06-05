create table if not exists public.portfolio_assets (
  id text primary key,
  ticker text not null,
  stock_name text not null,
  asset_class text not null check (asset_class in ('bond', 'equity', 'other')),
  current_price numeric(18, 2) not null default 0,
  amount numeric(18, 6) not null default 0,
  target_weight numeric(8, 4) not null default 0,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists portfolio_assets_ticker_idx on public.portfolio_assets (ticker);

alter table public.portfolio_assets enable row level security;

insert into public.portfolio_assets (id, ticker, stock_name, asset_class, current_price, amount, target_weight, display_order)
values
  ('icsh', 'ICSH', 'ICSH ETF', 'bond', 54000, 925, 50, 1),
  ('spym', 'SPYM', 'SPYM ETF', 'equity', 52000, 481, 25, 2),
  ('rise200', '148020', 'RISE 200 ETF', 'equity', 31500, 714, 22.5, 3),
  ('kodex_kdefense_top10', '0080G0', 'KODEX K방산 TOP10', 'equity', 42800, 175, 7.5, 4)
on conflict (ticker) do nothing;
