-- Adds review_drip_sent_at to bookings for the review drip email cron.
-- Run once in the Supabase dashboard SQL editor.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_drip_sent_at TIMESTAMPTZ;
