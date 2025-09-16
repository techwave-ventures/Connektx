// social/api/event.ts

const API_BASE = 'https://social-backend-y1rg.onrender.com'; // Updated to match your curl command

export async function fetchEvents(filters?: any) {
  try {
    // Build query parameters with proper date filtering
    const params = new URLSearchParams();
    
    console.log('API Debug - Filters received:', filters);
    
    if (filters) {
      // Handle other filters first (don't apply date filtering on server for now)
      if (filters.category && filters.category !== 'all') {
        params.append('category', filters.category);
      }
      
      if (filters.isPaid && filters.isPaid !== 'all') {
        params.append('isPaid', filters.isPaid === 'paid' ? 'true' : 'false');
      }
      
      if (filters.isOnline && filters.isOnline !== 'all') {
        params.append('isOnline', filters.isOnline === 'online' ? 'true' : 'false');
      }
      
      // Let client-side handle date filtering for now to avoid timezone issues
      console.log('API Debug - Skipping server-side date filtering to avoid timezone issues');
    }
    
    // Add cache-busting parameter
    params.append('_', Date.now().toString());
    
    const queryString = params.toString();
    const url = `${API_BASE}/event/getAllEvents${queryString ? '?' + queryString : ''}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // This helps in some environments
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch events: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    const events = data.body || data;
    
    // Validate response structure
    if (!Array.isArray(events)) {
      console.warn('Events API returned non-array data:', events);
      return [];
    }
    
    return events;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

export async function bookTicket(token: string, eventId: string, ticketData: { 
  ticketTypeId: string; 
  name: string; 
  email: string; 
  phone?: string;
}) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    if (!eventId || !ticketData.ticketTypeId || !ticketData.name || !ticketData.email) {
      throw new Error('Missing required booking information');
    }
    
    const res = await fetch(`${API_BASE}/event/bookTicket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({
        eventId,
        ...ticketData
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to book ticket: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    return data.body || data;
  } catch (error) {
    console.error('Error booking ticket:', error);
    throw error;
  }
}

export async function createTicket(token: string, ticketData: { name: string; price: string; remTicket: number }) {
  
  const res = await fetch(`${API_BASE}/event/createTicket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': token,
    },
    body: JSON.stringify(ticketData),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  
  return data.body.ticketId || data.body.id || data.body._id;
}

export async function createEvent(token: string, eventData: any) {
  const formData = new FormData();
 

  formData.append('title', eventData.title);
  formData.append('description', eventData.description);
  formData.append('shortDescription', eventData.shortDescription);
  formData.append('date', eventData.date);
  formData.append('time', eventData.time);
  formData.append('location', eventData.location);
  if (eventData.banner) {
    formData.append('banner', eventData.banner);
  }
  formData.append('organizer', eventData.organizer);
  formData.append('organizerId', eventData.organizerId);
  formData.append('isPaid', eventData.isPaid.toString());
  formData.append('isOnline', eventData.isOnline.toString());
  formData.append('onlineEventLink', eventData.onlineEventLink || '');
  formData.append('category', eventData.category);
  formData.append('ticketTypes', JSON.stringify(eventData.ticketTypes));
  formData.append('maxAttendees', eventData.maxAttendees.toString());
  formData.append('attendees', JSON.stringify(eventData.attendees));
  // Ensure tags and speakers are always sent as JSON strings, even if empty
  // Send tags and speakers as JSON strings (matching Postman format)
  formData.append('tags', JSON.stringify(eventData.tags || []));
  formData.append('speakers', JSON.stringify(eventData.speakers || []));
  formData.append('createdBy', eventData.createdBy);
  formData.append('likes', JSON.stringify(eventData.likes));
  formData.append('bookmarks', JSON.stringify(eventData.bookmarks));

  // Community event fields
  if (eventData.communityId) {
    formData.append('communityId', eventData.communityId);
    formData.append('organizerType', 'community');
  } else {
    formData.append('organizerType', 'user');
  }

  const res = await fetch(`${API_BASE}/event/createEvent`, { 
    method: 'POST',
    headers: {
      'token': token, 
    },
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

// Create event specifically for communities
export async function createCommunityEvent(token: string, communityId: string, eventData: any) {
  if (!token) {
    throw new Error('Authentication token is required');
  }
  
  if (!communityId) {
    throw new Error('Community ID is required for community events');
  }
  
  // Add community-specific data to the event
  const communityEventData = {
    ...eventData,
    communityId,
    organizerType: 'community',
  };
  
  return createEvent(token, communityEventData);
}

// Fetch events for a specific community
export async function fetchCommunityEvents(token: string, communityId: string) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    if (!communityId) {
      throw new Error('Community ID is required');
    }
    
    console.log(`[fetchCommunityEvents] Fetching events for community: ${communityId}`);
    
    // Use the main events endpoint since the backend doesn't have a specific community events endpoint
    const res = await fetch(`${API_BASE}/event/getAllEvents`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch community events: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    const allEvents = data.body || data;
    
    // Validate response structure
    if (!Array.isArray(allEvents)) {
      console.warn('Events API returned non-array data:', allEvents);
      return [];
    }
    
    // Filter events for the specific community and normalize ID field
    const communityEvents = allEvents.filter(event => {
      return event.communityId === communityId;
    }).map(event => ({
      ...event,
      id: event._id || event.id, // Ensure consistent ID field
    }));
    
    console.log(`[fetchCommunityEvents] Found ${communityEvents.length} events for community ${communityId}`);
    
    return communityEvents;
  } catch (error) {
    console.error('Error fetching community events:', error);
    throw error;
  }
}


export async function fetchEventById(token: string, eventId: string) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    const res = await fetch(`${API_BASE}/event/${eventId}`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch event: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    const event = data.body || data;
    
    if (!event) {
      throw new Error('Event not found');
    }
    
    return event;
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    throw error;
  }
}

export async function fetchUserBookedEvents(token: string) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    const res = await fetch(`${API_BASE}/event/getUserBookedEvents`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch user booked events: ${res.status} - ${errorText}`);
    }
    
    const response = await res.json();
    const events = response.body || response;
    
    // Validate response structure
    if (!Array.isArray(events)) {
      console.warn('User booked events API returned non-array data:', events);
      return [];
    }
    
    return events;
  } catch (error) {
    console.error('Error fetching user booked events:', error);
    throw error;
  }
}



