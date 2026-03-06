-- Add phone to profiles for SMS alerts (session booked, reminders)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
