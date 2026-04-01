-- Hungary-wide local venue catalog for local-first search
-- This migration creates a local catalog table, a search RPC, sync state,
-- and helper functions to schedule recurring sync jobs.

create extension if not exists pg_trgm with schema public;
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.places_hu_catalog (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  name text not null,
  category_group text not null,
  categories text[] not null default '{}',
  address text,
  city text,
  postal_code text,
  country_code text not null default 'HU',
  latitude double precision,
  longitude double precision,
  open_now boolean,
  rating double precision,
  review_count integer,
  image_url text,
  phone text,
  website text,
  opening_hours_text text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  search_text text generated always as (
    lower(
      coalesce(name, '') || ' ' ||
      coalesce(address, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(postal_code, '') || ' ' ||
      coalesce(category_group, '') || ' ' ||
      coalesce(array_to_string(categories, ' '), '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);

create index if not exists idx_places_hu_catalog_category_group on public.places_hu_catalog (category_group);
create index if not exists idx_places_hu_catalog_city on public.places_hu_catalog (city);
create index if not exists idx_places_hu_catalog_synced_at on public.places_hu_catalog (synced_at desc);
create index if not exists idx_places_hu_catalog_last_seen_at on public.places_hu_catalog (last_seen_at desc);
create index if not exists idx_places_hu_catalog_coords on public.places_hu_catalog (latitude, longitude);
create index if not exists idx_places_hu_catalog_search_text_trgm on public.places_hu_catalog using gin (search_text gin_trgm_ops);

create or replace function public.set_updated_at_places_hu_catalog()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_places_hu_catalog_updated_at on public.places_hu_catalog;
create trigger trg_places_hu_catalog_updated_at
before update on public.places_hu_catalog
for each row execute function public.set_updated_at_places_hu_catalog();

alter table public.places_hu_catalog enable row level security;

drop policy if exists "Anyone can read Hungary places catalog" on public.places_hu_catalog;
create policy "Anyone can read Hungary places catalog"
on public.places_hu_catalog
for select
to public
using (true);

create table if not exists public.place_sync_state (
  key text primary key,
  cursor integer not null default 0,
  task_count integer not null default 0,
  status text not null default 'idle',
  last_cycle_started_at timestamptz,
  last_cycle_completed_at timestamptz,
  last_run_started_at timestamptz,
  last_run_completed_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

alter table public.place_sync_state enable row level security;

insert into public.place_sync_state(key, cursor, task_count, status)
values ('hu-venues', 0, 0, 'idle')
on conflict (key) do nothing;

create or replace function public.set_updated_at_place_sync_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_place_sync_state_updated_at on public.place_sync_state;
create trigger trg_place_sync_state_updated_at
before update on public.place_sync_state
for each row execute function public.set_updated_at_place_sync_state();

create or replace function public.haversine_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371 * 2 * asin(
    sqrt(
      power(sin(radians(($3 - $1) / 2)), 2) +
      cos(radians($1)) * cos(radians($3)) * power(sin(radians(($4 - $2) / 2)), 2)
    )
  );
$$;

create or replace function public.search_hungary_places(
  p_query text default null,
  p_category text default null,
  p_lat double precision default null,
  p_lon double precision default null,
  p_radius_km double precision default 25,
  p_open_now boolean default false,
  p_limit integer default 50
)
returns table (
  provider text,
  external_id text,
  name text,
  category text,
  categories text[],
  address text,
  city text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  rating double precision,
  review_count integer,
  image_url text,
  phone text,
  website text,
  open_now boolean,
  opening_hours_text text[],
  metadata jsonb,
  synced_at timestamptz
)
language sql
stable
as $$
  with args as (
    select
      nullif(lower(trim(coalesce(p_query, ''))), '') as q,
      nullif(lower(trim(coalesce(p_category, ''))), '') as c,
      greatest(1, least(coalesce(p_limit, 50), 200)) as result_limit,
      greatest(1, least(coalesce(p_radius_km, 25), 500)) as radius_limit
  ),
  base as (
    select
      p.provider,
      p.external_id,
      p.name,
      p.category_group as category,
      p.categories,
      p.address,
      p.city,
      p.postal_code,
      p.country_code,
      p.latitude,
      p.longitude,
      case
        when p_lat is not null and p_lon is not null and p.latitude is not null and p.longitude is not null
          then public.haversine_km(p_lat, p_lon, p.latitude, p.longitude)
        else null
      end as distance_km,
      p.rating,
      p.review_count,
      p.image_url,
      p.phone,
      p.website,
      p.open_now,
      p.opening_hours_text,
      p.metadata,
      p.synced_at,
      p.search_text,
      case
        when (select q from args) is null then 0
        when p.search_text like '%' || (select q from args) || '%' then 0
        when exists (
          select 1
          from regexp_split_to_table((select q from args), '\\s+') as token
          where token <> '' and p.search_text like '%' || token || '%'
        ) then 1
        else 2
      end as text_rank
    from public.places_hu_catalog p
    where p.country_code = 'HU'
      and (
        (select c from args) is null
        or p.category_group = (select c from args)
        or ((select c from args) = 'pub' and p.category_group in ('pub', 'bar'))
      )
      and (
        not coalesce(p_open_now, false)
        or coalesce(p.open_now, false) = true
      )
      and (
        (select q from args) is null
        or p.search_text like '%' || (select q from args) || '%'
        or exists (
          select 1
          from regexp_split_to_table((select q from args), '\\s+') as token
          where token <> '' and p.search_text like '%' || token || '%'
        )
      )
  )
  select
    provider,
    external_id,
    name,
    category,
    categories,
    address,
    city,
    postal_code,
    country_code,
    latitude,
    longitude,
    distance_km,
    rating,
    review_count,
    image_url,
    phone,
    website,
    open_now,
    opening_hours_text,
    metadata,
    synced_at
  from base
  where distance_km is null or distance_km <= (select radius_limit from args)
  order by
    text_rank asc,
    distance_km asc nulls last,
    rating desc nulls last,
    synced_at desc
  limit (select result_limit from args);
$$;

grant execute on function public.search_hungary_places(text, text, double precision, double precision, double precision, boolean, integer) to anon, authenticated;

create or replace function public.schedule_hu_place_sync(
  p_project_url text,
  p_anon_key text,
  p_schedule text default '*/15 * * * *'
)
returns text
language plpgsql
security definer
as $$
begin
  perform cron.unschedule('pubapp-sync-hu-places');

  perform cron.schedule(
    'pubapp-sync-hu-places',
    p_schedule,
    format(
      $cmd$select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body := '{"reason":"cron"}'::jsonb
      ) as request_id;$cmd$,
      rtrim(p_project_url, '/') || '/functions/v1/sync-hu-places',
      p_anon_key
    )
  );

  return 'scheduled';
end;
$$;

grant execute on function public.schedule_hu_place_sync(text, text, text) to authenticated;

create or replace function public.unschedule_hu_place_sync()
returns text
language plpgsql
security definer
as $$
begin
  perform cron.unschedule('pubapp-sync-hu-places');
  return 'unscheduled';
exception when others then
  return 'no existing schedule';
end;
$$;

grant execute on function public.unschedule_hu_place_sync() to authenticated;
