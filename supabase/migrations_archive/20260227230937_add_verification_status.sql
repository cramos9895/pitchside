-- Add verification_status to profiles table
alter table public.profiles add column if not exists verification_status text default 'verified';
alter table public.profiles add constraint valid_verification_status check (verification_status in ('verified', 'pending', 'rejected'));
