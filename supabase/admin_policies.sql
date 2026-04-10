-- Enable RLS just in case it isn't
alter table marketplace_items enable row level security;
alter table lost_found_items enable row level security;
alter table lrc_seats enable row level security;

-- Admin bypass for Marketplace Items
drop policy if exists "Admins can delete any marketplace item." on marketplace_items;
create policy "Admins can delete any marketplace item." on marketplace_items
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.email = 'admin@campusconnect.com'
    )
  );

-- Admin bypass for Lost and Found Items
drop policy if exists "Admins can delete any lost/found item." on lost_found_items;
create policy "Admins can delete any lost/found item." on lost_found_items
  for delete using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.email = 'admin@campusconnect.com'
    )
  );

-- Admin bypass for LRC Seats
drop policy if exists "Admins can update (vacate) any lrc seat." on lrc_seats;
create policy "Admins can update (vacate) any lrc seat." on lrc_seats
  for update using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.email = 'admin@campusconnect.com'
    )
  );
