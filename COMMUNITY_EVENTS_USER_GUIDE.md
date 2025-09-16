# Community Events User Guide

## 🎯 **Where to Create Community Events**

### **Method 1: From Community Detail Page**
1. **Navigate to Community**: Go to any community you're a member of
2. **Find Events Tab**: Look for the "Events" tab in the community navigation
3. **Create Event**: 
   - Click the **floating action button (FAB)** with the "+" icon (bottom-right)
   - OR click **"Create First Event"** button if no events exist yet
4. **Event Form**: The event creation form will automatically:
   - Pre-select the community as organizer
   - Set the organizer name to the community name
   - Create the event as a community event

### **Method 2: From Global Event Creation**
1. **Navigate**: Go to `/event/create` screen (main event creation)
2. **Community Selector**: If you have permission in any communities, you'll see a dropdown at the top
3. **Choose Organizer**: 
   - Select "Personal Event" to create as yourself
   - OR select a community name to create as that community
4. **Create Event**: Complete the form normally

## 🔍 **Where to See Community Events**

### **1. Community Detail Page - Events Tab**
- **Location**: `Community Detail → Events Tab`
- **What You See**: All events organized by that specific community
- **Features**:
  - Past and upcoming events
  - Event details (date, time, location, attendees)
  - Register/Buy Ticket buttons for upcoming events
  - "Event has ended" status for past events
  - Pull-to-refresh to update the list

### **2. Main Events Feed** (if implemented)
- Community events should also appear in the main events listing
- They'll show with community branding (name and logo)
- Filter by organizer type: "user" vs "community"

## 👥 **Who Can Create Community Events**

### **Permission Levels**
1. **Community Owners**: ✅ Can always create events
2. **Community Admins**: ✅ Can always create events  
3. **Community Moderators**: ✅ Can always create events
4. **Community Members**: ✅ Can create events IF `allowMemberEvents` setting is enabled
5. **Non-members**: ❌ Cannot create events for the community

### **Settings Control**
- Community owners/admins can control the `allowMemberEvents` setting
- When disabled, only owners, admins, and moderators can create events
- When enabled, all members can create events for the community

## 🎨 **UI/UX Features**

### **Event Creation Screen**
- **Smart Dropdown**: Only shows communities where you have permission
- **Visual Indicators**: Clear distinction between personal and community events
- **Auto-Population**: Organizer field updates based on selection
- **Seamless Flow**: Same form works for both personal and community events

### **Community Events Tab**
- **Rich Cards**: Events display with banners, details, and actions
- **Status Indicators**: Visual distinction between past and upcoming events
- **Permission-Aware**: Create buttons only show for authorized users
- **Empty States**: Helpful messages based on your permission level
- **Loading States**: Smooth loading and refresh experience

### **Event Cards Show**
- **Event Banner**: If uploaded during creation
- **Event Details**: Date, time, location (or "Online Event")
- **Attendance**: Number of registered attendees
- **Pricing**: Free or paid status with ticket price
- **Tags**: Event categories and custom tags
- **Action Buttons**: Register/Buy Ticket for upcoming events

## 🔄 **How It Works Behind the Scenes**

### **Event Creation Flow**
```
1. User selects community or personal organizer
2. Form data includes communityId (if community selected)
3. API call: createCommunityEvent() or createEvent()
4. Backend validates community permissions
5. Event created with organizerType: 'community' or 'user'
6. Event appears in community events tab
7. User returns to community detail page
8. Events tab refreshes automatically
```

### **Permission Validation**
```
Backend checks:
- Is user a member of the community?
- What's their role? (owner/admin/moderator/member)
- Are member events allowed in this community?
- Then allows/denies event creation
```

### **Event Display Logic**
```
Community Events Tab shows:
- Events where communityId matches current community
- Events where organizerType === 'community'
- Sorted by date (upcoming first, then past)
- Real-time updates when new events are created
```

## 🚀 **Getting Started**

### **For Community Owners/Admins**
1. **Enable Member Events**: Allow members to create events (recommended)
2. **Create First Event**: Lead by example - create the first community event
3. **Promote Feature**: Let members know they can create events too

### **For Community Members**
1. **Join Communities**: Join communities where you want to organize events
2. **Check Permissions**: See which communities allow you to create events
3. **Start Creating**: Use either the community events tab or global event creation

### **For Users**
1. **Discover Events**: Browse community events tabs to find interesting events
2. **Register**: Sign up for events that interest you
3. **Stay Updated**: Use pull-to-refresh to see the latest events

## 📱 **Navigation Paths**

### **To Create Community Events**
```
Path 1: Community Detail → Events Tab → FAB (+)
Path 2: Global Event Creation → Select Community from dropdown
```

### **To View Community Events**
```
Path 1: Community Detail → Events Tab
Path 2: Main Events Feed → Filter by community
```

### **Event Management**
```
- Event Details: Tap any event card
- Event Registration: Use Register/Buy Ticket buttons
- Event Updates: Pull-to-refresh on events tab
```

## 🎯 **Best Practices**

### **For Event Organizers**
1. **Clear Titles**: Use descriptive event titles
2. **Good Descriptions**: Explain what attendees will learn/experience
3. **Proper Timing**: Set realistic dates and times
4. **Venue Details**: Provide clear location info or online links
5. **Banner Images**: Upload attractive event banners
6. **Tag Appropriately**: Use relevant tags for discoverability

### **For Community Managers**
1. **Set Clear Guidelines**: Let members know event creation policies
2. **Monitor Events**: Keep an eye on community-created events
3. **Promote Events**: Help promote good community events
4. **Manage Permissions**: Adjust `allowMemberEvents` as needed

### **For Attendees**
1. **RSVP Early**: Register for events you're interested in
2. **Check Details**: Review event information before attending
3. **Stay Updated**: Refresh the events tab regularly
4. **Provide Feedback**: Help organizers improve future events

## ⚡ **Quick Tips**

- **Refresh Events**: Pull-to-refresh on the events tab to see new events
- **Check Permissions**: The create button only appears if you can create events
- **Switch Organizers**: Use the dropdown to choose between personal and community events
- **View Past Events**: Past events remain visible but show "Event has ended"
- **Community Context**: Events created from community tabs are automatically community events

This implementation makes community event creation seamless while maintaining proper permissions and providing a great user experience for both organizers and attendees!
