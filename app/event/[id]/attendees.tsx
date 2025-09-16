import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  Users,
  Download,
  Search,
  Filter,
  X,
  Check,
} from 'lucide-react-native';
import { useEventAttendees, useEvent } from '@/hooks/useApiQueries';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';

interface Attendee {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  ticketType?: string;
  bookedAt: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export default function EventAttendeesScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const eventId = id as string;

  // States
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('all');

  // API queries
  const {
    data: event,
    isLoading: eventLoading,
    error: eventError,
    refetch: refetchEvent,
  } = useEvent(eventId);

  const {
    data: attendees = [],
    isLoading: attendeesLoading,
    error: attendeesError,
    refetch: refetchAttendees,
  } = useEventAttendees(eventId);

  // Debug logging
  console.log('EventAttendeesScreen Debug:', {
    eventId,
    attendeesLoading,
    attendeesError: attendeesError?.message,
    attendeesCount: attendees?.length || 0,
    attendeesData: attendees,
    hasToken: !!user,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchEvent(), refetchAttendees()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleContactAttendee = (attendee: Attendee) => {
    Alert.alert(
      `Contact ${attendee.name}`,
      'How would you like to contact this attendee?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Email',
          onPress: () => {
            Linking.openURL(`mailto:${attendee.email}`);
          },
        },
        ...(attendee.phone
          ? [
              {
                text: 'Call',
                onPress: () => {
                  Linking.openURL(`tel:${attendee.phone}`);
                },
              },
            ]
          : []),
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return Colors.dark.success;
      case 'pending':
        return Colors.dark.warning || '#FFA500';
      case 'cancelled':
        return Colors.dark.error;
      default:
        return Colors.dark.subtext;
    }
  };

  const getFilteredAttendees = () => {
    return attendees.filter((attendee: any) => {
      // Normalize attendee data with defaults for missing fields
      const normalizedAttendee = {
        ...attendee,
        status: attendee.status || 'confirmed', // Default status
        ticketType: attendee.ticketType || 'General', // Default ticket type
        bookedAt: attendee.bookedAt || attendee.createdAt || new Date().toISOString(), // Default booking date
      };
      
      const matchesSearch =
        !searchQuery ||
        normalizedAttendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        normalizedAttendee.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || normalizedAttendee.status === statusFilter;

      const matchesTicketType =
        ticketTypeFilter === 'all' || normalizedAttendee.ticketType === ticketTypeFilter;

      return matchesSearch && matchesStatus && matchesTicketType;
    });
  };

  const filteredAttendees = getFilteredAttendees();
  const uniqueTicketTypes = Array.from(
    new Set(attendees.map((a: Attendee) => a.ticketType).filter(Boolean))
  );

  const renderAttendeeCard = ({ item: rawAttendee }: { item: any }) => {
    // Normalize attendee data with defaults for missing fields
    const attendee = {
      ...rawAttendee,
      status: rawAttendee.status || 'confirmed', // Default status
      ticketType: rawAttendee.ticketType || 'General', // Default ticket type  
      bookedAt: rawAttendee.bookedAt || rawAttendee.createdAt || new Date().toISOString(), // Default booking date
    };
    
    return (
      <Card style={styles.attendeeCard}>
        <View style={styles.attendeeHeader}>
          <View style={styles.attendeeInfo}>
            <Avatar
              size={40}
              name={attendee.name}
              source={undefined}
            />
            <View style={styles.attendeeDetails}>
              <Text style={styles.attendeeName}>{attendee.name}</Text>
              <Text style={styles.attendeeEmail}>{attendee.email}</Text>
              {attendee.phone && (
                <Text style={styles.attendeePhone}>{attendee.phone}</Text>
              )}
            </View>
          </View>

          <View style={styles.attendeeActions}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(attendee.status)}20` },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(attendee.status) },
                ]}
              >
                {attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContactAttendee(attendee)}
            >
              <Mail size={16} color={Colors.dark.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.attendeeMeta}>
          {attendee.ticketType && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Ticket:</Text>
              <Text style={styles.metaValue}>{attendee.ticketType}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Booked:</Text>
            <Text style={styles.metaValue}>{formatDate(attendee.bookedAt)}</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{event?.title || 'Event Attendees'}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Users size={16} color={Colors.dark.primary} />
            <Text style={styles.statText}>{filteredAttendees.length} Attendees</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Search size={18} color={Colors.dark.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Filter size={18} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (eventLoading || attendeesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendees</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading attendees...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (eventError || attendeesError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Attendees</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load attendees</Text>
          <Button
            title="Retry"
            onPress={handleRefresh}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendees</Text>
      </View>

      <FlatList
        data={filteredAttendees}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderAttendeeCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.dark.tint}
            colors={[Colors.dark.tint]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Users size={48} color={Colors.dark.subtext} />
            <Text style={styles.emptyText}>No attendees found</Text>
            {searchQuery || statusFilter !== 'all' || ticketTypeFilter !== 'all' ? (
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            ) : (
              <Text style={styles.emptySubtext}>
                No one has registered for this event yet
              </Text>
            )}
          </View>
        )}
      />

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
              <Text style={styles.modalTitle}>Filter Attendees</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <X size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterOptions}>
                  {['all', 'confirmed', 'pending', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        statusFilter === status && styles.filterOptionSelected,
                      ]}
                      onPress={() => setStatusFilter(status)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          statusFilter === status && styles.filterOptionTextSelected,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                      {statusFilter === status && (
                        <Check size={16} color={Colors.dark.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Ticket Type Filter */}
              {uniqueTicketTypes.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Ticket Type</Text>
                  <View style={styles.filterOptions}>
                    {['all', ...uniqueTicketTypes].map((ticketType) => (
                      <TouchableOpacity
                        key={ticketType}
                        style={[
                          styles.filterOption,
                          ticketTypeFilter === ticketType && styles.filterOptionSelected,
                        ]}
                        onPress={() => setTicketTypeFilter(ticketType)}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            ticketTypeFilter === ticketType &&
                              styles.filterOptionTextSelected,
                          ]}
                        >
                          {ticketType === 'all' ? 'All Types' : ticketType}
                        </Text>
                        {ticketTypeFilter === ticketType && (
                          <Check size={16} color={Colors.dark.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Reset Filters"
                onPress={() => {
                  setStatusFilter('all');
                  setTicketTypeFilter('all');
                  setSearchQuery('');
                }}
                style={styles.resetButton}
              />

              <Button
                title="Apply"
                onPress={() => setShowFilterModal(false)}
                style={styles.applyButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  headerContainer: {
    marginBottom: 20,
  },
  eventInfo: {
    marginBottom: 16,
  },
  eventTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  statText: {
    color: Colors.dark.text,
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  filterButton: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
  },
  attendeeCard: {
    marginBottom: 12,
    padding: 16,
  },
  attendeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attendeeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  attendeeName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  attendeeEmail: {
    color: Colors.dark.subtext,
    fontSize: 14,
    marginBottom: 1,
  },
  attendeePhone: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  attendeeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactButton: {
    backgroundColor: `${Colors.dark.primary}20`,
    borderRadius: 16,
    padding: 8,
  },
  attendeeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginRight: 4,
  },
  metaValue: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '500',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    width: 120,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
  },
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
    maxHeight: '80%',
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
    gap: 16,
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});
