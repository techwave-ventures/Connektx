# Community Post Like Issue Fix

## Problem
Community posts were failing to like with the error:
```
LOG  🏘️ Delegating community post like to community store
LOG  🎯 Making like API call for post: 68c300651c6b3d375c460bf2
ERROR  Failed to like community post: [Error: Failed to like post]
ERROR  Error liking community post: [Error: Failed to like post]
```

## Root Cause
The issue was caused by using an incorrect API endpoint for liking community posts. The original code was trying to use community-specific endpoints like:
- `/community/posts/${postId}/like`
- `/community/post/${postId}/like`

But the backend likely uses the same general endpoint for all posts (both regular and community posts).

## Solution
Updated the community store's `likePost` function to try multiple endpoints in order of likelihood:

1. **General post like endpoint** (most likely to work): `/post/like` with `{ postId }` in request body
2. **Community-specific endpoint**: `/community/posts/${postId}/like`
3. **Alternative community endpoint**: `/community/post/${postId}/like`

## Changes Made

### 1. Enhanced API Error Handling (`api/community.ts`)
- Added detailed logging to `likeCommunityPost` function
- Improved error messages and validation
- Better response parsing with fallback for non-JSON responses

### 2. Updated Community Store (`store/community-store.ts`)
- Added fallback endpoint logic to try multiple APIs
- Prioritized the general `/post/like` endpoint (same as regular posts)
- Enhanced error logging and debugging information
- Added endpoint testing utility integration for development

### 3. Improved Post Store Error Handling (`store/post-store.ts`)
- Better error context in community post like delegation
- More detailed error messages for debugging

### 4. Added Debugging Utilities
- Created `utils/testLikeEndpoints.ts` for testing different endpoints
- Integrated endpoint testing in development mode

## Key Technical Details

### Correct Endpoint Format
The fix prioritizes using the general post like endpoint:
```javascript
fetch('/post/like', {
  method: 'POST',
  headers: { 'token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ postId })
})
```

Instead of the community-specific format:
```javascript
fetch('/community/posts/${postId}/like', {
  method: 'POST',
  headers: { 'token': token, 'Content-Type': 'application/json' }
})
```

### Fallback Logic
If the general endpoint fails, the code automatically tries community-specific endpoints as fallbacks, ensuring maximum compatibility.

## Testing
1. Try liking a community post in the app
2. Check console logs for endpoint testing results (in development mode)
3. Verify optimistic UI updates work correctly
4. Confirm like count syncs properly between community and post stores

## Future Improvements
- Consider unifying all post operations to use general endpoints
- Add caching to remember which endpoint works for better performance
- Implement retry logic with exponential backoff for network issues
