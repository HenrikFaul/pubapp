-- ================================================================
-- KAPAKKA / PUBAPP - Full Database Schema
-- ================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis" schema extensions;

-- ================================================================
-- PROFILES (extends Supabase auth.users)
-- ================================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer', 'admin', 'staff', 'superadmin')),
  phone text,
  venue_id uuid, -- for staff/admin, which venue they belong to
  loyalty_points integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Allow staff to view their own profile + admin to view all in their venue
create policy "Admins can view all profiles in their venue"
  on public.profiles for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'superadmin')
    )
  );

-- ================================================================
-- VENUES (Vendéglátóhelyek)
-- ================================================================
create table if not exists public.venues (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text,
  address text,
  city text default 'Budapest',
  postal_code text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  website text,
  logo_url text,
  cover_url text,
  opening_hours jsonb default '{
    "monday": {"open": "10:00", "close": "24:00", "closed": false},
    "tuesday": {"open": "10:00", "close": "24:00", "closed": false},
    "wednesday": {"open": "10:00", "close": "24:00", "closed": false},
    "thursday": {"open": "10:00", "close": "24:00", "closed": false},
    "friday": {"open": "10:00", "close": "02:00", "closed": false},
    "saturday": {"open": "12:00", "close": "02:00", "closed": false},
    "sunday": {"open": "12:00", "close": "22:00", "closed": false}
  }'::jsonb,
  -- Configurable features
  has_table_service boolean default true,
  has_bar_service boolean default true,
  has_kitchen boolean default true,
  has_reservations boolean default false,
  accepts_card boolean default true,
  accepts_cash boolean default true,
  accepts_app_payment boolean default false,
  has_loyalty_program boolean default false,
  has_vip_orders boolean default false,
  -- Status
  is_active boolean default true,
  is_open boolean default true,
  rating double precision default 0,
  review_count integer default 0,
  owner_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.venues enable row level security;

create policy "Anyone can view active venues"
  on public.venues for select using (is_active = true);

create policy "Owners can manage their venue"
  on public.venues for all using (owner_id = auth.uid());

-- ================================================================
-- TABLES (Asztalok)
-- ================================================================
create table if not exists public.tables (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  number integer not null,
  name text, -- e.g. "Terasz 1", "VIP Szoba"
  capacity integer default 4,
  qr_code text unique, -- unique token for QR code
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.tables enable row level security;

create policy "Anyone can view tables"
  on public.tables for select using (is_active = true);

create policy "Venue owners/staff can manage tables"
  on public.tables for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.venue_id = tables.venue_id
      and p.role in ('admin', 'staff', 'superadmin')
    )
  );

-- Generate QR codes for tables
create or replace function generate_table_qr()
returns trigger as $$
begin
  if new.qr_code is null then
    new.qr_code = encode(gen_random_bytes(16), 'hex');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_table_qr
  before insert on public.tables
  for each row execute function generate_table_qr();

-- ================================================================
-- MENU CATEGORIES
-- ================================================================
create table if not exists public.menu_categories (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  name text not null, -- e.g. "Sörök", "Koktélok", "Ételek"
  name_en text,
  icon text, -- emoji or icon name
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.menu_categories enable row level security;
create policy "Anyone can view menu categories" on public.menu_categories for select using (is_active = true);
create policy "Staff can manage menu categories" on public.menu_categories for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.venue_id = menu_categories.venue_id and p.role in ('admin', 'staff', 'superadmin'))
);

-- ================================================================
-- MENU ITEMS (Étlap)
-- ================================================================
create table if not exists public.menu_items (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  category_id uuid references public.menu_categories(id),
  name text not null,
  name_en text,
  description text,
  price integer not null, -- in HUF
  image_url text,
  allergens text[],
  tags text[], -- e.g. ['vegetarian', 'spicy', 'new']
  -- Stock management
  stock_quantity integer,
  stock_unit text default 'db', -- 'db', 'liter', 'adag'
  low_stock_threshold integer default 5,
  track_stock boolean default false,
  -- Status
  is_available boolean default true,
  is_featured boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.menu_items enable row level security;
create policy "Anyone can view available menu items" on public.menu_items for select using (is_available = true);
create policy "Staff can manage menu items" on public.menu_items for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.venue_id = menu_items.venue_id and p.role in ('admin', 'staff', 'superadmin'))
);

-- ================================================================
-- ORDERS (Rendelések)
-- ================================================================
create type order_type as enum ('table_service', 'bar_pickup', 'bar_service');
create type order_status as enum ('pending', 'accepted', 'preparing', 'ready', 'delivered', 'completed', 'cancelled');
create type payment_method as enum ('cash', 'card', 'app');

