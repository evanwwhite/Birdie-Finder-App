-- Birdie Finder — Supabase schema (BUILD_PLAN §3). RLS enabled on all tables.
create table profiles (
  id uuid primary key references auth.users(id),
  handle text unique, name text, pdga_number text,
  home_lat double precision, home_lng double precision,
  rating int, avatar_url text, created_at timestamptz default now()
);

create table courses (
  id text primary key, name text not null, city text, state text, zip text,
  lat double precision, lng double precision, holes int, par int,
  rating numeric, difficulty text, terrain text[], amenities text[], source text
);

create table course_holes (
  id bigint generated always as identity primary key,
  course_id text references courses(id), hole int, par int,
  distance_ft int, elevation_ft int,
  source text check (source in ('osm','estimated'))
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id), course_id text references courses(id),
  layout text, played_at timestamptz default now(),
  total int, rel_par int, hole_count int,
  status text check (status in ('live','complete')) default 'live'
);

create table round_players (
  id bigint generated always as identity primary key,
  round_id uuid references rounds(id) on delete cascade,
  player_id uuid references profiles(id), guest_name text, position int
);

create table hole_scores (
  id bigint generated always as identity primary key,
  round_id uuid references rounds(id) on delete cascade,
  player_id uuid references profiles(id), guest_name text,
  hole int not null, par int, strokes int,
  unique (round_id, player_id, guest_name, hole)
);

create table discs (
  id text primary key, name text, manufacturer text, primary_use text,
  speed numeric, glide numeric, turn numeric, fade numeric
);

create table bags (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id), disc_id text references discs(id),
  plastic text, color text, category text
);

create table follows (
  follower_id uuid references profiles(id),
  followee_id uuid references profiles(id),
  primary key (follower_id, followee_id)
);

create table reviews (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id), course_id text references courses(id),
  rating numeric, categories jsonb, body text, created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table rounds enable row level security;
alter table round_players enable row level security;
alter table hole_scores enable row level security;
alter table bags enable row level security;
alter table follows enable row level security;
alter table reviews enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own rounds" on rounds for all using (auth.uid() = user_id);
create policy "round scores readable by participants" on hole_scores for select using (true);
create policy "write own scores" on hole_scores for insert with check (player_id = auth.uid() or player_id is null);
create policy "update own scores" on hole_scores for update using (player_id = auth.uid() or player_id is null);
create policy "own bag" on bags for all using (auth.uid() = user_id);
create policy "own follows" on follows for all using (auth.uid() = follower_id);
create policy "reviews readable" on reviews for select using (true);
create policy "write own reviews" on reviews for insert with check (auth.uid() = user_id);

-- Realtime for the shared scorecard
alter publication supabase_realtime add table hole_scores;
