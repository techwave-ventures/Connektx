import { Event, Attendee } from '@/types';

/**
 * Generates a unique ticket ID for each event attendee
 * Uses multiple fallback methods to ensure uniqueness
 */
export function generateUniqueTicketId(event: Event, attendee: Attendee): string {
  // Method 1: Use attendee ID if available (from backend)
  if (attendee.id) {
    return `TICKET-${event.id}-${attendee.id}`;
  }
  
  // Method 2: Use booking ID if available 
  if (attendee.bookingId) {
    return `TICKET-${event.id}-${attendee.bookingId}`;
  }
  
  // Method 3: Create a unique hash based on multiple factors
  const uniqueString = `${event.id}-${attendee.email}-${attendee.name}-${attendee.ticketType}-${event.date}`;
  const hash = uniqueString.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Convert to positive number and create 6-digit ticket number
  const positiveHash = Math.abs(hash);
  const ticketNumber = (positiveHash % 999999) + 100000; // 6 digit number
  
  return `TICKET-${event.id.slice(-4)}-${ticketNumber}`;
}

/**
 * Generates comprehensive QR code data with all attendee and event information
 * This data can be used for verification at event check-in
 */
export function generateQRCodeData(event: Event, attendee: Attendee): string {
  const ticketId = generateUniqueTicketId(event, attendee);
  
  const qrData = {
    ticketId,
    eventId: event.id,
    eventTitle: event.title,
    attendeeEmail: attendee.email,
    attendeeName: attendee.name,
    ticketType: attendee.ticketType,
    eventDate: event.date,
    eventTime: event.time,
    eventLocation: event.isOnline ? 'Online Event' : event.location,
    isOnline: event.isOnline,
    organizer: event.organizer,
    generatedAt: new Date().toISOString(),
    // Add phone if available for additional verification
    ...(attendee.phone && { attendeePhone: attendee.phone }),
    // Add booking information if available
    ...(attendee.bookingId && { bookingId: attendee.bookingId }),
    ...(attendee.bookingDate && { bookingDate: attendee.bookingDate })
  };
  
  return JSON.stringify(qrData);
}

/**
 * Validates and parses QR code data for event check-in
 * Returns parsed data or null if invalid
 */
export function parseQRCodeData(qrString: string) {
  try {
    const data = JSON.parse(qrString);
    
    // Validate required fields
    const requiredFields = [
      'ticketId', 'eventId', 'eventTitle', 'attendeeEmail', 
      'attendeeName', 'ticketType', 'eventDate', 'generatedAt'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        console.warn(`Missing required field: ${field}`);
        return null;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Invalid QR code data:', error);
    return null;
  }
}

/**
 * Generates a human-readable ticket summary for display
 */
export function getTicketDisplayInfo(qrData: any): string {
  if (!qrData) return 'Invalid Ticket';
  
  return `🎫 ${qrData.ticketId}
👤 ${qrData.attendeeName}
📧 ${qrData.attendeeEmail}
🎪 ${qrData.eventTitle}
📅 ${qrData.eventDate}
⏰ ${qrData.eventTime}
📍 ${qrData.eventLocation || qrData.isOnline ? 'Online' : 'TBD'}`;
}

/**
 * Checks if a ticket is valid for the current date/time
 */
export function isTicketValid(qrData: any): { valid: boolean; reason?: string } {
  if (!qrData) {
    return { valid: false, reason: 'Invalid ticket data' };
  }
  
  const eventDate = new Date(qrData.eventDate);
  const now = new Date();
  
  // Allow entry from 2 hours before event to 2 hours after
  const startTime = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
  const endTime = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000);
  
  if (now < startTime) {
    return { valid: false, reason: 'Event has not started yet' };
  }
  
  if (now > endTime) {
    return { valid: false, reason: 'Event entry period has ended' };
  }
  
  return { valid: true };
}
