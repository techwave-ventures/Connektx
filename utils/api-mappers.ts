// utils/api-mappers.ts
/**
 * Robust API post mapper that handles various API response formats
 */

/**
 * Safely gets ID from various API response formats
 */
export const safeGetId = (apiObject: any): string => {
  if (!apiObject) return '';
  
  // Handle MongoDB ObjectId format
  if (apiObject._id?.$oid) return apiObject._id.$oid;
  
  // Handle regular string IDs
  return apiObject._id || apiObject.id || '';
};

/**
 * Safely gets content/description from various API response formats
 */
export const safeGetContent = (apiObject: any): string => {
  if (!apiObject) return '';
  
  // Handle typo in API (discription vs description)
  return apiObject.content || apiObject.description || apiObject.discription || '';
};

/**
 * Safely gets author information from various API response formats
 */
export const safeGetAuthor = (apiPost: any): any => {
  if (!apiPost) return null;

  // If author object exists, use it
  if (apiPost.author) {
    return {
      id: safeGetId(apiPost.author),
      _id: safeGetId(apiPost.author),
      name: apiPost.author.name || 'Unknown',
      username: apiPost.author.username || (apiPost.author.name || 'user').toLowerCase().replace(/\\s+/g, ''),
      email: apiPost.author.email || '',
      profileImage: apiPost.author.profileImage || apiPost.author.avatar || '',
      avatar: apiPost.author.avatar || apiPost.author.profileImage || '',
      headline: apiPost.author.headline || apiPost.author.bio || '',
    };
  }

  // Handle cases where author info is in different fields
  if (apiPost.UserId || apiPost.userId || apiPost.authorName || apiPost.user) {
    return {
      id: safeGetId({ _id: apiPost.UserId || apiPost.userId || apiPost.user }),
      _id: safeGetId({ _id: apiPost.UserId || apiPost.userId || apiPost.user }),
      name: apiPost.authorName || 'Unknown',
      username: (apiPost.authorName || 'user').toLowerCase().replace(/\\s+/g, ''),
      email: '',
      profileImage: apiPost.authorAvatar || '',
      avatar: apiPost.authorAvatar || '',
      headline: '',
    };
  }

  return null;
};

/**
 * Safely gets likes count from various API response formats
 */
export const safeGetLikesCount = (apiPost: any): number => {
  if (!apiPost) return 0;

  // Handle different like count formats
  if (typeof apiPost.likesCount === 'number') return apiPost.likesCount;
  if (typeof apiPost.likes === 'number') return apiPost.likes;
  if (Array.isArray(apiPost.likes)) return apiPost.likes.length;
  
  return 0;
};

/**
 * Safely gets comments count from various API response formats
 */
export const safeGetCommentsCount = (apiPost: any): number => {
  if (!apiPost) return 0;

  // Handle different comment count formats
  if (typeof apiPost.commentsCount === 'number') return apiPost.commentsCount;
  if (typeof apiPost.comments === 'number') return apiPost.comments;
  if (Array.isArray(apiPost.comments)) return apiPost.comments.length;
  if (Array.isArray(apiPost.commentsList)) return apiPost.commentsList.length;
  
  return 0;
};

/**
 * Safely gets images array from various API response formats
 */
export const safeGetImages = (apiPost: any): string[] => {
  if (!apiPost) return [];
  
  if (Array.isArray(apiPost.images)) return apiPost.images;
  if (typeof apiPost.images === 'string') return [apiPost.images];
  if (typeof apiPost.image === 'string') return [apiPost.image];
  
  return [];
};

/**
 * Determines if user has liked the post
 */
export const safeGetIsLiked = (apiPost: any, userId?: string): boolean => {
  if (!apiPost || !userId) return apiPost?.isLiked || false;

  // Check various like indicators
  if (apiPost.isLiked) return true;
  if (apiPost.likedByCurrentUser) return true;
  if (Array.isArray(apiPost.likes) && apiPost.likes.includes(userId)) return true;
  
  return false;
};

/**
 * Robust community post mapper (Simplified approach)
 */
export const mapApiPostToPost = (apiPost: any, currentUserId?: string): any | null => {
  // Early validation
  if (!apiPost || typeof apiPost !== 'object') {
    console.warn('[API Mapper] Received null or invalid post data:', apiPost);
    return null;
  }

  // Handle both id formats
  const postId = apiPost._id || apiPost.id;
  if (!postId) {
    console.warn('[API Mapper] Post missing valid ID, skipping:', apiPost);
    return null;
  }

  // Determine if this is a community post
  const isCommunityPost = apiPost.type === 'Community' || 
                          apiPost.communityId || 
                          (apiPost.community && apiPost.community.id);

  // Build simplified mapped post
  return {
    id: postId,
    // Handle description typo in API
    content: apiPost.description || apiPost.discription || apiPost.content || '',
    // Handle author - convert UserId/userId/authorName/authorAvatar to author object
    author: (apiPost.UserId || apiPost.userId) ? {
      id: apiPost.UserId || apiPost.userId,
      _id: apiPost.UserId || apiPost.userId,
      name: apiPost.authorName || 'Unknown User',
      username: (apiPost.authorName || 'user').toLowerCase().replace(/\s+/g, ''),
      email: '',
      profileImage: apiPost.authorAvatar || '',
      avatar: apiPost.authorAvatar || '',
      headline: '',
    } : (apiPost.author || null),
    communityId: apiPost.communityId || null,
    createdAt: apiPost.createdAt || new Date().toISOString(),
    type: apiPost.type || 'Community',
    images: Array.isArray(apiPost.images) ? apiPost.images : [],
    likes: typeof apiPost.likes === 'number' ? apiPost.likes : 0,
    comments: typeof apiPost.comments === 'number' ? apiPost.comments : 0,
    reposts: apiPost.reposts || 0,
    isLiked: apiPost.isLiked || false,
    isBookmarked: apiPost.isBookmarked || false,
    isReposted: apiPost.isReposted || false,
    commentsList: Array.isArray(apiPost.commentsList) ? apiPost.commentsList : [],
    originalPost: apiPost.originalPost || null,
    // Community info (will be enriched later if missing)
    community: isCommunityPost ? {
      id: apiPost.communityId || 'unknown',
      name: apiPost.communityName || null,
      logo: apiPost.communityLogo || null,
      isPrivate: apiPost.isPrivate || false,
    } : undefined,
    // Poll data (if present)
    pollOptions: apiPost.pollOptions || undefined,
    totalVotes: apiPost.totalVotes || undefined,
    hasVoted: apiPost.hasVoted || false,
    userVote: apiPost.userVote || undefined,
  };
};
