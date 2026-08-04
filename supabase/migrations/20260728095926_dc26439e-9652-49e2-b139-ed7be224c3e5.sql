ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_booking_updates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_new_messages boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_marketing boolean NOT NULL DEFAULT false;