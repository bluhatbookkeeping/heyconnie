module.exports = {
  id: 'luis-mobile-detail',
  name: 'Luis Mobile Detail',
  owner_name: 'Luis',
  phone: '626-654-1924',
  transfer_number: '6264093147',
  instagram: '@luismobiledetail',
  notificationEmail: process.env.NOTIFICATION_EMAIL,
  service_area: 'San Gabriel Valley — Pasadena, West Covina, El Monte, Pomona, Alhambra and surrounding cities',
  serviceArea: 'San Gabriel Valley — Pasadena, West Covina, El Monte, Pomona, Alhambra and surrounding cities',
  timezone: 'America/Los_Angeles',
  DURATIONS: {
    'Just a Wash': 60,
    'Standard Detail': 120,
    'Full Detail': 240,
  },
  services: [
    { name: 'Just a Wash', starting_price: '$45', price: 'Starting at $45' },
    { name: 'Standard Detail', starting_price: '$75', price: 'Starting at $75' },
    { name: 'Full Detail', starting_price: '$350', price: 'Starting at $350' },
  ],
  pricingNote: 'Prices are starting points. Final price depends on vehicle size and condition and is confirmed before work begins.',
  greeting: "Hi! I'm the virtual assistant for Luis Mobile Detail. I can answer questions about our services and pricing. What can I help you with?",
  features: {
    chat: true,
    voice: true,
    marketing: false,
  },
}
