-- REPAIR SCRIPT: Restore visibility to all items in the database
-- If tables became invisible after enabling RLS, this ensures SELECT queries work.

-- 1. Restore Marketplace visibility
drop policy if exists "Marketplace items are viewable by everyone." on marketplace_items;
create policy "Marketplace items are viewable by everyone." on marketplace_items
  for select using (true);

-- 2. Restore Lost and Found visibility
drop policy if exists "Lost and found items are viewable by everyone." on lost_found_items;
create policy "Lost and found items are viewable by everyone." on lost_found_items
  for select using (true);

-- 3. Restore LRC Seats visibility
drop policy if exists "Study spaces are viewable by everyone." on lrc_seats;
create policy "Study spaces are viewable by everyone." on lrc_seats
  for select using (true);

-- 4. Restore Profiles visibility (required to check admin email)
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);
