import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Share as ShareAPI
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Share, 
  MoreHorizontal,
  Globe,
  Edit3,
  Trash2,
  User
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { useCommunityStore } from '@/store/community-store';
import type { CommunityEvent } from '@/store/community-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function EventDetailScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const { 
    communities,
    joinCommunityEvent,
    leaveCommunityEvent,
    deleteCommunityEvent,
    loadCommunityDetails
  } = useCommunityStore();
  const { user, token } = useAuthStore();
  
  const [community, setCommunity] = useState<any>(null);
  const [event, setEvent] = useState<CommunityEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventData();
  }, [id, eventId, communities]);

  const loadEventData = async () => {
    if (!id || !eventId) return;
    
    try {
      setLoading(true);
      
      // Load community details if needed
      if (token) {
        await loadCommunityDetails(token, id);
      }
      
      // Find community and event
      const foundCommunity = communities.find(c => c.id === id);
      if (foundCommunity) {
        setCommunity(foundCommunity);
        const foundEvent = foundCommunity.events?.find(e => e.id === eventId);
        if (foundEvent) {
          setEvent(foundEvent);
        } else {
          Alert.alert('Error', 'Event not found');
          router.back();
        }
      } else {
        Alert.alert('Error', 'Community not found');
        router.back();
      }
    } catch (error) {
      console.error('Failed to load event data:', error);
      Alert.alert('Error', 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const isUserAttending = () => {
    return event?.attendees?.includes(user?.id || '') || false;
  };

  const isEventFull = () => {
    return event?.maxAttendees > 0 && (event.attendees?.length || 0) >= event.maxAttendees;
  };

  const isEventPast = () => {
    if (!event?.date) return false;
    const eventDate = new Date(event.date);
    return eventDate < new Date();
  };

  const canManageEvent = () => {
    if (!user || !event || !community) return false;
    return (
      event.createdBy === user.id ||
      community.owner === user.id ||
      (community.admins && community.admins.includes(user.id)) ||
      (community.moderators && community.moderators.includes(user.id))
    );
  };

  const handleJoinEvent = async () => {
    if (!token || !community || !event || !user) return;
    
    if (isEventFull()) {
      Alert.alert('Event Full', 'This event has reached maximum capacity');
      return;
    }
    
    try {
      await joinCommunityEvent(token, community.id, event.id);
      Alert.alert('Success', 'You have joined the event!');
      // Refresh event data
      loadEventData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to join event');
    }
  };

  const handleLeaveEvent = async () => {
    if (!token || !community || !event || !user) return;
    
    Alert.alert(
      'Leave Event',
      'Are you sure you want to leave this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCommunityEvent(token, community.id, event.id);
              Alert.alert('Success', 'You have left the event');
              loadEventData();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to leave event');
            }
          }
        }
      ]
    );
  };

  const handleShareEvent = async () => {
    if (!event) return;
    
    try {
      await ShareAPI.share({
        title: event.title,
        message: `Join "${event.title}" on ${new Date(event.date).toLocaleDateString()} at ${event.time}. ${event.description}`,
        url: `https://yourapp.com/community/${id}/event/${eventId}` // Replace with your actual URL scheme
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!token || !community || !event) return;
    
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCommunityEvent(token, community.id, event.id);
              Alert.alert('Success', 'Event deleted successfully');
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading || !event || !community) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            headerShown: true,
            headerTitle: 'Event Details',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: '',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShareEvent} style={styles.headerButton}>
                <Share size={22} color={Colors.dark.text} />
              </TouchableOpacity>
              {canManageEvent() && (
                <TouchableOpacity 
                  onPress={() => {
                    Alert.alert(
                      'Event Options',
                      'What would you like to do?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Edit Event', onPress: () => Alert.alert('Coming Soon', 'Edit functionality will be available soon') },
                        { text: 'Delete Event', style: 'destructive', onPress: handleDeleteEvent }
                      ]
                    );
                  }}
                  style={styles.headerButton}
                >
                  <MoreHorizontal size={22} color={Colors.dark.text} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }} 
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Event Banner */}
        {event.banner ? (
          <Image source={{ uri: event.banner }} style={styles.eventBanner} />
        ) : (
          <View style={styles.eventBannerPlaceholder}>
            <Calendar size={48} color={Colors.dark.subtext} />
          </View>
        )}
        
        {/* Event Details */}
        <View style={styles.eventContent}>
          {/* Title and Status */}
          <View style={styles.titleSection}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            {isEventPast() && (
              <Badge label="Past Event" variant="secondary" size="small" style={styles.statusBadge} />
            )}
            {isEventFull() && !isEventPast() && (
              <Badge label="Full" variant="error" size="small" style={styles.statusBadge} />
            )}
          </View>
          
          {/* Community Info */}
          <TouchableOpacity 
            style={styles.communityInfo}
            onPress={() => router.push(`/community/${community.id}`)}
          >
            {community.logo ? (
              <Image source={{ uri: community.logo }} style={styles.communityLogo} />
            ) : (
              <View style={styles.communityLogoPlaceholder}>
                <Text style={styles.communityLogoText}>
                  {community.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.communityName}>r/{community.name}</Text>
          </TouchableOpacity>
          
          {/* Date & Time */}
          <View style={styles.detailRow}>
            <Calendar size={20} color={Colors.dark.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>Date</Text>
              <Text style={styles.detailText}>{formatDate(event.date)}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Clock size={20} color={Colors.dark.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>Time</Text>
              <Text style={styles.detailText}>{event.time}</Text>
            </View>
          </View>
          
          {/* Location */}
          <View style={styles.detailRow}>
            {event.isOnline ? (
              <Globe size={20} color={Colors.dark.primary} />
            ) : (
              <MapPin size={20} color={Colors.dark.primary} />
            )}
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>
                {event.isOnline ? 'Online Event' : 'Location'}
              </Text>
              <Text style={styles.detailText}>
                {event.isOnline ? 'Meeting link provided to attendees' : event.location}
              </Text>
            </View>
          </View>
          
          {/* Attendees */}
          <View style={styles.detailRow}>
            <Users size={20} color={Colors.dark.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>Attendees</Text>
              <Text style={styles.detailText}>
                {event.attendees?.length || 0} attending
                {event.maxAttendees > 0 && ` of ${event.maxAttendees}`}
              </Text>
            </View>
          </View>
          
          {/* Description */}
          {event.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>About this event</Text>
              <Text style={styles.descriptionText}>{event.description}</Text>
            </View>
          )}
          
          {/* Attendees List Preview */}
          {event.attendees && event.attendees.length > 0 && (
            <View style={styles.attendeesSection}>
              <Text style={styles.attendeesTitle}>
                Attendees ({event.attendees.length})
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.attendeesList}
              >
                {event.attendees.slice(0, 10).map((attendeeId, index) => (
                  <View key={index} style={styles.attendeeItem}>
                    <Avatar 
                      source={''} // Would need to fetch user data
                      name={`User ${index + 1}`}
                      size={40} 
                    />
                  </View>
                ))}
                {event.attendees.length > 10 && (
                  <View style={styles.moreAttendees}>
                    <Text style={styles.moreAttendeesText}>
                      +{event.attendees.length - 10}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
          
          {/* Online Event Link (for attendees only) */}
          {event.isOnline && event.link && isUserAttending() && (
            <View style={styles.meetingLinkSection}>
              <Text style={styles.meetingLinkTitle}>Meeting Link</Text>
              <TouchableOpacity 
                style={styles.meetingLinkButton}
                onPress={() => {
                  // In a real app, you'd open the link in a browser
                  Alert.alert('Meeting Link', event.link || 'No link provided');
                }}
              >
                <Globe size={16} color={Colors.dark.primary} />
                <Text style={styles.meetingLinkText}>Join Meeting</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Action Button */}
      {!isEventPast() && (
        <View style={styles.actionSection}>
          {isUserAttending() ? (
            <Button
              title="Leave Event"
              onPress={handleLeaveEvent}
              variant="secondary"
              style={styles.actionButton}
            />
          ) : (
            <Button
              title={isEventFull() ? "Event Full" : "Join Event"}
              onPress={handleJoinEvent}
              disabled={isEventFull()}
              style={styles.actionButton}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
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
  scrollView: {
    flex: 1,
  },
  eventBanner: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  eventBannerPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    padding: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eventTitle: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
  },
  communityLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  communityLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dark.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  communityLogoText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  communityName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    lineHeight: 18,
  },
  descriptionSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  descriptionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  descriptionText: {
    color: Colors.dark.text,
    fontSize: 16,
    lineHeight: 22,
  },
  attendeesSection: {
    marginBottom: 24,
  },
  attendeesTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  attendeesList: {
    flexDirection: 'row',
  },
  attendeeItem: {
    marginRight: 12,
  },
  moreAttendees: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAttendeesText: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
  },
  meetingLinkSection: {
    backgroundColor: `${Colors.dark.primary}10`,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  meetingLinkTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  meetingLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  meetingLinkText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: '600',
  },
  actionSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  actionButton: {
    width: '100%',
  },
});
