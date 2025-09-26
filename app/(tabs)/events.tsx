// app/(tabs)/events.tsx

import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  FlatList, 
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Animated,
  Dimensions,
  Modal,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  QrCode,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Search,
  Filter,
  Plus,
  ArrowUp,
  X,
  Check,
  MoreVertical,
  Trash2,
  Edit3
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import EventCard from '@/components/events/EventCard';
import TabBar from '@/components/ui/TabBar';
import { useAuthStore } from '@/store/auth-store';
import { safeDateString } from '@/utils/safeStringUtils';
import { useEvents, useUserBookedEvents, useUserCreatedEvents } from '@/hooks/useApiQueries';
import { deleteEvent } from '@/api/event';
import { Event } from '@/types';
import Colors from '@/constants/colors';
import Button from '@/components/ui/Button';
import AppHeader from '@/components/layout/AppHeader';

// Safe date extraction utility for ISO strings
const extractDateFromISO = (isoString: string): string => {
  const tIndex = isoString.indexOf('T');
  return tIndex > -1 ? isoString.substring(0, tIndex) : isoString;
};

// Get local date string in YYYY-MM-DD format (avoids timezone issues)
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const { width, height } = Dimensions.get('window');

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('events');
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  // Filter state - needs to be declared before React Query hooks
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    isPaid: 'all',
    isOnline: 'all',
    dateRange: 'all'
  });

  // Add selectedDate state for the horizontal date filter
  const [selectedDate, setSelectedDate] = useState('all');
  
  // Date filter state
  const [dateOptions, setDateOptions] = useState<{id: string, label: string, date?: Date}[]>([]);
  
  // Event actions modal state
  const [showEventActionsModal, setShowEventActionsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // React Query hooks for data fetching
  const { 
    data: events = [], 
    isLoading: eventsLoading, 
    error: eventsError, 
    refetch: refetchEvents 
  } = useEvents(filters);
  
  const { 
    data: userBookedEvents = [], 
    isLoading: userBookedEventsLoading, 
    error: userBookedEventsError,
    refetch: refetchUserBookedEvents 
  } = useUserBookedEvents();
  
  const { 
    data: userCreatedEvents = [], 
    isLoading: userCreatedEventsLoading, 
    error: userCreatedEventsError,
    refetch: refetchUserCreatedEvents 
  } = useUserCreatedEvents();
  
  // Combined loading state
  const isLoading = eventsLoading || userBookedEventsLoading || userCreatedEventsLoading;

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Remove the useEffect for loadData since React Query handles this automatically

  // Handle tab switching from booking success
  useEffect(() => {
    if (params.switchToTickets === 'true') {
      setActiveTab('tickets');
    }
  }, [params.switchToTickets]);

  useEffect(() => {
    if (events && events.length > 0) {
      generateDateOptions();
    }
  }, [events]);

  // React Query automatically refetches when filters change due to query key dependency

  const generateDateOptions = () => {
    try {
      const options: {id: string, label: string, date?: Date}[] = [
        { id: 'all', label: 'All' }
      ];
      
      const today = new Date();
      
      // Validate today's date
      if (isNaN(today.getTime())) {
        console.error('Invalid today date');
        setDateOptions([{ id: 'all', label: 'All' }]);
        return;
      }
      
      // Create tomorrow using a safer method
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      options.push(
        { id: 'today', label: 'Today', date: today },
        { id: 'tomorrow', label: 'Tomorrow', date: tomorrow }
      );
      
      // Add next 5 days using safer date arithmetic
      for (let i = 2; i <= 6; i++) {
        try {
          // Use milliseconds addition instead of setDate to avoid month overflow issues
          const futureTime = today.getTime() + (i * 24 * 60 * 60 * 1000);
          const date = new Date(futureTime);
          
          // Validate the created date
          if (isNaN(date.getTime())) {
            console.warn(`Invalid future date for day +${i}`);
            continue;
          }
          
          const dateId = safeDateString(date.toISOString());
          let label;
          try {
            label = date.toLocaleDateString('en-US', { 
              day: 'numeric',
              month: 'short'
            });
          } catch (error) {
            console.error('Error formatting date label:', error);
            label = `Day +${i}`;
          }
          
          options.push({ id: dateId, label, date });
        } catch (error) {
          console.error(`Error creating date option for day +${i}:`, error);
        }
      }
      
      setDateOptions(options);
    } catch (error) {
      console.error('Error generating date options:', error);
      // Fallback to just 'All' option
      setDateOptions([{ id: 'all', label: 'All' }]);
    }
  };

  // loadData function removed - React Query handles this automatically

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refetchEvents(),
        refetchUserBookedEvents(),
        refetchUserCreatedEvents()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEventPress = (event: Event) => {
    router.push(`/event/${event.id}`);
  };

  const handleViewTicket = (event: Event) => {
    // Find the user's ticket for this event
    if (user && event.attendees) {
      const ticket = event.attendees.find(attendee => attendee.email === user.email);
      if (ticket) {
        router.push(`/event/ticket/${event.id}`);
      }
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Invalid Date';
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid Date';
      }
      
      // Check for reasonable date bounds (not before 1900 or after 2200)
      const year = date.getFullYear();
      if (year < 1900 || year > 2200) {
        console.warn('Date out of reasonable bounds:', dateString, 'Year:', year);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };
  
  const formatTime = (timeString: string) => {
    try {
      if (!timeString) return 'Invalid Time';
      
      // Parse the time string (expected format: "HH:MM")
      const [hours, minutes] = timeString.split(':');
      const hour24 = parseInt(hours);
      const minute = parseInt(minutes);
      
      // Validate parsed values
      if (isNaN(hour24) || isNaN(minute) || hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) {
        console.warn('Invalid time string in events:', timeString);
        return timeString; // Return original if invalid
      }
      
      // Convert to 12-hour format
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      const minuteStr = minute.toString().padStart(2, '0');
      
      return `${hour12}:${minuteStr} ${period}`;
    } catch (error) {
      console.error('Error formatting time in events:', timeString, error);
      return timeString; // Return original if error
    }
  };
  
  const handleCreateEvent = () => {
    router.push('/event/create');
  };
  
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = (event.nativeEvent as any).contentOffset.y;
        setShowScrollToTop(offsetY > height * 0.5);
      }
    }
  );
  
  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };
  
  // Filter functions
  const handleFilterPress = () => {
    setShowFilterModal(true);
  };
  
  const applyFilters = async () => {
    setShowFilterModal(false);
    // React Query will automatically refetch with new filters
  };
  
  const resetFilters = () => {
    setFilters({
      category: 'all',
      isPaid: 'all',
      isOnline: 'all',
      dateRange: 'all'
    });
    
    // Reset selected date
    setSelectedDate('all');
    
    setShowFilterModal(false);
    // React Query will automatically refetch with reset filters
  };
  
  // Update handleDateSelect to update selectedDate, update filters, and call fetchEvents
  const handleDateSelect = (dateId: string) => {
    setSelectedDate(dateId);
    setFilters(prev => ({ ...prev, dateRange: dateId }));
  };
  
  // Function to filter events by selected date
  const getFilteredEvents = () => {
    if (!events) return [];
    
    // Get current date in local timezone, normalized to start of day
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log('Debug - Current date info:', {
      now: now.toISOString(),
      nowLocal: now.toDateString(),
      today: today.toISOString(),
      todayLocal: today.toDateString(),
      todayTime: today.getTime(),
      selectedDate,
      totalEvents: events.length
    });
    
    // If 'all' is selected, show only current and future events (exclude past events)
    if (selectedDate === 'all') {
      const currentAndFutureEvents = events.filter(event => {
        try {
          if (!event.date) {
            console.warn('Event has no date:', event.title);
            return false;
          }
          
          // Parse event date and validate
          const eventDate = new Date(event.date);
          
          if (isNaN(eventDate.getTime())) {
            console.warn('Invalid event date:', event.date, 'for event:', event.title);
            return false;
          }
          
          // Check for reasonable date bounds
          const eventYear = eventDate.getFullYear();
          if (eventYear < 1900 || eventYear > 2200) {
            console.warn('Event date out of bounds:', event.date, 'Year:', eventYear, 'for event:', event.title);
            return false;
          }
          
          // Only include current and future events (exclude past events)
          const eventDateString = getLocalDateString(eventDate); // YYYY-MM-DD in local timezone
          const todayString = getLocalDateString(now); // YYYY-MM-DD in local timezone
          
          return eventDateString >= todayString; // Only current and future events
        } catch (error) {
          console.error('Error processing event date:', event.title, error);
          return false;
        }
      });
      
      console.log('Debug - Current and future events when "all" selected:', currentAndFutureEvents.length);
      return currentAndFutureEvents;
    }
    
    // For specific date selections, filter for upcoming events only
    const upcomingEvents = events.filter(event => {
      try {
        if (!event.date) {
          console.warn('Event has no date:', event.title);
          return false;
        }
        
        // Parse event date and validate
        const eventDate = new Date(event.date);
        
        if (isNaN(eventDate.getTime())) {
          console.warn('Invalid event date:', event.date, 'for event:', event.title);
          return false;
        }
        
        // Check for reasonable date bounds
        const eventYear = eventDate.getFullYear();
        if (eventYear < 1900 || eventYear > 2200) {
          console.warn('Event date out of bounds:', event.date, 'Year:', eventYear, 'for event:', event.title);
          return false;
        }
        
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        // Use local date string comparison to avoid timezone issues
        const eventDateString = getLocalDateString(eventDate); // YYYY-MM-DD in local timezone
        const todayString = getLocalDateString(now); // YYYY-MM-DD in local timezone
        
        console.log('Debug - Event date check:', {
          eventTitle: event.title,
          eventDate: event.date,
          eventDateParsed: eventDate.toISOString(),
          eventDateString,
          todayString,
          eventDateOnly: eventDateOnly.toISOString(),
          eventTime: eventDateOnly.getTime(),
          todayTime: today.getTime(),
          isUpcoming: eventDateString >= todayString,
          isUpcomingByTime: eventDateOnly.getTime() >= today.getTime()
        });
        
        // Use local date string comparison for reliable timezone-independent results
        return eventDateString >= todayString;
      } catch (error) {
        console.error('Error processing event date:', event.title, error);
        return false;
      }
    });
    
    console.log('Debug - Upcoming events count:', upcomingEvents.length);
    
    // Filter by specific date
    const filteredEvents = upcomingEvents.filter(event => {
      try {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        
        // Validate date
        if (isNaN(eventDate.getTime())) {
          console.warn('Invalid event date in filter:', event.date);
          return false;
        }
        
        const eventDateString = getLocalDateString(eventDate); // YYYY-MM-DD in local timezone
        const todayString = getLocalDateString(now); // YYYY-MM-DD in local timezone
        
        switch (selectedDate) {
          case 'today':
            const isToday = eventDateString === todayString;
            console.log('Debug - Today check:', {
              eventTitle: event.title,
              eventDate: event.date,
              eventDateString,
              todayString,
              isToday
            });
            return isToday;
          case 'tomorrow':
            // Use safer date arithmetic in local timezone
            const tomorrowTime = now.getTime() + (24 * 60 * 60 * 1000);
            const tomorrow = new Date(tomorrowTime);
            const tomorrowString = getLocalDateString(tomorrow);
            return eventDateString === tomorrowString;
          default:
            // For specific date strings like '2024-01-15'
            if (selectedDate.includes('-')) {
              return eventDateString === selectedDate;
            }
            return true;
        }
      } catch (error) {
        console.error('Error in event filter:', event.title, error);
        return false;
      }
    });
    
    console.log('Debug - Final filtered events for', selectedDate, ':', filteredEvents.length);
    return filteredEvents;
  };
  
  // Function to get count of events for each date option
  const getEventCountForDate = (dateId: string) => {
    if (!events) return 0;
    
    const now = new Date();
    const todayString = getLocalDateString(now); // YYYY-MM-DD in local timezone
    
    // If 'all' is selected, count only current and future events (exclude past events)
    if (dateId === 'all') {
      const currentAndFutureEvents = events.filter(event => {
        try {
          if (!event.date) return false;
          const eventDate = new Date(event.date);
          
          // Validate date
          if (isNaN(eventDate.getTime())) {
            return false;
          }
          
          // Check bounds
          const eventYear = eventDate.getFullYear();
          if (eventYear < 1900 || eventYear > 2200) {
            return false;
          }
          
          // Only include current and future events (exclude past events)
          const eventDateString = getLocalDateString(eventDate);
          return eventDateString >= todayString;
        } catch (error) {
          return false;
        }
      });
      
      return currentAndFutureEvents.length;
    }
    
    // For specific date selections, filter for upcoming events only
    const upcomingEvents = events.filter(event => {
      try {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        
        // Validate date
        if (isNaN(eventDate.getTime())) {
          console.warn('Invalid event date in count:', event.date);
          return false;
        }
        
        // Check bounds
        const eventYear = eventDate.getFullYear();
        if (eventYear < 1900 || eventYear > 2200) {
          console.warn('Event date out of bounds in count:', event.date);
          return false;
        }
        
        const eventDateString = getLocalDateString(eventDate);
        return eventDateString >= todayString;
      } catch (error) {
        console.error('Error processing event date in count:', event.title, error);
        return false;
      }
    });
    
    const count = upcomingEvents.filter(event => {
      try {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        
        // Validate date
        if (isNaN(eventDate.getTime())) {
          return false;
        }
        
        const eventDateString = getLocalDateString(eventDate);
        
        switch (dateId) {
          case 'today':
            return eventDateString === todayString;
          case 'tomorrow':
            // Use safer date arithmetic in local timezone
            const tomorrowTime = now.getTime() + (24 * 60 * 60 * 1000);
            const tomorrow = new Date(tomorrowTime);
            const tomorrowString = getLocalDateString(tomorrow);
            return eventDateString === tomorrowString;
          default:
            if (dateId.includes('-')) {
              return eventDateString === dateId;
            }
            return true;
        }
      } catch (error) {
        console.error('Error in count filter:', error);
        return false;
      }
    }).length;
    
    return count;
  };
  
  // Get filtered events based on selected date
  const filteredEvents = getFilteredEvents();
  
  console.log('Events Screen Debug:', {
    eventsLoading,
    eventsError: eventsError?.message,
    totalEvents: events?.length || 0,
    filteredEventsCount: filteredEvents?.length || 0,
    selectedDate,
    eventsList: events?.map(e => ({ id: e.id, title: e.title, date: e.date })) || []
  });

  const handleCategorySelect = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
  };

  // Event action handlers
  const handleEventActions = (event: Event) => {
    setSelectedEvent(event);
    setShowEventActionsModal(true);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${selectedEvent.title}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { token } = useAuthStore.getState();
              if (!token) {
                throw new Error('Authentication required');
              }
              
              // Use the correct event ID property
              const eventId = selectedEvent._id || selectedEvent.id;
              if (!eventId) {
                throw new Error('Event ID not found');
              }
              
              await deleteEvent(token, eventId);
              Alert.alert('Success', 'Event deleted successfully');
              refetchUserCreatedEvents();
            } catch (error) {
              console.error('Delete event error:', error);
              Alert.alert('Error', 'Failed to delete event. Please try again.');
            } finally {
              setShowEventActionsModal(false);
              setSelectedEvent(null);
            }
          },
        },
      ]
    );
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 'events':
        return (
          <Animated.ScrollView 
            ref={scrollViewRef}
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.dark.tint}
                colors={[Colors.dark.tint]}
              />
            }
          >
            {/* Search and Filter Bar */}
            <View style={styles.searchFilterContainer}>
              <TouchableOpacity 
                style={styles.searchBar}
                onPress={() => router.push('/search')}
              >
                <Search size={18} color={Colors.dark.subtext} />
                <Text style={styles.searchPlaceholder}>Search events...</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.filterButton}
                onPress={handleFilterPress}
              >
                <Filter size={18} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
            
            {/* Horizontal Date Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.dateFilterContainer}
              contentContainerStyle={styles.dateFilterContent}
            >
              {dateOptions.map((option) => {
                const eventCount = getEventCountForDate(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.dateFilterButton,
                      selectedDate === option.id && styles.dateFilterButtonSelected
                    ]}
                    onPress={() => handleDateSelect(option.id)}
                  >
                    <View style={styles.dateFilterContent}>
                      <Text style={[
                        styles.dateFilterText,
                        selectedDate === option.id && styles.dateFilterTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {eventCount > 0 && (
                        <View style={[
                          styles.eventCountBadge,
                          selectedDate === option.id && styles.eventCountBadgeSelected
                        ]}>
                          <Text style={[
                            styles.eventCountText,
                            selectedDate === option.id && styles.eventCountTextSelected
                          ]}>
                            {eventCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            
            
            {/* Selected Date Header */}
            {selectedDate !== 'all' && (
              <View style={styles.selectedDateHeader}>
                <Text style={styles.selectedDateTitle}>
                  Events for {dateOptions.find(opt => opt.id === selectedDate)?.label}
                </Text>
                <Text style={styles.selectedDateCount}>
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
                </Text>
              </View>
            )}
            
            {/* Events List - Optimized with FlatList */}
            <FlatList
              data={filteredEvents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <EventCard 
                  event={item} 
                  onPress={() => handleEventPress(item)} 
                />
              )}
              removeClippedSubviews={true}
              maxToRenderPerBatch={5}
              windowSize={10}
              initialNumToRender={3}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </Animated.ScrollView>
        );
      
      case 'tickets':
        return (
          <ScrollView 
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.dark.tint}
                colors={[Colors.dark.tint]}
              />
            }
          >
            <Text style={styles.sectionTitle}>My Tickets</Text>
            {userBookedEvents && userBookedEvents.length > 0 ? (
              userBookedEvents.map((event: Event) => (
                <TouchableOpacity 
                  key={event._id} 
                  style={styles.ticketCard}
                  onPress={() => handleViewTicket(event)}
                >
                  {event.banner && (
                    <Image 
                      source={{ uri: event.banner }} 
                      style={styles.ticketBanner}
                      resizeMode="cover"
                    />
                  )}
                  
                  <View style={styles.ticketContent}>
                    <View style={styles.ticketHeader}>
                      <Text style={styles.ticketEventName}>{event.title}</Text>
                      <View style={styles.ticketBadge}>
                        <Text style={styles.ticketBadgeText}>
                          {event.isPaid ? 'Paid' : 'Free'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.ticketDetails}>
                      <View style={styles.ticketDetailItem}>
                        <Calendar size={16} color={Colors.dark.subtext} />
                        <Text style={styles.ticketDetailText}>
                          {formatDate(event.date)}
                        </Text>
                      </View>
                      
                      <View style={styles.ticketDetailItem}>
                        <Clock size={16} color={Colors.dark.subtext} />
                        <Text style={styles.ticketDetailText}>
                          {formatTime(event.time)}
                        </Text>
                      </View>
                      
                      <View style={styles.ticketDetailItem}>
                        <MapPin size={16} color={Colors.dark.subtext} />
                        <Text style={styles.ticketDetailText}>
                          {event.isOnline ? 'Online Event' : event.location}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.ticketFooter}>
                      <View style={styles.qrPreview}>
                        <QrCode size={32} color={Colors.dark.text} />
                      </View>
                      <View style={styles.viewTicketButton}>
                        <Text style={styles.viewTicketText}>View Ticket</Text>
                        <ChevronRight size={16} color={Colors.dark.primary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>You haven't booked any events yet</Text>
                <Button 
                  title="Explore Events" 
                  onPress={() => setActiveTab('events')}
                  style={styles.exploreButton}
                />
              </View>
            )}
          </ScrollView>
        );
        
      case 'myEvents':
        return (
          <ScrollView 
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.dark.tint}
                colors={[Colors.dark.tint]}
              />
            }
          >
            <Text style={styles.sectionTitle}>My Events</Text>
            {userCreatedEvents && userCreatedEvents.length > 0 ? (
              <FlatList
                data={userCreatedEvents}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.myEventCard}
                    onPress={() => handleEventPress(item)}
                  >
                    {item.banner && (
                      <Image 
                        source={{ uri: item.banner }} 
                        style={styles.myEventBanner}
                        resizeMode="cover"
                      />
                    )}
                    
                    <View style={styles.myEventContent}>
                      <View style={styles.myEventHeader}>
                        <Text style={styles.myEventTitle}>{item.title}</Text>
                        <View style={styles.myEventHeaderRight}>
                          <View style={[styles.myEventStatusBadge, 
                            { backgroundColor: (() => {
                              try {
                                if (!item.date) return Colors.dark.subtext + '20';
                                const eventDate = new Date(item.date);
                                if (isNaN(eventDate.getTime())) return Colors.dark.subtext + '20';
                                return eventDate > new Date() ? Colors.dark.success + '20' : Colors.dark.subtext + '20';
                              } catch {
                                return Colors.dark.subtext + '20';
                              }
                            })()
                            }
                          ]}>
                            <Text style={[styles.myEventStatusText,
                              { color: (() => {
                                try {
                                  if (!item.date) return Colors.dark.subtext;
                                  const eventDate = new Date(item.date);
                                  if (isNaN(eventDate.getTime())) return Colors.dark.subtext;
                                  return eventDate > new Date() ? Colors.dark.success : Colors.dark.subtext;
                                } catch {
                                  return Colors.dark.subtext;
                                }
                              })()
                              }
                            ]}>
                              {(() => {
                                try {
                                  if (!item.date) return 'Unknown';
                                  const eventDate = new Date(item.date);
                                  if (isNaN(eventDate.getTime())) return 'Unknown';
                                  return eventDate > new Date() ? 'Upcoming' : 'Past';
                                } catch {
                                  return 'Unknown';
                                }
                              })()
                              }
                            </Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.eventActionsButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleEventActions(item);
                            }}
                          >
                            <MoreVertical size={20} color={Colors.dark.subtext} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.myEventDetails}>
                        <View style={styles.myEventDetailItem}>
                          <Calendar size={16} color={Colors.dark.subtext} />
                          <Text style={styles.myEventDetailText}>
                            {formatDate(item.date)}
                          </Text>
                        </View>
                        
                        <View style={styles.myEventDetailItem}>
                          <Clock size={16} color={Colors.dark.subtext} />
                          <Text style={styles.myEventDetailText}>
                            {formatTime(item.time)}
                          </Text>
                        </View>
                        
                        <View style={styles.myEventDetailItem}>
                          <MapPin size={16} color={Colors.dark.subtext} />
                          <Text style={styles.myEventDetailText}>
                            {item.isOnline ? 'Online Event' : item.location}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.myEventStats}>
                        <Text style={styles.myEventStatsText}>
                          {item.attendees.length} attendees • {item.isPaid ? 'Paid' : 'Free'} • {item.category}
                        </Text>
                      </View>
                      
                      <View style={styles.myEventFooter}>
                        <TouchableOpacity 
                          style={styles.manageEventButton}
                          onPress={() => router.push(`/event/${item.id}/attendees`)}
                        >
                          <Text style={styles.manageEventButtonText}>View Attendees</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.viewEventButton}>
                          <Text style={styles.viewEventButtonText}>View Details</Text>
                          <ChevronRight size={16} color={Colors.dark.primary} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>You haven't created any events yet</Text>
                <Button 
                  title="Create Your First Event" 
                  onPress={handleCreateEvent}
                  style={styles.exploreButton}
                />
              </View>
            )}
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      <AppHeader title="Events" />
      
      <TabBar
        tabs={[
          { id: 'events', label: 'Events' },
          { id: 'tickets', label: 'Tickets' },
          { id: 'myEvents', label: 'My Events' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {renderTabContent()}
      
      {(activeTab === 'events' || activeTab === 'myEvents') && (
        <TouchableOpacity 
          style={[styles.fab, { bottom: 100 + insets.bottom }]}
          onPress={handleCreateEvent}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}
      
      {showScrollToTop && (
        <TouchableOpacity 
          style={[styles.scrollToTopButton, { bottom: 170 + insets.bottom }]}
          onPress={scrollToTop}
        >
          <ArrowUp size={20} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Events</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <X size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
{/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <View style={styles.filterOptions}>
                  {['all', 'Workshop', 'Meetup', 'Pitch', 'Seminar', 'Hackathon', 'Webinar', 'Conference', 'Networking'].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterOption,
                        filters.category === category && styles.filterOptionSelected
                      ]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.category === category && styles.filterOptionTextSelected
                      ]}>
                        {category === 'all' ? 'All Categories' : category}
                      </Text>
                      {filters.category === category && (
                        <Check size={16} color={Colors.dark.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Paid/Free Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price</Text>
                <View style={styles.filterOptions}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'free', label: 'Free' },
                    { id: 'paid', label: 'Paid' }
                  ].map((option) => (
                    <TouchableOpacity 
                      key={option.id}
                      style={[
                        styles.filterOption,
                        filters.isPaid === option.id && styles.filterOptionSelected
                      ]}
                      onPress={() => setFilters({...filters, isPaid: option.id})}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.isPaid === option.id && styles.filterOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {filters.isPaid === option.id && (
                        <Check size={16} color={Colors.dark.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Online/Offline Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Location</Text>
                <View style={styles.filterOptions}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'online', label: 'Online' },
                    { id: 'offline', label: 'In-Person' }
                  ].map((option) => (
                    <TouchableOpacity 
                      key={option.id}
                      style={[
                        styles.filterOption,
                        filters.isOnline === option.id && styles.filterOptionSelected
                      ]}
                      onPress={() => setFilters({...filters, isOnline: option.id})}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.isOnline === option.id && styles.filterOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {filters.isOnline === option.id && (
                        <Check size={16} color={Colors.dark.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date</Text>
                <View style={styles.filterOptions}>
                  {[
                    { id: 'all', label: 'Any Time' },
                    { id: 'today', label: 'Today' },
                    { id: 'tomorrow', label: 'Tomorrow' },
                    { id: 'thisWeek', label: 'This Week' },
                    { id: 'thisMonth', label: 'This Month' }
                  ].map((option) => (
                    <TouchableOpacity 
                      key={option.id}
                      style={[
                        styles.filterOption,
                        filters.dateRange === option.id && styles.filterOptionSelected
                      ]}
                      onPress={() => setFilters({...filters, dateRange: option.id})}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filters.dateRange === option.id && styles.filterOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {filters.dateRange === option.id && (
                        <Check size={16} color={Colors.dark.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              
              <Button
                title="Apply Filters"
                onPress={applyFilters}
                style={styles.applyButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Event Actions Modal */}
      <Modal
        visible={showEventActionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEventActionsModal(false);
          setSelectedEvent(null);
        }}
      >
        <View style={styles.eventActionsOverlay}>
          <View style={styles.eventActionsContent}>
            <View style={styles.eventActionsHeader}>
              <Text style={styles.eventActionsTitle}>
                {selectedEvent?.title}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowEventActionsModal(false);
                  setSelectedEvent(null);
                }}
              >
                <X size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.eventActionsOptions}>
              <TouchableOpacity 
                style={[styles.eventActionOption, styles.deleteOption]}
                onPress={handleDeleteEvent}
              >
                <Trash2 size={20} color={Colors.dark.error} />
                <Text style={[styles.eventActionText, styles.deleteText]}>Delete Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  tabContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginRight: 10,
  },
  searchPlaceholder: {
    color: Colors.dark.subtext,
    marginLeft: 8,
  },
  filterButton: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
  },
  featuredSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  seeAllText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  createEventButton: {
    marginLeft: 16,
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createEventText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  horizontalScroll: {
    marginBottom: 24,
  },
  horizontalScrollContent: {
    paddingRight: 16,
  },
  horizontalEventCard: {
    width: 280,
    marginRight: 12,
  },
  featuredEventCard: {
    width: width * 0.8,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    position: 'relative',
  },
  featuredEventImage: {
    width: '100%',
    height: '100%',
  },
  featuredEventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  featuredEventContent: {
    
  },
  featuredEventTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featuredEventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featuredEventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  featuredEventDetailText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginLeft: 4,
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.dark.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  priceBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  freeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.dark.success,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  freeBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyStateContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    color: Colors.dark.subtext,
    textAlign: 'center',
    marginBottom: 16,
  },
  exploreButton: {
    width: '80%',
  },
  // Date filter styles
  dateFilterContainer: {
    marginBottom: 20,
  },
  dateFilterContent: {
    paddingRight: 16,
  },
  dateFilterButton: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  dateFilterButtonSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  dateFilterText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  dateFilterTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  dateFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventCountBadge: {
    backgroundColor: Colors.dark.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
  },
  eventCountBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  eventCountText: {
    color: Colors.dark.subtext,
    fontSize: 11,
    fontWeight: '600',
  },
  eventCountTextSelected: {
    color: '#fff',
  },
  selectedDateHeader: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.dark.primary,
  },
  selectedDateTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedDateCount: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  // Category filter styles
  categoryFilterContainer: {
    marginBottom: 20,
  },
  categoryFilterContent: {
    paddingRight: 16,
  },
  categoryFilterChip: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  categoryFilterChipSelected: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  categoryFilterText: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '500',
  },
  categoryFilterTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  createEventContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  ticketCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  ticketBanner: {
    width: '100%',
    height: 120,
  },
  ticketContent: {
    padding: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketEventName: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  ticketBadge: {
    backgroundColor: `${Colors.dark.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ticketBadgeText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  ticketDetails: {
    marginBottom: 16,
  },
  ticketDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketDetailText: {
    color: Colors.dark.text,
    fontSize: 14,
    marginLeft: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 12,
  },
  qrPreview: {
    backgroundColor: Colors.dark.cardBackground,
    padding: 8,
    borderRadius: 8,
  },
  viewTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewTicketText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scrollToTopButton: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
    maxHeight: height * 0.6,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'column',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.dark.card,
  },
  filterOptionSelected: {
    backgroundColor: `${Colors.dark.primary}20`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  filterOptionText: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  filterOptionTextSelected: {
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  resetButtonText: {
    color: Colors.dark.subtext,
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    marginLeft: 16,
  },
  // Category view styles
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
  categoryTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
  },
  // My Events tab styles
  myEventCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  myEventBanner: {
    width: '100%',
    height: 120,
  },
  myEventContent: {
    padding: 16,
  },
  myEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  myEventTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  myEventStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  myEventStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  myEventDetails: {
    marginBottom: 12,
  },
  myEventDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  myEventDetailText: {
    color: Colors.dark.text,
    fontSize: 14,
    marginLeft: 8,
  },
  myEventStats: {
    marginBottom: 16,
  },
  myEventStatsText: {
    color: Colors.dark.subtext,
    fontSize: 13,
  },
  myEventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 12,
  },
  manageEventButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  manageEventButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  viewEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewEventButtonText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  // Event actions styles
  myEventHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventActionsButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventActionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventActionsContent: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: 20,
    margin: 20,
    minWidth: 280,
    maxWidth: 320,
  },
  eventActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  eventActionsTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  eventActionsOptions: {
    gap: 12,
  },
  eventActionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
  },
  eventActionText: {
    color: Colors.dark.text,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  deleteOption: {
    backgroundColor: `${Colors.dark.error}10`,
  },
  deleteText: {
    color: Colors.dark.error,
  },
});