export async function fetchUserCreatedEvents(token: string) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    // Try multiple possible endpoint patterns to avoid routing conflicts
    const possibleEndpoints = [
      `${API_BASE}/event/user/self`,
      `${API_BASE}/user/created-events`,
      `${API_BASE}/event/user/created`,
      `${API_BASE}/events/user/created`,
      `${API_BASE}/event/created-by-user`,
    ];
    
    let lastError = null;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[fetchUserCreatedEvents] Trying endpoint: ${endpoint}`);
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: {
            token: token,
            'Content-Type': 'application/json',
          },
        });
        
        console.log(`[fetchUserCreatedEvents] Response status: ${res.status} for ${endpoint}`);
        
        if (res.ok) {
          const response = await res.json();
          const events = response.body || response;
          
          console.log(`[fetchUserCreatedEvents] Response data type:`, typeof events, `Length:`, Array.isArray(events) ? events.length : 'N/A');
          
          // Validate response structure
          if (Array.isArray(events)) {
            console.log(`[fetchUserCreatedEvents] ✅ Success with endpoint: ${endpoint} - Found ${events.length} events`);
            return events;
          } else {
            console.warn(`[fetchUserCreatedEvents] ❌ Invalid response structure from ${endpoint}:`, events);
          }
        }
        
        // Store the last error for reporting
        if (res.status !== 404) {
          const errorText = await res.text();
          console.log(`[fetchUserCreatedEvents] Error from ${endpoint}: ${res.status} - ${errorText?.substring(0, 100)}`);
          lastError = new Error(`${endpoint}: ${res.status} - ${errorText}`);
        } else {
          console.log(`[fetchUserCreatedEvents] Endpoint not found (404): ${endpoint}`);
        }
      } catch (err) {
        console.error(`[fetchUserCreatedEvents] Exception for ${endpoint}:`, err);
        lastError = err;
        continue; // Try next endpoint
      }
    }
    
    // If all endpoints fail, throw an error to trigger fallback
    console.warn('All user created events endpoints failed, will use fallback');
    throw lastError || new Error('No valid endpoint found for user created events');
    
  } catch (error) {
    console.error('Error fetching user created events:', error);
    // Throw error to trigger fallback in the hook
    throw error;
  }
}

export async function deleteEvent(token: string, eventId: string) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    const res = await fetch(`${API_BASE}/event/${eventId}`, {
      method: 'DELETE',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to delete event: ${res.status} - ${errorText}`);
    }
    
    const data = await res.json();
    return data.body || data;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

export async function fetchEventAttendees(token: string, eventId: string) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }
    
    if (!eventId) {
      throw new Error('Event ID is required');
    }
    
    console.log(`[fetchEventAttendees] Calling API for eventId: ${eventId}`);
    const url = `${API_BASE}/event/attendees/${eventId}`;
    console.log(`[fetchEventAttendees] URL: ${url}`);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`[fetchEventAttendees] Response status: ${res.status}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log(`[fetchEventAttendees] Error response: ${errorText}`);
      throw new Error(`Failed to fetch event attendees: ${res.status} - ${errorText}`);
    }
    
    const response = await res.json();
    console.log(`[fetchEventAttendees] Raw response:`, response);
    
    // Handle different response formats: {data: [...], success: true} or {body: [...]} or [...]
    const attendees = response.data || response.body || response;
    console.log(`[fetchEventAttendees] Processed attendees:`, attendees);
    console.log(`[fetchEventAttendees] Attendees count:`, Array.isArray(attendees) ? attendees.length : 'Not an array');
    
    // Validate response structure
    if (!Array.isArray(attendees)) {
      console.warn('Event attendees API returned non-array data:', attendees);
      return [];
    }
    
    return attendees;
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    throw error;
  }
}

export async function downloadTicket(
  token: string,
  eventId: string,
  attendeeEmail: string,
  onProgress?: (progress: number) => void
) {
  const url = `${API_BASE}/event/ticket/${eventId}/${encodeURIComponent(attendeeEmail)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token, // Ensure this header name matches what your API expects (e.g., 'Authorization', 'x-access-token')
        'Accept': 'application/pdf', // Explicitly tell the server you expect PDF
      },
      // You might need to add a cache control header if the server is aggressive with caching
      // cache: 'no-store',
    });


    if (!response.ok) {
      const errorText = await response.text(); // Get raw error text for more info
      throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorText.substring(0, 200)}...`);
    }

    // Attempt to clone the response before converting to blob
    // This allows you to read it as text for debugging if blob fails
    const clonedResponse = response.clone();

    // Directly convert to blob
    const blob = await response.blob();


    if (blob.size === 0) {
      // Try to read as text if blob is empty, might reveal server message
      const textFromClonedResponse = await clonedResponse.text();
      // You might want to throw an error here or return null and handle it upstream
      throw new Error('Downloaded ticket data is empty (0 bytes).');
    }

    // Report completion
    if (onProgress) {
      onProgress(100);
    }

    return blob;
  } catch (error) {
    // Rethrow to be handled by handleDownloadTicket's catch block
    throw error;
  }
}
