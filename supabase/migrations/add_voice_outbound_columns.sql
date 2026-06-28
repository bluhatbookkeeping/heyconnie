-- Voice outbound columns + outbound_calls tracking table
-- Session 42 — 2026-06-21

-- bookings: track when reminder call was sent
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- bookings: track when review was requested (voice or email)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ;

-- bookings: completed_at for review-request window query
-- (status = 'completed' is already tracked; this gives us a precise timestamp)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- call_logs: track when abandoned follow-up call was sent
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS followup_call_sent_at TIMESTAMPTZ;

-- outbound_calls: log every Vapi outbound call fired by a cron
CREATE TABLE IF NOT EXISTS outbound_calls (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    TEXT NOT NULL,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  call_type      TEXT NOT NULL, -- 'reminder' | 'rebooking' | 'review_request' | 'abandoned_followup'
  vapi_call_id   TEXT,
  status         TEXT NOT NULL DEFAULT 'fired', -- 'fired' | 'answered' | 'voicemail' | 'failed'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outbound_calls_booking_id_idx  ON outbound_calls(booking_id);
CREATE INDEX IF NOT EXISTS outbound_calls_customer_id_idx ON outbound_calls(customer_id);
CREATE INDEX IF NOT EXISTS outbound_calls_call_type_idx   ON outbound_calls(call_type);

-- RLS: service role key bypasses; no row-level access needed for cron-only table
ALTER TABLE outbound_calls ENABLE ROW LEVEL SECURITY;
