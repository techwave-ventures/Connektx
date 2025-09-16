import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUser, followingUserStory } from '@/api/user';
import { 
  fetchEvents, 
  fetchEventById, 
  bookTicket, 
  fetchUserBookedEvents,
  fetchUserCreatedEvents,
  createEvent,
  createTicket,
  fetchEventAttendees
} from '@/api/event';
import { useAuthStore } from '@/store/auth-store';
import { Event, TicketType } from '@/types';

// Query Keys for consistent caching
export const QUERY_KEYS = {
  user: (token?: string) => ['user', token],
  posts: (tab: string) => ['posts', tab],
  stories: ['stories'],
  followingStories: (token?: string) => ['followingStories', token],
  events: (filters?: any) => ['events', filters],
  eventAttendees: (eventId?: string, token?: string) => ['eventAttendees', eventId, token],
  userBookedEvents: (token?: string) => ['userBookedEvents', token],
  userCreatedEvents: (token?: string) => ['userCreatedEvents', token],
  news: (category?: string) => ['news', category],
} as const;

/**
 * Hook to get current user data with caching
 */
export function useUserData() {
  const { token } = useAuthStore();
  
  return useQuery({
    queryKey: QUERY_KEYS.user(token),
    queryFn: () => getUser(token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    select: (data) => {
      // Handle both response formats
      if (data && data.success && data.body) {
        return data.body;
      } else if (data && data._id) {
        return data;
      } else {
        throw new Error('Invalid user response format');
      }
    }
  });
}

/**
 * Hook to get following stories with caching
 */
export function useFollowingStories() {
  const { token } = useAuthStore();
  
  return useQuery({
    queryKey: QUERY_KEYS.followingStories(token),
    queryFn: () => followingUserStory(token),
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes for fresh content
    cacheTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    select: (data) => {
      const rawStories = data || [];
      return rawStories.map((story: any) => ({
        id: story._id,
        url: story.url,
        type: story.type,
        viewed: false,
        totalStories: 1,
        createdAt: story.createdAt,
        user: {
          id: story.userId._id,
          name: story.userId.name,
          avatar: story.userId.profileImage || '',
          streak: story.userId.streak || 0,
        },
      }));
    }
  });
}

/**
 * Hook to get events with caching and filtering
 */
export function useEvents(filters?: any) {
  return useQuery({
    queryKey: QUERY_KEYS.events(filters),
    queryFn: () => fetchEvents(filters),
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 20 * 60 * 1000, // 20 minutes
    retry: 2,
    select: (data) => {
      // Normalize the events data structure
      return Array.isArray(data) ? data.map((event: any) => ({
        ...event,
        id: event._id || event.id,
        _id: event._id || event.id,
      })) : [];
    },
  });
}

/**
 * Hook to get a single event by ID
 */
export function useEvent(eventId: string) {
  const { token } = useAuthStore();
  
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEventById(token!, eventId),
    enabled: !!token && !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    select: (data) => {
      if (!data) return null;
      // Normalize the event data structure
      return {
        ...data,
        id: data._id || data.id,
        _id: data._id || data.id,
      };
    },
  });
}

/**
 * Hook to get event attendees list
 */
export function useEventAttendees(eventId: string) {
  const { token } = useAuthStore();
  
  console.log(`[useEventAttendees] Hook called with:`, {
    eventId,
    hasToken: !!token,
    enabled: !!token && !!eventId
  });
  
  return useQuery({
    queryKey: QUERY_KEYS.eventAttendees(eventId, token),
    queryFn: () => {
      console.log(`[useEventAttendees] queryFn executing for eventId: ${eventId}`);
      return fetchEventAttendees(token!, eventId);
    },
    enabled: !!token && !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    select: (data) => {
      console.log(`[useEventAttendees] select function called with:`, data);
      // Handle API response structure: data.data, data.body, or data directly
      const attendees = data?.data || data?.body || data || [];
      const result = Array.isArray(attendees) ? attendees.map((attendee: any) => ({
        ...attendee,
        id: attendee._id || attendee.id,
        _id: attendee._id || attendee.id,
      })) : [];
      console.log(`[useEventAttendees] select returning:`, result);
      return result;
    },
  });
}

/**
 * Hook to get user's booked events
 */
export function useUserBookedEvents() {
  const { token } = useAuthStore();
  
  return useQuery({
    queryKey: QUERY_KEYS.userBookedEvents(token),
    queryFn: () => fetchUserBookedEvents(token!),
    enabled: !!token,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    select: (data) => {
      // Handle API response structure
      const events = data?.body || data || [];
      return Array.isArray(events) ? events.map((event: any) => ({
        ...event,
        id: event._id || event.id,
        _id: event._id || event.id,
      })) : [];
    },
  });
}

/**
 * Hook to get user's created events
 * Falls back to client-side filtering if dedicated API endpoint doesn't exist
 */
