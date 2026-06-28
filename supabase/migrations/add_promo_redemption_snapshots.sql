-- Add snapshot columns to promo_redemptions so that deleting a promotion
-- does not erase the human-readable record from customer history.
-- Run this in the Supabase SQL editor before deploying the delete feature.

ALTER TABLE promo_redemptions
  ADD COLUMN IF NOT EXISTS promo_name_snapshot text,
  ADD COLUMN IF NOT EXISTS code_snapshot text;
