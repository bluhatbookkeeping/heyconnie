#!/usr/bin/env node
/**
 * One-time backfill: inserts loyalty punches for completed bookings that were
 * marked paid before the punch-on-mark-as-paid logic was in place.
 *
 * Run: node scripts/backfill-loyalty-punches.js
 * (reads .env from project root automatically)
 *
 * Safe to re-run — insertPunchForBooking is idempotent via UNIQUE(booking_id, program_id).
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') })

const { createClient } = require('@supabase/supabase-js')
const { insertPunchForBooking } = require('../api/loyalty-utils')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function main() {
  console.log('Fetching completed bookings with no loyalty punch on record...\n')

  // Get all completed bookings
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, customer_id, email, name, service, business_id')
    .eq('status', 'completed')
    .not('customer_id', 'is', null)
    .order('created_at', { ascending: true })

  if (error) { console.error('Failed to fetch bookings:', error.message); process.exit(1) }
  if (!bookings?.length) { console.log('No completed bookings found.'); return }

  // Find which booking IDs already have at least one punch
  const ids = bookings.map(b => b.id)
  const { data: existingPunches } = await supabase
    .from('loyalty_punches')
    .select('booking_id')
    .in('booking_id', ids)

  const punchedIds = new Set((existingPunches || []).map(p => p.booking_id))
  const unpunched = bookings.filter(b => !punchedIds.has(b.id))

  console.log(`Total completed bookings: ${bookings.length}`)
  console.log(`Already punched:          ${punchedIds.size}`)
  console.log(`Need backfill:            ${unpunched.length}\n`)

  if (!unpunched.length) {
    console.log('Nothing to backfill — all set.')
    return
  }

  let punched = 0
  let skipped = 0
  let failed = 0

  for (const b of unpunched) {
    process.stdout.write(`  ${b.name} (${b.service}) ... `)
    try {
      const results = await insertPunchForBooking({
        bookingId: b.id,
        businessId: b.business_id,
        customerId: b.customer_id,
        customerEmail: b.email,
        customerName: b.name,
        service: b.service,
      })

      const hit = results.filter(r => r.punched)
      const skip = results.filter(r => !r.punched)

      if (hit.length) {
        const rewards = hit.filter(r => r.punchCount >= r.required)
        console.log(`✓ punched (${hit.map(r => `${r.punchCount}/${r.required}`).join(', ')})${rewards.length ? ' — REWARD EMAIL SENT' : ''}`)
        punched++
      } else if (skip.length) {
        console.log(`— skipped (${skip.map(r => r.reason).join(', ')})`)
        skipped++
      } else {
        console.log('— no applicable program')
        skipped++
      }
    } catch (e) {
      console.log(`✗ error: ${e.message}`)
      failed++
    }
  }

  console.log(`\nDone. Punched: ${punched} | Skipped: ${skipped} | Errors: ${failed}`)
  console.log('\nNote: reward emails were sent automatically for any customers who hit the threshold.')
}

main().catch(e => { console.error(e); process.exit(1) })
