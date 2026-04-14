export const VERTICALS = {
  realtor: {
    id: 'realtor',
    name: 'Real Estate Agent',
    description: 'Handles inbound buyer/seller calls, listing queries, showing bookings',
    tools: [
      'search_listings',
      'check_calendar_availability',
      'book_showing',
      'send_confirmation_sms',
      'log_lead_to_crm',
    ],
    phase: 1,
  },
  dental: {
    id: 'dental',
    name: 'Dental Office',
    description: 'Appointment booking, insurance verification, patient inquiries',
    tools: ['check_calendar_availability', 'book_appointment', 'send_confirmation_sms'],
    phase: 4,
  },
  legal: {
    id: 'legal',
    name: 'Law Firm',
    description: 'Initial consultation intake, case type qualification, scheduling',
    tools: ['check_calendar_availability', 'book_consultation', 'log_intake'],
    phase: 4,
  },
  general: {
    id: 'general',
    name: 'General Receptionist',
    description: 'General inbound call handling, message taking, basic FAQ',
    tools: ['send_confirmation_sms', 'log_lead_to_crm'],
    phase: 4,
  },
} as const;

export type VerticalId = keyof typeof VERTICALS;