create table if not exists public.orders (
  id uuid default uuid_generate_v4() primary key,
  order_number text unique not null, -- human-readable e.g. "K-0042"
  venue_id uuid references public.venues(id) on delete cascade not null,
  table_id uuid references public.tables(id),
  customer_id uuid references public.profiles(id),
  customer_name text, -- for non-registered customers
  -- Order details
  order_type order_type not null default 'bar_pickup',
  status order_status not null default 'pending',
  payment_method payment_method,
  is_paid boolean default false,
  is_vip boolean default false,
  -- Financials
  subtotal integer not null default 0, -- in HUF
  total integer not null default 0,
  -- Notes
  notes text,
  -- Timestamps
  placed_at timestamptz default now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  -- Staff
  served_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;

create policy "Customers can view their orders"
  on public.orders for select using (customer_id = auth.uid());

create policy "Customers can place orders"
  on public.orders for insert with check (true);

create policy "Staff can view all venue orders"
  on public.orders for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.venue_id = orders.venue_id and p.role in ('admin', 'staff', 'superadmin'))
  );

create policy "Staff can update venue orders"
  on public.orders for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.venue_id = orders.venue_id and p.role in ('admin', 'staff', 'superadmin'))
  );

-- Auto-generate order number
create or replace function generate_order_number()
returns trigger as $$
declare
  venue_prefix text;
  next_num integer;
begin
  select substring(name, 1, 1) into venue_prefix from public.venues where id = new.venue_id;
  select coalesce(max(cast(substring(order_number from '\d+') as integer)), 0) + 1
  into next_num
  from public.orders
  where venue_id = new.venue_id;
  new.order_number = 'K-' || lpad(next_num::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger set_order_number
  before insert on public.orders
  for each row execute function generate_order_number();

-- ================================================================
-- ORDER ITEMS (Rendelt tételek)
-- ================================================================
create table if not exists public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  menu_item_id uuid references public.menu_items(id) not null,
  quantity integer not null default 1,
  unit_price integer not null, -- price at time of order
  total_price integer not null,
  notes text, -- special instructions
  created_at timestamptz default now()
);

alter table public.order_items enable row level security;
create policy "Order items visible with order" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_items.order_id and (o.customer_id = auth.uid()))
  or
  exists (
    select 1 from public.orders o
    join public.profiles p on p.venue_id = o.venue_id
    where o.id = order_items.order_id and p.id = auth.uid() and p.role in ('admin', 'staff', 'superadmin')
  )
);
create policy "Anyone can insert order items" on public.order_items for insert with check (true);

