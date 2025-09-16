import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Heart,
  Share,
  Bookmark,
  ExternalLink,
  IndianRupee,
  Globe,
  CreditCard,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useCommunityStore } from '@/store/community-store';
import { useAuthStore } from '@/store/auth-store';
import { fetchCommunityEvents } from '@/api/event';
import type { Event } from '@/types';

interface CommunityEventsTabProps {
  communityId: string;
  community: any;
}

const CommunityEventsTab: React.FC<CommunityEventsTabProps> = ({
  communityId,
  community,
}) => {
  const router = useRouter();
  const { canCreateEvent } = useCommunityStore();
  const { user, token } = useAuthStore();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canUserCreateEvent = user ? canCreateEvent(communityId, user.id) : false;
  const isUserOwner = user && (user.id === community?.owner || user.id === community?.createdBy);

  const loadEvents = async () => {
    if (!token) return;
    
    try {
      const communityEvents = await fetchCommunityEvents(token, communityId);
      setEvents(communityEvents);
    } catch (error) {
      console.error('Failed to load community events:', error);
      // Don't show error to user, just log it
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    loadEvents();
  }, [communityId, token]);
  
  // Refresh events when screen comes back into focus (e.g., after creating an event)
  useFocusEffect(
    React.useCallback(() => {
      if (token && communityId) {
        loadEvents();
      }
    }, [communityId, token])
  );

  const handleCreateEvent = () => {
    // Navigate to event creation with community context
    router.push({
      pathname: '/event/create',
      params: {
        communityId: communityId,
        communityName: community?.name || '',
      }
    });
  };

  const handleEventPress = (eventId: string) => {
    router.push(`/event/${eventId}`);
  };

  const handleViewAttendees = (eventId: string, eventTitle: string) => {
    // Navigate to attendees screen with event details
    router.push({
      pathname: `/event/${eventId}/attendees`,
      params: {
        eventTitle: eventTitle,
        communityName: community?.name || '',
      }
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatEventTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isEventPast = (dateString: string, timeString: string) => {
    const eventDate = new Date(`${dateString}T${timeString}`);
    return eventDate < new Date();
  };

  const renderEventItem = ({ item }: { item: Event }) => {
    const isPast = isEventPast(item.date, item.time);

    return (
      <TouchableOpacity
        style={[styles.eventCard, isPast && styles.pastEventCard]}
        onPress={() => handleEventPress(item.id)}
        activeOpacity={0.7}
      >
        {item.banner && (
          <Image source={{ uri: item.banner }} style={styles.eventBanner} />
        )}
        
        <View style={styles.eventContent}>
          <View style={styles.eventHeader}>
            <Text style={[styles.eventTitle, isPast && styles.pastEventTitle]}>
              {item.title}
            </Text>
            {item.isPaid && (
              <Badge
                text={`₹${item.ticketTypes[0]?.price || 'Paid'}`}
                variant="primary"
                style={styles.priceBadge}
              />
            )}
          </View>

          <Text
            style={[styles.eventDescription, isPast && styles.pastEventText]}
            numberOfLines={2}
          >
            {item.description}
          </Text>

          <View style={styles.eventDetails}>
            <View style={styles.eventDetailRow}>
              <Calendar size={16} color={isPast ? Colors.dark.subtext : Colors.dark.primary} />
              <Text style={[styles.eventDetailText, isPast && styles.pastEventText]}>
                {formatEventDate(item.date)}
              </Text>
            </View>

            <View style={styles.eventDetailRow}>
              <Clock size={16} color={isPast ? Colors.dark.subtext : Colors.dark.primary} />
              <Text style={[styles.eventDetailText, isPast && styles.pastEventText]}>
                {formatEventTime(item.time)}
              </Text>
            </View>

            <View style={styles.eventDetailRow}>
              {item.isOnline ? (
                <Globe size={16} color={isPast ? Colors.dark.subtext : Colors.dark.primary} />
              ) : (
                <MapPin size={16} color={isPast ? Colors.dark.subtext : Colors.dark.primary} />
              )}
              <Text
                style={[styles.eventDetailText, isPast && styles.pastEventText]}
                numberOfLines={1}
              >
                {item.isOnline ? 'Online Event' : item.location}
              </Text>
            </View>

            <View style={styles.eventDetailRow}>
              <Users size={16} color={isPast ? Colors.dark.subtext : Colors.dark.primary} />
              <Text style={[styles.eventDetailText, isPast && styles.pastEventText]}>
                {item.attendees?.length || 0} attendees
              </Text>
            </View>
          </View>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <Text style={styles.moreTags}>+{item.tags.length - 3}</Text>
              )}
            </View>
          )}

          <View style={styles.eventActions}>
            {isPast ? (
              <Text style={styles.pastEventLabel}>Event has ended</Text>
            ) : (
              <View style={styles.actionButtonsRow}>
                <Button
                  title={item.isPaid ? 'Buy Ticket' : 'Register'}
                  onPress={() => handleEventPress(item.id)}
                  size="small"
                  leftIcon={
                    item.isPaid ? (
                      <CreditCard size={16} color="#fff" />
                    ) : (
                      <Calendar size={16} color="#fff" />
                    )
                  }
                  style={isUserOwner ? styles.primaryActionButton : styles.fullWidthButton}
                />
                {isUserOwner && (
                  <Button
                    title="View Attendees"
                    onPress={(e) => {
                      e.stopPropagation(); // Prevent event card press
                      handleViewAttendees(item.id, item.title);
                    }}
                    size="small"
                    variant="secondary"
                    leftIcon={<Users size={16} color={Colors.dark.primary} />}
                    style={styles.viewAttendeesButton}
                  />
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEventsHeader = () => (
    <View style={styles.eventsHeader}>
      <View style={styles.headerRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Community Events</Text>
          <Text style={styles.headerSubtitle}>
            {events.length} event{events.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          {canUserCreateEvent && !isUserOwner && (
            <Button
              title="Create Event"
              onPress={handleCreateEvent}
              size="small"
              variant="secondary"
              leftIcon={<Plus size={16} color={Colors.dark.primary} />}
              style={styles.headerCreateButton}
            />
          )}
          {isUserOwner && (
            <Button
              title="Owner: New Event"
              onPress={handleCreateEvent}
              size="small"
              leftIcon={<Plus size={16} color="#fff" />}
              style={styles.ownerCreateButton}
            />
          )}
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Calendar size={48} color={Colors.dark.subtext} />
      <Text style={styles.emptyTitle}>No events yet</Text>
      <Text style={styles.emptyText}>
        {canUserCreateEvent
          ? `${community?.name} hasn't organized any events yet. Be the first to create one!`
          : `${community?.name} hasn't organized any events yet. Check back later!`}
      </Text>
      {canUserCreateEvent && (
        <Button
          title="Create First Event"
          onPress={handleCreateEvent}
          style={styles.createEventButton}
          leftIcon={<Plus size={18} color="#fff" />}
        />
      )}
    </View>
  );

  if (loading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {canUserCreateEvent && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateEvent}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEventItem}
        ListHeaderComponent={events.length > 0 ? renderEventsHeader : null}
        contentContainerStyle={[
          styles.listContent,
          events.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Space for FAB
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  createEventButton: {
    marginTop: 8,
  },
  eventsHeader: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCreateButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  ownerCreateButton: {
    backgroundColor: Colors.dark.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  eventCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pastEventCard: {
    opacity: 0.7,
  },
  eventBanner: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  pastEventTitle: {
    color: Colors.dark.subtext,
  },
  priceBadge: {
    alignSelf: 'flex-start',
  },
  eventDescription: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  pastEventText: {
    color: Colors.dark.subtext,
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventDetailText: {
    color: Colors.dark.text,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: `${Colors.dark.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  tagText: {
    color: Colors.dark.primary,
    fontSize: 12,
  },
  moreTags: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginLeft: 4,
  },
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  primaryActionButton: {
    flex: 1,
  },
  fullWidthButton: {
    flex: 1,
  },
  viewAttendeesButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  pastEventLabel: {
    color: Colors.dark.subtext,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default CommunityEventsTab;
