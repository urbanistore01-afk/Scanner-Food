-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create tables
create table public.scans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  image_url text not null,
  result jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.goals (
  user_id uuid references auth.users primary key,
  calories integer not null default 2000,
  protein integer not null default 150,
  carbs integer not null default 250,
  fats integer not null default 70,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.scans enable row level security;
alter table public.goals enable row level security;
alter table public.chats enable row level security;

-- Create policies
create policy "Users can view own scans" on public.scans for select using (auth.uid() = user_id);
create policy "Users can insert own scans" on public.scans for insert with check (auth.uid() = user_id);

create policy "Users can view own goals" on public.goals for select using (auth.uid() = user_id);
create policy "Users can insert/update own goals" on public.goals for all using (auth.uid() = user_id);

create policy "Users can view own chats" on public.chats for select using (auth.uid() = user_id);
create policy "Users can insert own chats" on public.chats for insert with check (auth.uid() = user_id);

-- Storage Bucket
insert into storage.buckets (id, name, public) values ('scans', 'scans', false);
create policy "Users can view own scan images" on storage.objects for select using (bucket_id = 'scans' and auth.uid() = owner);
create policy "Users can upload scan images" on storage.objects for insert with check (bucket_id = 'scans' and auth.uid() = owner);