-- ================================================================
-- REVIEWS (Értékelések)
-- ================================================================
create table if not exists public.reviews (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  customer_id uuid references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  is_anonymous boolean default false,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;
create policy "Anyone can view reviews" on public.reviews for select using (true);
create policy "Customers can create reviews" on public.reviews for insert with check (auth.uid() is not null);

-- Update venue rating trigger
create or replace function update_venue_rating()
returns trigger as $$
begin
  update public.venues set
    rating = (select avg(rating) from public.reviews where venue_id = new.venue_id),
    review_count = (select count(*) from public.reviews where venue_id = new.venue_id)
  where id = new.venue_id;
  return new;
end;
$$ language plpgsql;

create trigger update_rating_on_review
  after insert or update on public.reviews
  for each row execute function update_venue_rating();

-- ================================================================
-- PROMOTIONS / DISCOUNTS (Akciók)
-- ================================================================
create table if not exists public.promotions (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  title text not null,
  description text,
  discount_type text check (discount_type in ('percentage', 'fixed', 'free_item')),
  discount_value integer, -- percentage or HUF amount
  min_order_value integer,
  applies_to_category uuid references public.menu_categories(id),
  applies_to_item uuid references public.menu_items(id),
  valid_from timestamptz,
  valid_until timestamptz,
  valid_hours_from time, -- e.g. "18:00" happy hour
  valid_hours_until time,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.promotions enable row level security;
create policy "Anyone can view active promotions" on public.promotions for select using (is_active = true);

-- ================================================================
-- LOYALTY / TÖRZSVENDÉG
-- ================================================================
create table if not exists public.loyalty_transactions (
  id uuid default uuid_generate_v4() primary key,
  customer_id uuid references public.profiles(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  order_id uuid references public.orders(id),
  points integer not null, -- positive = earned, negative = redeemed
  description text,
  created_at timestamptz default now()
);

alter table public.loyalty_transactions enable row level security;
create policy "Customers view their loyalty" on public.loyalty_transactions for select using (customer_id = auth.uid());

-- ================================================================
-- PUB QUIZ / GAMES
-- ================================================================
create table if not exists public.quiz_questions (
  id uuid default uuid_generate_v4() primary key,
  question text not null,
  options jsonb not null, -- ["A", "B", "C", "D"]
  correct_answer integer not null, -- index 0-3
  category text default 'general',
  difficulty text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  language text default 'hu',
  created_at timestamptz default now()
);

alter table public.quiz_questions enable row level security;
create policy "Anyone can view quiz questions" on public.quiz_questions for select using (true);

create table if not exists public.quiz_sessions (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id),
  player_id uuid references public.profiles(id),
  player_name text,
  score integer default 0,
  questions_answered integer default 0,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.quiz_sessions enable row level security;
create policy "Anyone can create quiz sessions" on public.quiz_sessions for insert with check (true);
create policy "Players can view their sessions" on public.quiz_sessions for select using (player_id = auth.uid());

-- ================================================================
-- NOTIFICATIONS / PUSH
-- ================================================================
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  recipient_id uuid references public.profiles(id) on delete cascade,
  venue_id uuid references public.venues(id),
  title text not null,
  body text not null,
  type text default 'info' check (type in ('order_update', 'promotion', 'loyalty', 'system', 'info')),
  data jsonb,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users view their notifications" on public.notifications for select using (recipient_id = auth.uid());
create policy "Users can mark notifications read" on public.notifications for update using (recipient_id = auth.uid());

-- ================================================================
-- INVENTORY (Készlet)
-- ================================================================
create table if not exists public.inventory (
  id uuid default uuid_generate_v4() primary key,
  venue_id uuid references public.venues(id) on delete cascade not null,
  menu_item_id uuid references public.menu_items(id) on delete cascade,
  item_name text not null,
  quantity double precision not null default 0,
  unit text default 'db',
  low_threshold double precision default 10,
  cost_per_unit integer, -- HUF
  last_restocked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.inventory enable row level security;
create policy "Staff can manage inventory" on public.inventory for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.venue_id = inventory.venue_id and p.role in ('admin', 'staff', 'superadmin'))
);

-- ================================================================
-- SEED DATA
-- ================================================================

-- Insert sample quiz questions (Hungarian)
insert into public.quiz_questions (question, options, correct_answer, category, difficulty, language) values
('Melyik évben alapították a Sopronit?', '["1895", "1898", "1901", "1910"]', 1, 'sör', 'medium', 'hu'),
('Hány fokos a legtöbb lager sör?', '["3%", "4.5%", "7%", "10%"]', 1, 'sör', 'easy', 'hu'),
('Mi a "craft sör" angol neve?', '["Industrial beer", "Craft beer", "Light beer", "Draft beer"]', 1, 'sör', 'easy', 'hu'),
('Melyik nem sörtípus?', '["IPA", "Stout", "Lager", "Prosecco"]', 3, 'sör', 'easy', 'hu'),
('Hány kalória van egy 5 dl-es sörben átlagosan?', '["100", "175", "220", "350"]', 2, 'sör', 'hard', 'hu'),
('Mi a Guinness sör eredeti hazája?', '["Anglia", "Írország", "Skócia", "Wales"]', 1, 'általános', 'easy', 'hu'),
('Melyik városban található a legtöbb kocsma km²-enként Európában?', '["London", "Dublin", "Prága", "Budapest"]', 2, 'általános', 'medium', 'hu'),
('Mit jelent a "pálinka" szó?', '["Tűz", "Gyümölcs", "Lepárolt", "Édes"]', 0, 'párlatók', 'hard', 'hu'),
('Melyik a Magyarország legnépszerűbb bora?', '["Tokaji Aszú", "Egri Bikavér", "Villányi Franc", "Balatoni Rizling"]', 0, 'bor', 'medium', 'hu'),
('Mi a "mocktail"?', '["Erős koktél", "Alkoholmentes koktél", "Meleg ital", "Sörös koktél"]', 1, 'koktél', 'easy', 'hu')
on conflict do nothing;

-- ================================================================
-- FUNCTIONS
-- ================================================================

-- Get venue statistics for dashboard
create or replace function get_venue_stats(venue_uuid uuid, period text default 'today')
returns json as $$
declare
  start_date timestamptz;
  result json;
begin
  case period
    when 'today' then start_date = date_trunc('day', now());
    when 'week' then start_date = date_trunc('week', now());
    when 'month' then start_date = date_trunc('month', now());
    else start_date = date_trunc('day', now());
  end case;

  select json_build_object(
    'total_orders', count(*),
    'total_revenue', coalesce(sum(total), 0),
    'avg_order_value', coalesce(avg(total), 0),
    'total_guests', count(distinct coalesce(customer_id::text, customer_name))
  ) into result
  from public.orders
  where venue_id = venue_uuid
    and placed_at >= start_date
    and status not in ('cancelled');

  return result;
end;
$$ language plpgsql security definer;

-- Enable realtime for order updates
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.notifications;
