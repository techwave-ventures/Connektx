# Community Events Feature Implementation

## Overview
This implementation adds the ability for communities to create events, just like normal users can. Communities can organize events, and the permission system allows owners, admins, moderators, and sometimes members to create events based on community settings.

## Key Components Implemented

### 1. **Type System Updates** ✅
- **File**: `types/index.ts`
- **Changes**: Extended the `Event` interface to include community-specific fields:
  - `communityId?: string` - ID of the organizing community
  - `communityName?: string` - Name of the organizing community  
  - `communityLogo?: string` - Logo of the organizing community
  - `isPrivate?: boolean` - Whether the event is private
  - `organizerType: 'user' | 'community'` - Type of organizer
  - `communityRole?: 'owner' | 'admin' | 'moderator'` - Role of event creator in community

### 2. **API Layer Enhancements** ✅
- **File**: `api/event.ts`
- **New Functions**:
  - `createCommunityEvent(token, communityId, eventData)` - Create events for communities
  - `fetchCommunityEvents(token, communityId)` - Fetch events organized by a community
- **Enhanced**: `createEvent()` now supports community fields

### 3. **Community Store Integration** ✅
- **File**: `store/community-store.ts`
- **New Settings**: Added `allowMemberEvents: boolean` to `CommunitySettings`
- **New Functions**:
  - `createCommunityEvent(token, communityId, eventData)` - Creates events for communities
  - `fetchCommunityEvents(token, communityId)` - Fetches community events
  - `canCreateEvent(communityId, userId)` - Permission checking for event creation
- **Permission Logic**:
  - **Owners & Admins**: Can always create events
  - **Moderators**: Can always create events
  - **Members**: Can create events only if `allowMemberEvents` is enabled

### 4. **Event Creation Screen Updates** ✅
- **File**: `app/event/create.tsx`
- **New Features**:
  - Community selector dropdown (shows communities where user can create events)
  - Dynamic organizer field (updates based on selected community)
  - Handles both personal and community event creation
- **New Imports**: Added `useCommunityStore` and `createCommunityEvent`
- **New State**: 
  - `selectedCommunity` - Currently selected community
  - `showCommunitySelector` - Toggle for community dropdown
  - `availableCommunities` - Communities where user has event creation permission

### 5. **Community Events Display** ✅
- **File**: `components/community/CommunityEventsTab.tsx`
- **Features**:
  - Displays events organized by a community
  - Shows event details (date, time, location, attendees)
  - Handles online/offline events
  - Shows past vs upcoming events
  - Create Event FAB for users with permission
  - Empty state with conditional messaging
  - Pull-to-refresh functionality

### 6. **Event Store Enhancements** ✅
- **File**: `store/event-store.ts`
- **New Methods**:
  - `getCommunityEvents(communityId)` - Filter events by community
  - `getPersonalEvents()` - Get user-created events
  - `getEventsByOrganizer(organizerId)` - Get events by organizer ID
- **Enhanced Data**: Event transformation now includes community fields

## How It Works

### Event Creation Flow
1. **User Access**: User opens event creation screen
2. **Permission Check**: System checks which communities allow user to create events
3. **Community Selection**: If user has access to communities, dropdown appears
4. **Event Creation**: Based on selection, creates either personal or community event
5. **API Call**: Routes to appropriate API (`createEvent` vs `createCommunityEvent`)

### Permission System
```typescript
canCreateEvent(communityId: string, userId: string): boolean {
  const community = findCommunity(communityId);
  
  // Owners and admins can always create events
  if (isOwner(userId) || isAdmin(userId)) return true;
  
  // Moderators can create events
  if (isModerator(userId)) return true;
  
  // Members can create events only if allowed by community settings
  if (isMember(userId) && community.settings.allowMemberEvents) return true;
  
  return false;
}
```

### Community Events Display
```typescript
// In community details page, add events tab
<CommunityEventsTab 
  communityId={community.id} 
  community={community} 
/>
```

## Integration Points

### 1. **Community Details Page Integration**
To add events to community pages, import and use the `CommunityEventsTab`:

```tsx
import CommunityEventsTab from '@/components/community/CommunityEventsTab';

// Add to tab system
const tabs = [
  { key: 'feed', label: 'Feed' },
  { key: 'events', label: 'Events' }, // New tab
  { key: 'members', label: 'Members' },
];

// Render tab content
{activeTab === 'events' && (
  <CommunityEventsTab 
    communityId={community.id} 
    community={community} 
  />
)}
```

### 2. **Backend Requirements**
The backend should:
- Accept `communityId` parameter in event creation API
- Validate community permissions before allowing event creation
- Support fetching events by community ID
- Return community information in event objects
- Handle community-specific event visibility rules

### 3. **Database Schema Updates**
Events table should include:
- `community_id` (nullable foreign key)
- `organizer_type` ('user' or 'community')
- `community_name` (denormalized for performance)
- `community_logo` (denormalized for performance)

## Usage Examples

### Creating a Community Event
```typescript
// User selects community in event creation screen
const eventData = {
  title: "React Workshop",
  description: "Learn React fundamentals",
  date: "2024-01-15",
  time: "10:00",
  // ... other event fields
};

// System automatically adds community context
await createCommunityEvent(token, communityId, eventData);
```

### Displaying Community Events
```typescript
// Fetch events for a specific community
const events = await fetchCommunityEvents(token, communityId);

// Or filter from event store
const communityEvents = useEventStore().getCommunityEvents(communityId);
```

### Permission Checking
```typescript
const { canCreateEvent } = useCommunityStore();
const userCanCreate = canCreateEvent(communityId, userId);

if (userCanCreate) {
  // Show create event button/option
}
```

## UI/UX Features

### Event Creation Screen
- **Community Selector**: Dropdown showing communities where user can create events
- **Dynamic Labels**: Form labels adjust based on selected organizer type
- **Permission Awareness**: Only shows communities where user has permission
- **Visual Feedback**: Clear indication of organizer (personal vs community)

### Community Events Tab
- **Event Cards**: Rich display with banner images, details, and actions
- **Status Indicators**: Clear distinction between upcoming and past events
- **Permission-Based Actions**: FAB and create buttons only show for authorized users
- **Empty States**: Contextual messages based on user permissions
- **Responsive Design**: Works well on different screen sizes

## Benefits

1. **Seamless Integration**: Works alongside existing personal events
2. **Permission-Based**: Respects community roles and settings
3. **User-Friendly**: Intuitive interface for both creation and viewing
4. **Scalable**: Easy to extend with additional community features
5. **Consistent**: Follows existing app patterns and UI conventions

## Future Enhancements

1. **Event Analytics**: Track community event performance
2. **Event Templates**: Allow communities to create reusable event templates
3. **Co-hosting**: Multiple communities organizing events together
4. **Event Series**: Recurring events for communities
5. **Community Calendar**: Calendar view of all community events
6. **RSVP Management**: Enhanced attendee management for community events

This implementation provides a solid foundation for community event management while maintaining the flexibility and user experience of the existing event system.