export function useUserCreatedEvents() {
  const { token, user } = useAuthStore();
  const { data: allEvents, isLoading: eventsLoading } = useEvents(); // Get all events to filter client-side
  
  return useQuery({
    queryKey: [...QUERY_KEYS.userCreatedEvents(token), user?.id, allEvents?.length],
    queryFn: async () => {
      console.log('useUserCreatedEvents: Starting fetch with user:', {
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
        hasToken: !!token,
        allEventsCount: allEvents?.length
      });
      
      try {
        // Try the dedicated API endpoint first
        const response = await fetchUserCreatedEvents(token!);
        console.log('useUserCreatedEvents: API fetch successful, got', response?.length, 'events');
        return response;
      } catch (error: any) {
        console.log('useUserCreatedEvents: API fetch failed, using client-side filtering. Error:', error.message);
        
        // If API endpoint doesn't exist, filter all events client-side
        if (!user) {
          console.log('useUserCreatedEvents: No user data available for filtering');
          return [];
        }
        
        if (!allEvents || allEvents.length === 0) {
          console.log('useUserCreatedEvents: No events data available for filtering');
          return [];
        }
        
        // Filter events where current user is the creator
        const userCreatedEvents = allEvents.filter((event: any) => {
          // Log each event for debugging
          const isCreatedBy = event.createdBy === user.id || event.createdBy === user._id;
          const isOrganizer = event.organizerId === user.id || event.organizerId === user._id;
          const isOrganizerByName = event.organizer === user.name || event.organizer === user.email;
          
          const isMatch = isCreatedBy || isOrganizer || isOrganizerByName;
          
          if (isMatch) {
            console.log('useUserCreatedEvents: Found matching event:', {
              eventId: event.id || event._id,
              eventTitle: event.title,
              createdBy: event.createdBy,
              organizerId: event.organizerId,
              organizer: event.organizer,
              matchedBy: {
                createdBy: isCreatedBy,
                organizerId: isOrganizer,
                organizer: isOrganizerByName
              }
            });
          }
          
          return isMatch;
        });
        
        console.log(`useUserCreatedEvents: Client-side filtering complete. Found ${userCreatedEvents.length} events created by user:`, {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          totalEventsSearched: allEvents.length,
          foundEvents: userCreatedEvents.length
        });
        
        return userCreatedEvents;
      }
    },
    enabled: !!token && !!user, // Wait for both token and user data
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    retry: 1, // Reduce retries since we have a fallback
    select: (data) => {
      // Handle API response structure
      const events = data?.body || data || [];
      const normalizedEvents = Array.isArray(events) ? events.map((event: any) => ({
        ...event,
        id: event._id || event.id,
        _id: event._id || event.id,
      })) : [];
      
      console.log('useUserCreatedEvents: Final normalized events:', normalizedEvents.length);
      return normalizedEvents;
    },
  });
}

/**
 * Hook for booking tickets with optimistic updates
 */
export function useBookTicket() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  return useMutation({
    mutationFn: (params: {
      eventId: string;
      ticketTypeId: string;
      name: string;
      email: string;
      phone?: string;
    }) => {
      if (!token) throw new Error('Authentication required');
      return bookTicket(token, params.eventId, {
        ticketTypeId: params.ticketTypeId,
        name: params.name,
        email: params.email,
        phone: params.phone,
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userBookedEvents() });
    },
    onError: (error) => {
      console.error('Failed to book ticket:', error);
    },
  });
}

/**
 * Hook for creating events
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  return useMutation({
    mutationFn: (eventData: any) => {
      if (!token) throw new Error('Authentication required');
      return createEvent(token, eventData);
    },
    onSuccess: () => {
      // Invalidate events queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userCreatedEvents() });
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
    },
  });
}

/**
 * Hook for creating ticket types
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  return useMutation({
    mutationFn: (ticketData: { name: string; price: string; remTicket: number }) => {
      if (!token) throw new Error('Authentication required');
      return createTicket(token, ticketData);
    },
    onSuccess: () => {
      // Invalidate events queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.events() });
    },
    onError: (error) => {
      console.error('Failed to create ticket:', error);
    },
  });
}

/**
 * Hook for batched initial data loading
 * This replaces the sequential API calls in HomeScreen
 */
export function useInitialHomeData() {
  const { token } = useAuthStore();
  
  // Get user data
  const userQuery = useUserData();
  
  // Get following stories (only if user data is available)
  const storiesQuery = useFollowingStories();
  
  // Return combined loading state and data
  return {
    isLoading: userQuery.isLoading || storiesQuery.isLoading,
    isError: userQuery.isError || storiesQuery.isError,
    error: userQuery.error || storiesQuery.error,
    userData: userQuery.data,
    storiesData: storiesQuery.data,
    // Refetch all data
    refetchAll: async () => {
      await Promise.allSettled([
        userQuery.refetch(),
        storiesQuery.refetch(),
      ]);
    }
  };
}

/**
 * Hook to invalidate related cache when data changes
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateUser: () => queryClient.invalidateQueries({ queryKey: ['user'] }),
    invalidateStories: () => queryClient.invalidateQueries({ queryKey: ['stories'] }),
    invalidatePosts: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
    invalidateEvents: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}

/**
 * Prefetch data for better perceived performance
 */
export function usePrefetchQueries() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  
  return {
    prefetchUser: () => {
      if (token) {
        queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.user(token),
          queryFn: () => getUser(token),
          staleTime: 5 * 60 * 1000,
        });
      }
    },
    prefetchStories: () => {
      if (token) {
        queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.followingStories(token),
          queryFn: () => followingUserStory(token),
          staleTime: 2 * 60 * 1000,
        });
      }
    },
    prefetchEvents: () => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.events(),
        queryFn: () => fetchEvents(),
        staleTime: 3 * 60 * 1000,
      });
    }
  };
}

/**
 * Background refresh for keeping data fresh
 */
export function useBackgroundRefresh() {
  const queryClient = useQueryClient();
  
  return {
    refreshInBackground: () => {
      // Silently refetch stale data in background
      queryClient.refetchQueries({ 
        stale: true, 
        type: 'active' 
      });
    }
  };
}
