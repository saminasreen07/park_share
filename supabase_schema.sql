-- ParkShare Production-Ready Supabase Schema

-- Enable necessary Extensions
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. Profiles Table
-- ==========================================
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    email text unique not null,
    phone text unique,
    role text not null default 'driver' check (role in ('driver', 'owner', 'admin')),
    avatar_url text default '',
    is_verified boolean not null default false,
    rating numeric(3, 2) not null default 5.0 check (rating >= 1.0 and rating <= 5.0),
    
    -- Owner Onboarding Verification Data
    address text,
    pin_code text,
    city text,
    state text,
    aadhaar_number text,
    aadhaar_front_url text,
    aadhaar_back_url text,
    address_proof_url text,
    property_proof_url text,
    selfie_url text,
    
    -- Bank Payout Details
    bank_account_number text,
    bank_ifsc text,
    bank_holder_name text,
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Allow public read-only access to profiles" 
on public.profiles for select 
using (true);

create policy "Allow users to update their own profiles" 
on public.profiles for update 
using (auth.uid() = id);

create policy "Allow admins complete access to profiles" 
on public.profiles for all 
using (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);

-- ==========================================
-- 2. Parking Spaces Table
-- ==========================================
create table public.parking_spaces (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    description text,
    address text not null,
    latitude numeric(10, 8) not null,
    longitude numeric(11, 8) not null,
    images text[] not null default '{}',
    video_url text default '',
    
    -- Pricing
    price_per_hour numeric(10, 2) not null check (price_per_hour >= 0),
    price_per_day numeric(10, 2) check (price_per_day >= 0),
    price_per_month numeric(10, 2) check (price_per_month >= 0),
    
    -- Capacities
    total_slots integer not null default 1 check (total_slots >= 1),
    available_slots integer not null default 1,
    
    -- Boolean features flags
    is_covered boolean not null default false,
    has_ev_charger boolean not null default false,
    has_cctv boolean not null default false,
    is_security_guarded boolean not null default false,
    has_valet boolean not null default false,
    
    -- Features arrays
    vehicle_types text[] not null default '{"4-wheeler"}',
    amenities text[] not null default '{}',
    rules text,
    instructions text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    average_rating numeric(3, 2) not null default 0.0,
    review_count integer not null default 0,
    
    -- Availabilities
    is_always_available boolean not null default true,
    start_time text default '00:00',
    end_time text default '23:59',
    days_of_week integer[] not null default '{0,1,2,3,4,5,6}',
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Parking Spaces
alter table public.parking_spaces enable row level security;

-- Parking Spaces Policies
create policy "Allow anyone to search/view approved parking spaces" 
on public.parking_spaces for select 
using (status = 'approved' or owner_id = auth.uid() or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow owners to create parking spaces" 
on public.parking_spaces for insert 
with check (auth.role() = 'authenticated' and exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'owner'
));

create policy "Allow owners to modify their own parking spaces" 
on public.parking_spaces for update 
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Allow owners to delete their own spaces" 
on public.parking_spaces for delete 
using (owner_id = auth.uid());

create policy "Allow admins full access to parking spaces" 
on public.parking_spaces for all 
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

-- ==========================================
-- 3. Bookings Table
-- ==========================================
create table public.bookings (
    id uuid primary key default gen_random_uuid(),
    driver_id uuid references public.profiles(id) on delete cascade not null,
    space_id uuid references public.parking_spaces(id) on delete cascade not null,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    total_amount numeric(10, 2) not null,
    status text not null default 'pending' check (status in ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
    vehicle_number text not null,
    vehicle_type text not null default 'car',
    
    -- Driver Document Upload Checks
    vehicle_front_url text,
    vehicle_rear_url text,
    vehicle_side_url text,
    license_front_url text,
    license_back_url text,
    driver_aadhaar_front_url text,
    driver_aadhaar_back_url text,
    
    -- Payment reference keys
    receipt_id text,
    payment_id text,
    
    -- Interactive Check-In Logs
    check_in_time timestamp with time zone,
    check_out_time timestamp with time zone,
    
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Bookings
alter table public.bookings enable row level security;

-- Bookings Policies
create policy "Drivers and owners can select their bookings" 
on public.bookings for select 
using (
    driver_id = auth.uid() 
    or exists (
        select 1 from public.parking_spaces p 
        where p.id = space_id and p.owner_id = auth.uid()
    )
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);

create policy "Drivers can insert bookings" 
on public.bookings for insert 
with check (auth.role() = 'authenticated' and driver_id = auth.uid());

create policy "Drivers and owners can update their bookings" 
on public.bookings for update 
using (
    driver_id = auth.uid() 
    or exists (
        select 1 from public.parking_spaces p 
        where p.id = space_id and p.owner_id = auth.uid()
    )
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
);

create policy "Admins can delete bookings" 
on public.bookings for delete 
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

-- ==========================================
-- 4. Favorites Table
-- ==========================================
create table public.favorites (
    id uuid primary key default gen_random_uuid(),
    driver_id uuid references public.profiles(id) on delete cascade not null,
    space_id uuid references public.parking_spaces(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(driver_id, space_id)
);

-- Enable RLS on Favorites
alter table public.favorites enable row level security;

-- Favorites Policies
create policy "Users can select their own favorites" 
on public.favorites for select 
using (driver_id = auth.uid());

create policy "Users can insert their own favorites" 
on public.favorites for insert 
with check (auth.role() = 'authenticated' and driver_id = auth.uid());

create policy "Users can delete their own favorites" 
on public.favorites for delete 
using (driver_id = auth.uid());

-- ==========================================
-- 5. Reviews Table
-- ==========================================
create table public.reviews (
    id uuid primary key default gen_random_uuid(),
    driver_id uuid references public.profiles(id) on delete cascade not null,
    space_id uuid references public.parking_spaces(id) on delete cascade not null,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Reviews
alter table public.reviews enable row level security;

-- Reviews Policies
create policy "Anyone can read reviews" 
on public.reviews for select 
using (true);

create policy "Drivers can insert reviews for completed stays" 
on public.reviews for insert 
with check (auth.role() = 'authenticated' and driver_id = auth.uid());

-- ==========================================
-- 6. Notifications Table
-- ==========================================
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    message text not null,
    type text not null default 'general',
    is_read boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Notifications
alter table public.notifications enable row level security;

-- Notifications Policies
create policy "Users can read/update their own notifications" 
on public.notifications for all 
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ==========================================
-- 7. Support Tickets Table
-- ==========================================
create table public.tickets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete cascade not null,
    subject text not null,
    description text not null,
    status text not null default 'open' check (status in ('open', 'resolved', 'closed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Support Tickets
alter table public.tickets enable row level security;

-- Support Tickets Policies
create policy "Users can read/write their own tickets" 
on public.tickets for all 
using (user_id = auth.uid() or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin')
with check (user_id = auth.uid() or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

-- ==========================================
-- 8. Payments Table
-- ==========================================
create table public.payments (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete cascade not null,
    driver_id uuid references public.profiles(id) on delete cascade not null,
    razorpay_order_id text not null,
    razorpay_payment_id text,
    razorpay_signature text,
    amount numeric(10, 2) not null,
    status text not null default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Payments
alter table public.payments enable row level security;

-- Payments Policies
create policy "Users can read their own payments, admins can view all" 
on public.payments for select 
using (driver_id = auth.uid() or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

-- ==========================================
-- 9. Automatic Profile Generator & Triggers
-- ==========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    name, 
    email, 
    phone, 
    role, 
    avatar_url, 
    is_verified, 
    rating
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    new.email,
    coalesce(new.phone, new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'driver'),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    false,
    5.0
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to recalculate parking space average rating on reviews updates
create or replace function public.recalculate_parking_space_rating()
returns trigger as $$
begin
  update public.parking_spaces
  set 
    average_rating = coalesce((select avg(rating)::numeric(3, 2) from public.reviews where space_id = new.space_id), 0.0),
    review_count = (select count(*)::integer from public.reviews where space_id = new.space_id)
  where id = new.space_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_review_added
  after insert on public.reviews
  for each row execute procedure public.recalculate_parking_space_rating();

-- ==========================================
-- 10. Storage Setup and RLS Policies
-- ==========================================
-- Storage Policy for parking-spaces (Public viewing allowed)
create policy "Allow public view for parking space media"
on storage.objects for select
using (bucket_id = 'parking-spaces');

create policy "Allow owners to upload parking space media"
on storage.objects for insert
with check (
    bucket_id = 'parking-spaces' 
    and auth.role() = 'authenticated'
    and exists (
        select 1 from public.profiles 
        where id = auth.uid() and role = 'owner'
    )
);

-- Storage Policy for owner-verification documents (Private)
create policy "Allow owners to view their own kyc files, admins all"
on storage.objects for select
using (
    bucket_id = 'owner-verification'
    and (
        (substring(name from '^([^/]+)') = auth.uid()::text)
        or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    )
);

create policy "Allow owners to upload their own kyc files"
on storage.objects for insert
with check (
    bucket_id = 'owner-verification'
    and auth.role() = 'authenticated'
    and (substring(name from '^([^/]+)') = auth.uid()::text)
);

-- Storage Policy for driver-documents (Booking Private verification details)
create policy "Allow driver, owner and admins to select booking verification documents"
on storage.objects for select
using (
    bucket_id = 'driver-documents'
    and (
        exists (
            select 1 from public.bookings b
            where b.id::text = substring(name from '^([^/]+)')
            and (
                b.driver_id = auth.uid()
                or exists (
                    select 1 from public.parking_spaces p
                    where p.id = b.space_id and p.owner_id = auth.uid()
                )
            )
        )
        or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    )
);

create policy "Allow drivers to upload booking verification documents"
on storage.objects for insert
with check (
    bucket_id = 'driver-documents'
    and auth.role() = 'authenticated'
    and exists (
        select 1 from public.bookings b
        where b.id::text = substring(name from '^([^/]+)')
        and b.driver_id = auth.uid()
    )
);
