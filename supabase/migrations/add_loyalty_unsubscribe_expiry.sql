-- Opt-out flag for loyalty drip emails on customers
alter table customers add column if not exists loyalty_unsubscribed boolean not null default false;

-- Expired flag on promo_codes — distinct from redeemed (code was never used, just timed out after 180-day drip)
alter table promo_codes add column if not exists expired boolean not null default false;
alter table promo_codes add column if not exists expired_at timestamptz;
