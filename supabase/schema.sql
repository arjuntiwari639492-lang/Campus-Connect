-- Create a table for public profiles using Supabase Auth
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  university text,
  major text,
  year text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for profiles
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for Marketplace Items
create table marketplace_items (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references profiles(id) not null,
  title text not null,
  description text,
  price numeric not null,
  category text not null,
  condition text,
  image_url text,
  status text default 'active', -- 'active', 'sold', 'pending'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for Marketplace
alter table marketplace_items enable row level security;

create policy "Marketplace items are viewable by everyone." on marketplace_items
  for select using (true);

create policy "Users can insert their own marketplace items." on marketplace_items
  for insert with check (auth.uid() = seller_id);

create policy "Users can update their own marketplace items." on marketplace_items
  for update using (auth.uid() = seller_id);

create policy "Users can delete their own marketplace items." on marketplace_items
  for delete using (auth.uid() = seller_id);


-- Create a table for Lost and Found Items
create table lost_found_items (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references profiles(id) not null,
  title text not null,
  description text,
  location text,
  type text not null, -- 'lost' or 'found'
  date_reported timestamp with time zone default timezone('utc'::text, now()) not null,
  image_url text,
  status text default 'open', -- 'open', 'resolved'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for Lost and Found
alter table lost_found_items enable row level security;

create policy "Lost and found items are viewable by everyone." on lost_found_items
  for select using (true);

create policy "Users can report lost/found items." on lost_found_items
  for insert with check (auth.uid() = reporter_id);

create policy "Users can update their own reports." on lost_found_items
  for update using (auth.uid() = reporter_id);


-- Create a table for Study Spaces (LRC Seats)
create table lrc_seats (
  id text primary key, -- e.g., 'Sofa-1', 'GT-L1-S1'
  type text,
  status text default 'Available', -- 'Available', 'Occupied'
  vacant_at timestamp with time zone,
  booked_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for Study Spaces
alter table lrc_seats enable row level security;

create policy "Study spaces are viewable by everyone." on lrc_seats
  for select using (true);

create policy "Authenticated users can update seat status (book/release)." on lrc_seats
  for update using (auth.role() = 'authenticated');

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed Data for Seats (Optional, can be run to initialize)
-- insert into lrc_seats (id, type, status) values
-- ('Sofa-1', 'Premium Sofa', 'Available'),
-- ('Sofa-2', 'Premium Sofa', 'Available'),
-- ... (add more as needed)
-- Create a table for messages between buyers and sellers
create table messages (
  id uuid default uuid_generate_v4() primary key,
  item_id uuid references marketplace_items(id) on delete cascade,
  sender_id uuid references profiles(id) not null,
  receiver_id uuid references profiles(id) not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for Messages
alter table messages enable row level security;

create policy "Users can view messages they sent or received." on messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages." on messages
  for insert with check (auth.uid() = sender_id);

create policy "Users can update their own received messages (mark as read)." on messages
  for update using (auth.uid() = receiver_id);
