# Pagination Implementation for Homepage Posts

## Overview
This implementation adds comprehensive pagination functionality to the homepage posts feed with both infinite scroll and manual "Load More" capabilities, proper loading states, error handling, and smooth user experience.

## What was implemented:

### 1. API Layer Updates (`api/post.ts`)
- **Enhanced `getPosts()` function** with pagination parameters
- **Updated `getAllPosts()` function** with pagination support
- **Added pagination interfaces**:
  - `PaginationInfo` - Contains pagination metadata
  - `PostsResponse` - Standardized API response format
- **Automatic pagination calculation** with `hasNextPage`, `totalPages`, etc.

### 2. State Management (`store/post-store.ts`)
- **Added pagination state properties**:
  - `currentPage` - Current page number
  - `hasNextPage` - Whether more posts are available
  - `isLoadingMore` - Loading state for pagination
  - `totalPages` & `totalPosts` - Metadata from server
  
- **New pagination functions**:
  - `fetchPosts(filter, reset)` - Enhanced with pagination support
  - `loadMorePosts(filter)` - Load next page of posts
  - `refreshPosts(filter)` - Reset and fetch from page 1
  
- **Smart post management**:
  - Appends new posts for pagination
  - Replaces posts for refresh operations
  - Maintains proper pagination state

### 3. UI Components
- **Enhanced homepage (`app/(tabs)/index.tsx`)**:
  - Infinite scroll with `onEndReached`
  - Loading states with skeleton components
  - Error handling with retry functionality
  - Smooth transitions between states
  
- **New `LoadMoreButton` component**:
  - Alternative to pure infinite scroll
  - Shows loading state during fetch
  - Displays "No more posts" when at end
  - Accessible and user-friendly

### 4. User Experience Features
- **Multiple loading states**:
  - Initial load skeleton
  - "Load more" loading indicator
  - End-of-list messaging
  
- **Error handling**:
  - Differentiated error messages for initial vs pagination failures
  - Retry functionality
  - Graceful degradation
  
- **Performance optimizations**:
  - Throttled scroll events
  - Optimized rendering with `onEndReachedThreshold`
  - Memory-efficient list management

## How it works:

### Initial Load
1. User opens homepage
2. `refreshPosts()` is called, which sets `reset=true`
3. API fetches page 1 with 10 posts
4. State is updated with posts and pagination info

### Pagination (Infinite Scroll)
1. User scrolls near end of list
2. `onEndReached` triggers `handleLoadMore()`
3. `loadMorePosts()` is called if `hasNextPage` is true
4. API fetches next page
5. New posts are appended to existing list
6. Pagination state is updated

### Pagination (Manual Load More)
1. User sees "Load More Posts" button
2. User taps button
3. Same flow as infinite scroll
4. Button shows loading state during fetch

### Error Handling
1. If API call fails:
   - Error message is displayed
   - Existing posts remain visible
   - User can retry via "Try Again" button
2. Success clears any previous errors

## Configuration
- **Posts per page**: 10 (configurable in store)
- **Scroll threshold**: 0.3 (30% from bottom triggers load)
- **Loading timeout**: Handled by API layer
- **Retry behavior**: Manual retry via UI buttons

## Benefits
- **Better performance**: Load posts incrementally instead of all at once
- **Improved UX**: Smooth scrolling without long initial load times  
- **Memory efficient**: Only loads visible + buffer posts
- **Error resilient**: Graceful handling of network issues
- **Accessible**: Multiple interaction patterns (auto-scroll + manual)
- **Server-friendly**: Reduces server load with smaller requests

## Usage
The pagination is now automatically active. Users can:
- Scroll to automatically load more posts
- Use "Load More" button if they prefer manual control
- Pull to refresh to get latest posts
- See clear loading and end-of-list states

## Notes
- The implementation is backward compatible with existing post functionality
- Community posts are still fetched separately (as per existing logic)
- All existing post operations (like, comment, etc.) continue to work
- Error states preserve user's current posts while showing retry options
