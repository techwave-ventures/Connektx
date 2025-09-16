# Duplicate Key Error Fix

## Problem
React was showing warnings about duplicate keys in the FlatList:
```
ERROR Warning: Encountered two children with the same key, `.$68c300651c6b3d375c460bf2`. Keys should be unique so that components maintain their identity across updates.
```

## Root Cause
The issue was caused by duplicate posts appearing in the posts array due to:

1. **Multiple data sources**: Posts were being fetched from both community feeds and regular post APIs
2. **No deduplication**: The same posts could appear in both sources, leading to duplicates in the final array
3. **Weak key extraction**: The FlatList keyExtractor wasn't handling edge cases properly

## Solutions Implemented

### 1. **Post Deduplication in Store** (`store/post-store.ts`)
Added comprehensive deduplication logic in the `fetchPosts` function:

```javascript
// Remove duplicates by ID (community and regular posts might overlap)
const uniquePosts = allPosts.reduce((acc: any[], post: any) => {
  const existingPost = acc.find(p => p.id === post.id);
  if (!existingPost) {
    acc.push(post);
  } else {
    // If duplicate, prefer community posts (they might have more community context)
    if (post.type === 'community' && existingPost.type !== 'community') {
      const index = acc.findIndex(p => p.id === post.id);
      if (index !== -1) {
        acc[index] = post;
      }
    }
  }
  return acc;
}, []);
```

**Key features:**
- Removes duplicate posts by ID
- Prefers community posts over regular posts when duplicates exist
- Works for both initial loads and pagination

### 2. **Pagination Deduplication**
Enhanced the pagination logic to prevent duplicates when loading more posts:

```javascript
if (reset) {
  finalPosts = sortedPosts;
} else {
  // When appending, also deduplicate against existing posts
  const existingPosts = state.posts || [];
  const newPostsOnly = sortedPosts.filter(newPost => 
    !existingPosts.some(existingPost => existingPost.id === newPost.id)
  );
  finalPosts = [...existingPosts, ...newPostsOnly];
}
```

### 3. **ID Normalization**
Added a helper function to ensure all posts have valid, consistent IDs:

```javascript
function normalizePostId(post: any): string {
  const id = post.id || post._id;
  if (!id) {
    console.warn('Post missing ID, generating fallback:', post);
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return id.toString();
}
```

**Benefits:**
- Handles posts with missing IDs
- Normalizes ID format (string)
- Provides fallback IDs for edge cases

### 4. **Improved FlatList KeyExtractor** (`app/(tabs)/index.tsx`)
Enhanced the key extraction logic to be more robust:

```javascript
keyExtractor={(item, index) => {
  // Ensure unique keys by using ID with fallback to index
  const id = item?.id || item?._id;
  return id ? `post_${id}` : `post_index_${index}_${Date.now()}`;
}}
```

**Features:**
- Uses post ID with `post_` prefix for better debugging
- Falls back to index-based key for edge cases
- Includes timestamp to ensure uniqueness

## How It Works Now

1. **Data Fetching**: Posts are fetched from multiple sources (community + regular APIs)
2. **Initial Deduplication**: Removes duplicates within the fetched data
3. **Preference Logic**: Prefers community posts over regular posts when duplicates exist
4. **State Update**: Only unique posts are added to the store
5. **Pagination**: New pages are deduplicated against existing posts
6. **Rendering**: FlatList uses robust key extraction for stable rendering

## Benefits

✅ **No More Duplicate Keys**: React warnings eliminated  
✅ **Better Performance**: Fewer duplicate posts = less memory usage  
✅ **Stable Rendering**: Consistent keys ensure proper React reconciliation  
✅ **Data Integrity**: Each post appears only once in the feed  
✅ **Robust Edge Cases**: Handles missing IDs and malformed data  
✅ **Debugging Support**: Clear logging for deduplication process  

## Testing

1. ✅ Scroll through posts - no duplicate key warnings
2. ✅ Load more posts - pagination works without duplicates
3. ✅ Switch tabs - no duplicates between Latest/Trending
4. ✅ Create new posts - appear once without duplicates
5. ✅ Community and regular posts - properly deduplicated

## Monitoring

The fix includes logging to monitor deduplication:
- `🔄 Deduplicated X posts to Y unique posts` - Shows deduplication in action
- `🔄 Added X new posts to Y existing posts` - Shows pagination deduplication

Watch these logs to ensure the fix is working as expected.
