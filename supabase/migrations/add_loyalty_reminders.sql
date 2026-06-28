-- Tracks which milestone reminder emails have been sent for each unredeemed loyalty reward code.
-- milestone_days > 0 = days since reward was issued (30, 60, 90 re-engagement drip)
-- milestone_days < 0 = days before expiry (-30 = expiry warning)
-- Unique constraint on (promo_code_id, milestone_days) prevents duplicate sends at the DB level.

create table if not exists loyalty_reminders (
  id              uuid primary key default gen_random_uuid(),
  promo_code_id   uuid not null references promo_codes(id) on delete cascade,
  business_id     text not null,
  customer_id     uuid references customers(id) on delete set null,
  milestone_days  int not null,
  sent_at         timestamptz not null default now(),
  unique(promo_code_id, milestone_days)
);

create index if not exists loyalty_reminders_promo_code_id_idx on loyalty_reminders(promo_code_id);
create index if not exists loyalty_reminders_customer_id_idx on loyalty_reminders(customer_id);
