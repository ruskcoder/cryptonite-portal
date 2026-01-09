-- ============================================
-- 1. PROFILES TABLE
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text default 'user', 
  approval_status text default 'denied',
  email text unique,
  full_name text,
  phone_number text,
  katy_number text unique,
  grade int2,
  parent_email text,
  parent_phone text,
  address text
);

alter table public.profiles enable row level security;

-- ============================================
-- 2. ADMIN CHECK FUNCTION
-- Fixed potential naming collision by using alias
-- ============================================
create or replace function is_admin(p_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- ============================================
-- 3. EVENT HOUR TYPES TABLE
-- ============================================
create table public.event_hour_types (
  id uuid primary key default gen_random_uuid(),
  event_name text unique not null,
  hour_type text check (hour_type in ('PR', 'Build')) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.event_hour_types enable row level security;

create policy "Anyone can read event hour types" on public.event_hour_types for select using (true);
create policy "Admins can insert event hour types" on public.event_hour_types for insert with check (is_admin(auth.uid()));
create policy "Admins can update event hour types" on public.event_hour_types for update using (is_admin(auth.uid()));
create policy "Admins can delete event hour types" on public.event_hour_types for delete using (is_admin(auth.uid()));

-- ============================================
-- 4. AUTO CREATE PROFILE TRIGGER
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists to prevent errors on re-run
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- ============================================
-- 5. ATTENDANCE TABLE
-- ============================================
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  action text check (action in ('clock_in', 'clock_out')) not null,
  hour_type text check (hour_type in ('PR', 'Build')),
  time timestamptz default now() not null
);

alter table public.attendance enable row level security;

-- ============================================
-- 6. FIXED CLOCK IN/OUT FUNCTION
-- Fixed "ambiguous id" by using table aliases and explicit parameter names
-- ============================================
create or replace function public.clock_in_out(p_user_id uuid, p_action text)
returns table(
  id uuid,
  user_id uuid,
  action text,
  hour_type text,
  "time" timestamptz
) as $$
declare
  v_approval_status text;
begin
  -- 1. Validate action
  if p_action not in ('clock_in', 'clock_out') then
    raise exception 'Invalid action. Must be clock_in or clock_out';
  end if;

  -- 2. Check if user is approved
  select p.approval_status into v_approval_status
  from public.profiles p
  where p.id = p_user_id;

  if v_approval_status = 'denied' or v_approval_status is null then
    raise exception 'User is not approved to clock in or out';
  end if;

  -- 3. Insert and return
  return query
  insert into public.attendance (user_id, action, hour_type, time)
  values (p_user_id, p_action, null, now())
  returning attendance.id, attendance.user_id, attendance.action, attendance.hour_type, attendance.time;
end;
$$ language plpgsql security definer;

grant execute on function public.clock_in_out(uuid, text) to authenticated;

-- ============================================
-- 7. POLICIES
-- ============================================

-- Attendance Policies
create policy "Users can view own attendance" on public.attendance for select using (auth.uid() = user_id);
-- IMPORTANT: This allows the RPC function to perform the insert under the user's session
create policy "Users can insert own attendance" on public.attendance for insert with check (auth.uid() = user_id);

-- Profile Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Admin Policies (Consolidated)
create policy "Admins manage all profiles" on public.profiles for all using (is_admin(auth.uid()));
create policy "Admins manage all attendance" on public.attendance for all using (is_admin(auth.uid()));

-- ============================================
-- 8. FIXED GET USER INFO
-- Fixed naming collision
-- ============================================
create or replace function public.get_user_info(p_user_id uuid)
returns table(display_name text) as $$
begin
  return query
  select COALESCE(p.full_name, p.email)
  from public.profiles p
  where p.id = p_user_id
  limit 1;
end;
$$ language plpgsql security definer;

grant execute on function public.get_user_info(uuid) to authenticated;

-- ============================================
-- 9. DELETE USER FUNCTION
-- Only admins can delete users
-- ============================================
create or replace function public.delete_user(p_user_id uuid)
returns json as $$
declare
  v_result json;
begin
  -- Check if caller is admin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can delete users';
  end if;

  -- Delete the user from auth.users (cascade will delete profile)
  delete from auth.users where id = p_user_id;

  return json_build_object('success', true, 'message', 'User deleted successfully');
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;

grant execute on function public.delete_user(uuid) to authenticated;

-- ============================================
-- 10. VALIDATE CLOCK IN/OUT STATE
-- Prevent users from clocking in if already clocked in,
-- and prevent clocking out if already clocked out
-- ============================================
create or replace function public.validate_attendance_state(p_user_id uuid, p_action text)
returns table(is_valid boolean, message text) as $$
declare
  v_last_action text;
begin
  -- Get the most recent attendance action
  select action into v_last_action
  from public.attendance
  where user_id = p_user_id
  order by time desc
  limit 1;

  -- If no previous record, action is always valid
  if v_last_action is null then
    return query select true, 'Valid action'::text;
    return;
  end if;

  -- Check if trying to clock in while already clocked in
  if p_action = 'clock_in' and v_last_action = 'clock_in' then
    return query select false, 'Already clocked in. Please clock out first.'::text;
    return;
  end if;

  -- Check if trying to clock out while already clocked out
  if p_action = 'clock_out' and v_last_action = 'clock_out' then
    return query select false, 'Already clocked out. Please clock in first.'::text;
    return;
  end if;

  -- Action is valid
  return query select true, 'Valid action'::text;
end;
$$ language plpgsql security definer;

grant execute on function public.validate_attendance_state(uuid, text) to authenticated;

-- ============================================
-- 11. UPDATE CLOCK IN/OUT FUNCTION
-- Now includes state validation
-- ============================================
create or replace function public.clock_in_out(p_user_id uuid, p_action text)
returns table(
  id uuid,
  user_id uuid,
  action text,
  hour_type text,
  "time" timestamptz
) as $$
declare
  v_approval_status text;
  v_is_valid boolean;
  v_message text;
begin
  -- 1. Validate action format
  if p_action not in ('clock_in', 'clock_out') then
    raise exception 'Invalid action. Must be clock_in or clock_out';
  end if;

  -- 2. Check if user is approved
  select p.approval_status into v_approval_status
  from public.profiles p
  where p.id = p_user_id;

  if v_approval_status = 'denied' or v_approval_status is null then
    raise exception 'User is not approved to clock in or out';
  end if;

  -- 3. Validate current state
  select is_valid, message into v_is_valid, v_message
  from public.validate_attendance_state(p_user_id, p_action);

  if not v_is_valid then
    raise exception '%', v_message;
  end if;

  -- 4. Insert and return
  return query
  insert into public.attendance (user_id, action, hour_type, time)
  values (p_user_id, p_action, null, now())
  returning attendance.id, attendance.user_id, attendance.action, attendance.hour_type, attendance.time;
end;
$$ language plpgsql security definer;