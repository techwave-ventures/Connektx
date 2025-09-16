# Homepage Auto-Refresh Issue Fix

## Problem
The homepage was automatically refreshing every time you returned from creating a post, causing:
- Unnecessary API calls
- Loading states
- Poor user experience
- Potential loss of scroll position

## Root Cause
The `useFocusEffect` hook in the homepage component was designed to refresh posts whenever the screen came into focus, including after post creation:

```javascript
// Refresh posts when screen comes into focus (e.g., after creating a post)
useFocusEffect(
  useCallback(() => {
    if (token && posts.length > 0) {
      console.log('🔄 Home screen focused, refreshing posts...');
      refreshPosts(activeTab as 'latest' | 'trending'); // <- Causes full refresh
    }
  }, [token, activeTab, refreshPosts, posts.length])
);
```

## Solutions Implemented

### ✅ **Solution: Disabled Auto-Refresh (Recommended)**

**Why this works best:**
1. **Post store already handles new posts**: When you create a post, the `createPost` function in the post store automatically adds it to the beginning of the posts array
2. **No refresh needed**: The new post appears immediately in the feed without requiring an API call
3. **Better UX**: No loading states or interruptions
4. **Manual refresh available**: Users can still pull-to-refresh if they want to get latest posts

**What changed:**
- Commented out the `useFocusEffect` that was causing automatic refreshes
- Added clear documentation explaining why it's disabled
- Preserved manual refresh functionality via pull-to-refresh

### 🔄 **Alternative Solutions Available**

If you need the focus refresh for other scenarios, here are alternatives:

#### **Smart Refresh with Timing**
```javascript
const [lastPostCreatedAt, setLastPostCreatedAt] = useState<number | null>(null);

// Skip refresh if we just created a post in the last 10 seconds
if (timeSinceLastPost && timeSinceLastPost < 10000) {
  console.log('⏭️ Skipping refresh - recently created a post');
  return;
}
```

#### **Event-Based Refresh**
Use post store events to determine when refresh is actually needed.

## How It Works Now

1. **Creating a Post:**
   - User taps the create post button
   - Goes to post creation screen
   - Creates post successfully
   - Post store automatically adds the new post to the feed
   - User returns to homepage and sees their new post immediately

2. **Manual Refresh:**
   - User can pull down to refresh if they want latest posts
   - Pagination still works for loading more posts

3. **Tab Changes:**
   - Switching between "Latest" and "Trending" tabs still refreshes appropriately

## Benefits

✅ **Better Performance**: No unnecessary API calls  
✅ **Smoother UX**: No loading states when returning from post creation  
✅ **Immediate Feedback**: New posts appear instantly  
✅ **Preserved Functionality**: Manual refresh and pagination still work  
✅ **Reduced Server Load**: Fewer redundant API requests  

## Testing

1. Create a new post
2. Return to homepage
3. Verify your new post appears at the top without a loading state
4. Verify pull-to-refresh still works
5. Verify tab switching between Latest/Trending still refreshes appropriately

## Future Considerations

If you need selective refresh behavior in the future:
- Could implement post creation events
- Could add smart refresh timing
- Could use navigation events to determine refresh necessity
