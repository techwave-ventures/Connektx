import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  SafeAreaView,
  Platform,
  TextInput,
  Alert,
  Image,
  Modal,
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Tag, 
  Plus, 
  Trash2,
  Users,
  IndianRupee,
  Camera,
  Image as ImageIcon,
  ChevronDown
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useEventStore } from '@/store/event-store';
import { useAuthStore } from '@/store/auth-store';
import { useCommunityStore } from '@/store/community-store';
import { Event, TicketType } from '@/types';
import Colors from '@/constants/colors';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createTicket, createEvent, createCommunityEvent } from '@/api/event';

// Calendar Date Picker Component
const CalendarDatePicker = ({ value, onChange, minimumDate, maximumDate }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(value);

  const formatDisplayDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Use safer date arithmetic
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Use local date construction to avoid timezone issues
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Calculate the first day of the calendar grid (Sunday of the week containing the 1st)
    const startDate = new Date(year, month, 1 - firstDay.getDay());

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Maximum date is 365 days from today (1 year future events)
    const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

    for (let i = 0; i < 42; i++) {
      // Use date constructor instead of millisecond arithmetic to avoid timezone issues
      const day = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      
      const isCurrentMonth = day.getMonth() === month;
      const isSelectable = day >= today && day <= maxDate;
      const isSelected = day.toDateString() === selectedDate.toDateString();
      const isToday = day.toDateString() === today.toDateString();

      days.push({
        date: day,
        day: day.getDate(),
        isCurrentMonth,
        isSelectable,
        isSelected,
        isToday
      });
    }
    return days;
  };

  const handleDateSelect = (day) => {
    if (day.isSelectable) {
      setSelectedDate(day.date);
      onChange(null, day.date);
      setShowCalendar(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const newMonth = new Date(year, month + (direction === 'next' ? 1 : -1), 1);
    setCurrentMonth(newMonth);
  };

  const calendarDays = generateCalendarDays();
  const monthYearText = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <View>
      <TouchableOpacity 
        style={styles.datePickerTrigger}
        onPress={() => setShowCalendar(!showCalendar)}
      >
        <Text style={styles.datePickerText}>
          {formatDisplayDate(selectedDate)}
        </Text>
        <ChevronDown size={20} color={Colors.dark.subtext} />
      </TouchableOpacity>
      
      
      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContainer}>
            <View style={styles.calendarContainer}>
              {/* Calendar Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => navigateMonth('prev')}>
                  <ChevronLeft size={20} color={Colors.dark.primary} />
                </TouchableOpacity>
                <Text style={styles.monthYearText}>{monthYearText}</Text>
                <TouchableOpacity onPress={() => navigateMonth('next')}>
                  <ChevronDown size={20} color={Colors.dark.primary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>
              </View>
              
              {/* Day Labels */}
              <View style={styles.dayLabelsRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayLabel, index) => (
                  <Text key={index} style={styles.dayLabel}>{dayLabel}</Text>
                ))}
              </View>
              
              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      day.isSelected && styles.selectedCalendarDay,
                      day.isToday && !day.isSelected && styles.todayCalendarDay,
                      !day.isSelectable && styles.disabledCalendarDay
                    ]}
                    onPress={() => handleDateSelect(day)}
                    disabled={!day.isSelectable}
                  >
                    <Text style={[
                      styles.calendarDayText,
                      !day.isCurrentMonth && styles.otherMonthText,
                      day.isSelected && styles.selectedDayText,
                      day.isToday && !day.isSelected && styles.todayDayText,
                      !day.isSelectable && styles.disabledDayText
                    ]}>
                      {day.day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Close Button */}
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCalendar(false)}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// 12-Hour Time Picker Component with separate Hour, Minute, AM/PM controls
const TimePicker = ({ value, onChange }) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Parse initial time
  const parseTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return { hour: hour12, minute: parseInt(minutes), period };
  };
  
  const initialTime = parseTime(value);
  const [selectedHour, setSelectedHour] = useState(initialTime.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialTime.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initialTime.period);

  const formatDisplayTime = (hour: number, minute: number, period: string) => {
    const minuteStr = minute.toString().padStart(2, '0');
    return `${hour}:${minuteStr} ${period}`;
  };

  const convertTo24Hour = (hour12: number, minute: number, period: string) => {
    let hour24 = hour12;
    if (period === 'AM' && hour12 === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour12 !== 12) {
      hour24 = hour12 + 12;
    }
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const updateTime = (hour: number, minute: number, period: string) => {
    const time24 = convertTo24Hour(hour, minute, period);
    onChange(time24);
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    updateTime(hour, selectedMinute, selectedPeriod);
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    updateTime(selectedHour, minute, selectedPeriod);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    updateTime(selectedHour, selectedMinute, period);
  };

  // Generate options
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  return (
    <View>
      <TouchableOpacity 
        style={styles.timePickerTrigger}
        onPress={() => setShowTimePicker(!showTimePicker)}
      >
        <Text style={styles.timePickerText}>
          {formatDisplayTime(selectedHour, selectedMinute, selectedPeriod)}
        </Text>
        <ChevronDown size={20} color={Colors.dark.subtext} />
      </TouchableOpacity>
      
      
      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModalContainer}>
            <View style={styles.timePickerModal}>
              <View style={styles.timePickerHeader}>
                <Text style={styles.timePickerTitle}>Select Time</Text>
                <TouchableOpacity 
                  onPress={() => setShowTimePicker(false)}
                  style={styles.timePickerCloseButton}
                >
                  <Text style={styles.timePickerCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.timePickerControls}>
                {/* Hour Selector */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.columnLabel}>Hour</Text>
                  <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                    {hours.map((hour) => (
                      <TouchableOpacity
                        key={hour}
                        style={[
                          styles.timeOptionItem,
                          selectedHour === hour && styles.selectedTimeOptionItem
                        ]}
                        onPress={() => handleHourChange(hour)}
                      >
                        <Text style={[
                          styles.timeOptionItemText,
                          selectedHour === hour && styles.selectedTimeOptionItemText
                        ]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Minute Selector */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.columnLabel}>Minute</Text>
                  <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                    {minutes.map((minute) => (
                      <TouchableOpacity
                        key={minute}
                        style={[
                          styles.timeOptionItem,
                          selectedMinute === minute && styles.selectedTimeOptionItem
                        ]}
                        onPress={() => handleMinuteChange(minute)}
                      >
                        <Text style={[
                          styles.timeOptionItemText,
                          selectedMinute === minute && styles.selectedTimeOptionItemText
                        ]}>
                          {minute.toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* AM/PM Selector */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.columnLabel}>Period</Text>
                  <ScrollView style={styles.timeScrollColumn} showsVerticalScrollIndicator={false}>
                    {periods.map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.timeOptionItem,
                          selectedPeriod === period && styles.selectedTimeOptionItem
                        ]}
                        onPress={() => handlePeriodChange(period)}
                      >
                        <Text style={[
                          styles.timeOptionItemText,
                          selectedPeriod === period && styles.selectedTimeOptionItemText
                        ]}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function CreateEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, token } = useAuthStore();
  const { communities, canCreateEvent } = useCommunityStore();
  
  // Community-related state - initialize from route params if available
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(
    (params.communityId as string) || null
  );
  const [showCommunitySelector, setShowCommunitySelector] = useState(false);
  
  // Get communities where user can create events
  const availableCommunities = communities.filter(community => 
    user && canCreateEvent(community.id, user.id)
  );
  
  // Event details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    return today;
  });
  const [time, setTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineEventLink, setOnlineEventLink] = useState('');
  const [category, setCategory] = useState('Workshop');
  const [isPaid, setIsPaid] = useState(false);
  const [organizer, setOrganizer] = useState(() => {
    // Set organizer based on context - check params first, then selectedCommunity
    const communityId = (params.communityId as string) || selectedCommunity;
    if (communityId) {
      const community = communities.find(c => c.id === communityId);
      if (community) {
        return community.name;
      }
      // If community not found in store but we have communityName from params
      if (params.communityName) {
        return params.communityName as string;
      }
    }
    return user?.name || '';
  });
  const [banner, setBanner] = useState<string | null>(null);
  
  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // Speakers
  const [speakers, setSpeakers] = useState<string[]>([]);
  const [speakerInput, setSpeakerInput] = useState('');
  
  // Ticket types with proper number handling
  const [ticketTypes, setTicketTypes] = useState<any[]>([
    {
      id: 't1',
      _id: 't1',
      name: 'Regular',
      price: 0,
      description: '',
      available: '100', // Default 100 tickets
      total: '100'
    }
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Image picker functions
  const pickImageFromCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setBanner(result.assets[0].uri);
    }
  };
  
  const pickImageFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Gallery access permission is required to select photos.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setBanner(result.assets[0].uri);
    }
  };
  
  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Banner Image',
      'Choose how you want to add a banner image',
      [
        {
          text: 'Camera',
          onPress: pickImageFromCamera,
        },
        {
          text: 'Gallery',
          onPress: pickImageFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
  };
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput('');
    } else {
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  const handleAddSpeaker = () => {
    if (speakerInput.trim() && !speakers.includes(speakerInput.trim())) {
      const newSpeakers = [...speakers, speakerInput.trim()];
      setSpeakers(newSpeakers);
      setSpeakerInput('');
    } else {
    }
  };
  
  const handleRemoveSpeaker = (speaker: string) => {
    setSpeakers(speakers.filter(s => s !== speaker));
  };
  
  const handleAddTicketType = () => {
    const newTicketType: any = {
      id: `t${ticketTypes.length + 1}`,
      _id: `t${ticketTypes.length + 1}`,
      name: `Ticket Type ${ticketTypes.length + 1}`,
      price: 0,
      description: '',
      available: '100', // Default 100 tickets
      total: '100'
    };
    
    setTicketTypes([...ticketTypes, newTicketType]);
  };
  
  const handleRemoveTicketType = (id: string) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter(t => t.id !== id));
    } else {
      Alert.alert('Cannot Remove', 'You must have at least one ticket type.');
    }
  };
  
  const handleUpdateTicketType = (id: string, field: keyof TicketType, value: any) => {
    setTicketTypes(ticketTypes.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleIsPaidChange = (value: boolean) => {
    setIsPaid(value);
    // If the event is being made free, reset to a single, free ticket type
    if (!value) {
      setTicketTypes([
        {
          id: 't1',
          _id: 't1',
          name: 'Regular',
          price: 0,
          description: '',
          available: '100',
          total: '100',
        },
      ]);
    }
  };

  const handlePaidToggleAttempt = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Coming Soon',
        'We are working on paid events. This feature will be available shortly!'
      );
    } else {
      setIsPaid(false);
    }
  };
  
 const handleSubmit = async () => {
  const requiredLocation = isOnline ? onlineEventLink : location;
  if (!title || !description || !requiredLocation || !organizer) {
    Alert.alert('Missing Information', 'Please fill in all required fields.');
    return;
  }

  // Validate ticket types
  for (const ticket of ticketTypes) {
    if (!ticket.name || ticket.name.trim() === '') {
      Alert.alert('Invalid Ticket', 'Please provide a name for all ticket types.');
      return;
    }
    
    // Handle both string and number types for available tickets
    const availableCount = typeof ticket.available === 'string' ? parseInt(ticket.available) : ticket.available;
    if (isNaN(availableCount) || availableCount < 1 || availableCount > 10000) {
      Alert.alert('Invalid Ticket Count', `Available tickets for "${ticket.name}" must be between 1 and 10,000.`);
      return;
    }
  }

  const totalTickets = ticketTypes.reduce((acc, ticket) => {
    const availableCount = parseInt(ticket.available, 10) || 0;
    return acc + availableCount;
  }, 0);

  if (!token) {
    Alert.alert('Error', 'You must be logged in to create an event.');
    return;
  }

  setIsSubmitting(true);

  try {
    // 1. Create all tickets sequentially
    const ticketIds: string[] = [];
    for (const ticket of ticketTypes) {
      const availableCount = typeof ticket.available === 'string' ? parseInt(ticket.available) : ticket.available;
      const ticketPayload = {
        name: ticket.name,
        price: String(ticket.price),
        remTicket: availableCount,
      };
      const ticketId = await createTicket(token, ticketPayload);
      ticketIds.push(ticketId);
    }

    // 2. Prepare event data
    const eventPayload = {
      title,
      description,
      shortDescription: description.slice(0, 100),
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      time,
      location: isOnline ? 'Online Event' : location,
      banner,
      organizer,
      organizerId: selectedCommunity || user?.id || 'unknown',
      isPaid: isPaid.toString(),
      isOnline: isOnline.toString(),
      onlineEventLink: isOnline ? onlineEventLink : '',
      category,
      ticketTypes: ticketIds,
      maxAttendees: totalTickets,
      attendees: [],
      tags: tags,
      speakers: speakers,
      createdBy: user?.id || 'unknown',
      likes: [],
      bookmarks: [],
      // Community fields
      communityId: selectedCommunity,
      organizerType: selectedCommunity ? 'community' : 'user',
    };

    
    // Test with some sample data to see if the issue is with empty arrays
    if (tags.length === 0) {
    }
    if (speakers.length === 0) {
    }

    // 3. Create the event (only after all tickets are created)
    const createdEventResponse = selectedCommunity 
      ? await createCommunityEvent(token, selectedCommunity, eventPayload)
      : await createEvent(token, eventPayload);

    // Extract event ID from response (adjust based on your API response structure)
    const eventId = createdEventResponse.body.id || createdEventResponse.body._id || createdEventResponse.body?.id;

    Alert.alert(
      'Success',
      'Event created successfully!',
      [
        {
          text: 'View Event',
          onPress: () => router.push(`/event/${eventId}`)
        },
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to create event');
  } finally {
    setIsSubmitting(false);
  }
};
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          
          {/* Community Selector */}
          {availableCommunities.length > 0 && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Create event as</Text>
              <TouchableOpacity 
                style={styles.communitySelector}
                onPress={() => setShowCommunitySelector(!showCommunitySelector)}
              >
                <View style={styles.communitySelectorContent}>
                  {selectedCommunity ? (
                    <>
                      <View style={styles.selectedCommunityInfo}>
                        {(() => {
                          const community = communities.find(c => c.id === selectedCommunity);
                          return community ? (
                            <>
                              <Users size={20} color={Colors.dark.primary} />
                              <Text style={styles.selectedCommunityText}>{community.name}</Text>
                            </>
                          ) : null;
                        })()}
                      </View>
                    </>
                  ) : (
                    <>
                      <Users size={20} color={Colors.dark.subtext} />
                      <Text style={styles.communitySelectorText}>Personal Event</Text>
                    </>
                  )}
                </View>
                <ChevronDown size={20} color={Colors.dark.subtext} />
              </TouchableOpacity>
              
              {showCommunitySelector && (
                <View style={styles.communityDropdown}>
                  <TouchableOpacity
                    style={[
                      styles.communityOption,
                      !selectedCommunity && styles.communityOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedCommunity(null);
                      setOrganizer(user?.name || '');
                      setShowCommunitySelector(false);
                    }}
                  >
                    <Users size={16} color={Colors.dark.subtext} />
                    <Text style={styles.communityOptionText}>Personal Event</Text>
                  </TouchableOpacity>
                  
                  {availableCommunities.map(community => (
                    <TouchableOpacity
                      key={community.id}
                      style={[
                        styles.communityOption,
                        selectedCommunity === community.id && styles.communityOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedCommunity(community.id);
                        setOrganizer(community.name);
                        setShowCommunitySelector(false);
                      }}
                    >
                      <Users size={16} color={Colors.dark.primary} />
                      <Text style={styles.communityOptionText}>{community.name}</Text>
                      <Text style={styles.communityMemberCount}>
                        {community.memberCount} members
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          
          <Input
            label="Event Title *"
            placeholder="Enter event title"
            value={title}
            onChangeText={setTitle}
          />
          
          <Input
            label="Description *"
            placeholder="Enter event description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={[styles.textArea, { color: Colors.dark.text }]}
          />
          
          {/* Banner Image Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Banner Image</Text>
            <TouchableOpacity 
              style={styles.imagePickerContainer}
              onPress={showImagePickerOptions}
            >
              {banner ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: banner }} style={styles.selectedImage} />
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={showImagePickerOptions}
                  >
                    <Camera size={20} color="#fff" />
                    <Text style={styles.changeImageText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <ImageIcon size={48} color={Colors.dark.subtext} />
                  <Text style={styles.imagePlaceholderText}>Tap to add banner image</Text>
                  <Text style={styles.imagePlaceholderSubtext}>Recommended: 16:9 aspect ratio</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Date *</Text>
            <View style={styles.datePickerContainer}>
              <Calendar size={20} color={Colors.dark.primary} />
              <View style={styles.datePickerWrapper}>
                <CalendarDatePicker
                  value={date}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  maximumDate={(() => {
                    const today = new Date();
                    // Allow events up to 1 year in the future
                    return new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
                  })()}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Time *</Text>
            <View style={styles.timePickerContainer}>
              <Clock size={20} color={Colors.dark.primary} />
              <View style={styles.timePickerWrapper}>
                <TimePicker
                  value={time}
                  onChange={setTime}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Event Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              {['Workshop', 'Meetup', 'Pitch', 'Seminar', 'Hackathon', 'Webinar', 'Conference', 'Networking'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.selectedCategoryChip
                  ]}
                  onPress={() => setCategory(cat as any)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    category === cat && styles.selectedCategoryChipText
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Online Event</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: Colors.dark.card, true: `${Colors.dark.primary}80` }}
              thumbColor={isOnline ? Colors.dark.primary : Colors.dark.subtext}
            />
          </View>
          
          <Input
            label={isOnline ? "Online Event Link *" : "Location *"}
            placeholder={isOnline ? "Enter meeting link (Zoom, Google Meet, etc.)" : "Enter event location"}
            value={isOnline ? onlineEventLink : location}
            onChangeText={isOnline ? setOnlineEventLink : setLocation}
            leftIcon={<MapPin size={20} color={Colors.dark.primary} />}
          />
          
          <Input
            label="Organizer *"
            placeholder="Enter organizer name"
            value={organizer}
            onChangeText={setOrganizer}
            leftIcon={<Users size={20} color={Colors.dark.primary} />}
          />
          
          <View style={styles.tagsSection}>
            <Text style={styles.label}>Tags</Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                placeholder="Add a tag"
                placeholderTextColor={Colors.dark.subtext}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddTag}
              >
                <Plus size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                    <Trash2 size={16} color={Colors.dark.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.speakersSection}>
            <Text style={styles.label}>Speakers</Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                placeholder="Add a speaker"
                placeholderTextColor={Colors.dark.subtext}
                value={speakerInput}
                onChangeText={setSpeakerInput}
                onSubmitEditing={handleAddSpeaker}
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddSpeaker}
              >
                <Plus size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.speakersContainer}>
              {speakers.map((speaker, index) => (
                <View key={index} style={styles.speaker}>
                  <Text style={styles.speakerText}>{speaker}</Text>
                  <TouchableOpacity onPress={() => handleRemoveSpeaker(speaker)}>
                    <Trash2 size={16} color={Colors.dark.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.ticketsSection}>
            <Text style={styles.sectionTitle}>Tickets</Text>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Paid Event</Text>
              <Switch
                value={isPaid}
                onValueChange={handlePaidToggleAttempt}
                trackColor={{ false: Colors.dark.card, true: `${Colors.dark.primary}80` }}
                thumbColor={isPaid ? Colors.dark.primary : Colors.dark.subtext}
              />
            </View>

            {isPaid && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Ticket Types</Text>
                <TouchableOpacity 
                  style={styles.addTicketButton}
                  onPress={handleAddTicketType}
                >
                  <Text style={styles.addTicketText}>+ Add Ticket Type</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {ticketTypes.map((ticket, index) => (
              <View key={ticket.id} style={styles.ticketTypeCard}>
                <View style={styles.ticketTypeHeader}>
                  <Text style={styles.ticketTypeTitle}>
                    {isPaid ? `Ticket Type ${index + 1}` : 'Ticket Details'}
                  </Text>
                  {isPaid && ticketTypes.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveTicketType(ticket.id)}>
                      <Trash2 size={20} color={Colors.dark.error} />
                    </TouchableOpacity>
                  )}
                </View>
                
                {isPaid && (
                  <Input
                    label="Ticket Name"
                    placeholder="e.g., Regular, VIP, Early Bird"
                    value={ticket.name}
                    onChangeText={(value) => handleUpdateTicketType(ticket.id, 'name', value)}
                  />
                )}
                
                {isPaid && (
                  <Input
                    label="Price (₹)"
                    placeholder="0"
                    value={ticket.price.toString()}
                    onChangeText={(value) => handleUpdateTicketType(ticket.id, 'price', parseInt(value) || 0)}
                    keyboardType="numeric"
                    leftIcon={<IndianRupee size={20} color={Colors.dark.primary} />}
                  />
                )}
                
                {/* Available Tickets - Direct TextInput Implementation */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Available Tickets</Text>
                  <View style={styles.availableTicketsContainer}>
                    <View style={styles.leftIcon}>
                      <Users size={20} color={Colors.dark.primary} />
                    </View>
                    <TextInput
                      style={styles.availableTicketsInput}
                      placeholder="Enter number of tickets (1-10000)"
                      placeholderTextColor={Colors.dark.subtext}
                      value={ticket.available?.toString() || ''}
                      onChangeText={(value) => {
                        const numericValue = value.replace(/[^0-9]/g, '');
                        setTicketTypes(currentTicketTypes =>
                          currentTicketTypes.map(t => {
                            if (t.id === ticket.id) {
                              return {
                                ...t,
                                available: numericValue,
                                total: numericValue,
                              };
                            }
                            return t;
                          }),
                        );
                      }}
                      keyboardType="numeric"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
          
          <Button
            title="Create Event"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            gradient
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: Colors.dark.text,
    fontSize: 16,
    marginBottom: 8,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  switchLabel: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  tagsSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.dark.text,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: Colors.dark.text,
    marginRight: 8,
  },
  speakersSection: {
    marginBottom: 24,
  },
  speakersContainer: {
    
  },
  speaker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  speakerText: {
    color: Colors.dark.text,
  },
  ticketsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addTicketButton: {
    
  },
  addTicketText: {
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  ticketTypeCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ticketTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketTypeTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 16,
  },
  categoryContainer: {
    paddingVertical: 8,
  },
  categoryChip: {
    backgroundColor: Colors.dark.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  selectedCategoryChip: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  categoryChipText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCategoryChipText: {
    color: '#fff',
  },
  // Image picker styles
  imagePickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  selectedImageContainer: {
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  changeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeImageText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  imagePlaceholder: {
    backgroundColor: Colors.dark.card,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imagePlaceholderText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  imagePlaceholderSubtext: {
    color: Colors.dark.subtext,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  // Date picker styles
  datePickerWrapper: {
    flex: 1,
    marginLeft: 8,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    marginTop: 8,
  },
  datePickerText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  calendarContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    marginTop: 8,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthYearText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    color: Colors.dark.subtext,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%', // 7 days per week
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedCalendarDay: {
    backgroundColor: Colors.dark.primary,
  },
  todayCalendarDay: {
    backgroundColor: `${Colors.dark.primary}30`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  disabledCalendarDay: {
    opacity: 0.3,
  },
  calendarDayText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  todayDayText: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  otherMonthText: {
    color: Colors.dark.subtext,
    opacity: 0.5,
  },
  disabledDayText: {
    color: Colors.dark.subtext,
    opacity: 0.3,
  },
  // Time picker styles
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerWrapper: {
    flex: 1,
    marginLeft: 8,
  },
  timePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    marginTop: 8,
  },
  timePickerText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  timePickerModal: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
    maxHeight: 300,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timePickerTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  timePickerCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.dark.primary,
    borderRadius: 6,
  },
  timePickerCloseText: {
    color: '#fff',
    fontWeight: '600',
  },
  timePickerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timePickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  columnLabel: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  timeScrollColumn: {
    height: 150,
    borderRadius: 8,
    backgroundColor: `${Colors.dark.background}80`,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  timeOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: `${Colors.dark.border}50`,
    minHeight: 40,
  },
  selectedTimeOptionItem: {
    backgroundColor: Colors.dark.primary,
  },
  timeOptionItemText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  selectedTimeOptionItemText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Modal overlay styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModalContainer: {
    width: '90%',
    maxWidth: 350,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  timePickerModalContainer: {
    width: '90%',
    maxWidth: 350,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCloseButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Available Tickets Direct Input styles
  availableTicketsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  availableTicketsInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 8,
    color: Colors.dark.text,
    fontSize: 16,
  },
  leftIcon: {
    paddingLeft: 16,
  },
  // Community selector styles
  communitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
  },
  communitySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedCommunityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCommunityText: {
    color: Colors.dark.text,
    fontSize: 16,
    marginLeft: 8,
  },
  communitySelectorText: {
    color: Colors.dark.subtext,
    fontSize: 16,
    marginLeft: 8,
  },
  communityDropdown: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 4,
    maxHeight: 200,
  },
  communityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  communityOptionSelected: {
    backgroundColor: `${Colors.dark.primary}15`,
  },
  communityOptionText: {
    color: Colors.dark.text,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  communityMemberCount: {
    color: Colors.dark.subtext,
    fontSize: 12,
  },
});
