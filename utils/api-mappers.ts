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

  // Debug author data processing (only log if no author found)
  const hasAnyAuthorData = apiPost.author || apiPost.user || apiPost.userId || apiPost.UserId || apiPost.authorName;
  if (!hasAnyAuthorData) {
    console.log('👤 [API Mapper] No author data found in post:', {
      hasAuthor: !!apiPost.author,
      hasUser: !!apiPost.user,
      hasUserId: !!apiPost.userId,
      hasUserIdCap: !!apiPost.UserId,
      hasAuthorName: !!apiPost.authorName
    });
  }

  // Priority 1: If full author object exists, use it
  if (apiPost.author && typeof apiPost.author === 'object') {
    const author = {
      id: safeGetId(apiPost.author),
      _id: safeGetId(apiPost.author),
      name: apiPost.author.name || apiPost.author.username || 'Unknown User',
      username: apiPost.author.username || (apiPost.author.name || 'user').toLowerCase().replace(/\s+/g, ''),
      email: apiPost.author.email || '',
      profileImage: apiPost.author.profileImage || apiPost.author.avatar || '',
      avatar: apiPost.author.avatar || apiPost.author.profileImage || '',
      headline: apiPost.author.headline || apiPost.author.bio || '',
    };
    console.log('✅ [API Mapper] Using full author object:', author.name);
    return author;
  }

  // Priority 2: If user object exists, use it
  if (apiPost.user && typeof apiPost.user === 'object') {
    const author = {
      id: safeGetId(apiPost.user),
      _id: safeGetId(apiPost.user),
      name: apiPost.user.name || apiPost.user.username || 'Unknown User',
      username: apiPost.user.username || (apiPost.user.name || 'user').toLowerCase().replace(/\s+/g, ''),
      email: apiPost.user.email || '',
      profileImage: apiPost.user.profileImage || apiPost.user.avatar || '',
      avatar: apiPost.user.avatar || apiPost.user.profileImage || '',
      headline: apiPost.user.headline || apiPost.user.bio || '',
    };
    console.log('✅ [API Mapper] Using user object as author:', author.name);
    return author;
  }

  // Priority 3: Handle cases where author info is in separate fields
  if (apiPost.UserId || apiPost.userId || apiPost.authorName) {
    const author = {
      id: apiPost.UserId || apiPost.userId || 'unknown',
      _id: apiPost.UserId || apiPost.userId || 'unknown',
      name: apiPost.authorName || 'Unknown User',
      username: (apiPost.authorName || 'user').toLowerCase().replace(/\s+/g, ''),
      email: '',
      profileImage: apiPost.authorAvatar || '',
      avatar: apiPost.authorAvatar || '',
      headline: '',
    };
    // Only log if we have incomplete data
    if (!apiPost.authorName || !apiPost.authorAvatar) {
      console.log('⚠️ [API Mapper] Using incomplete separate author fields:', author.name);
    }
    return author;
  }

  console.warn('⚠️ [API Mapper] No author data found in post, creating fallback author');
  
  // Create a fallback author using any available data
  return {
    id: apiPost.createdBy || apiPost.ownerId || 'unknown',
    _id: apiPost.createdBy || apiPost.ownerId || 'unknown',
    name: apiPost.ownerName || apiPost.createdByName || 'Unknown User',
    username: (apiPost.ownerName || apiPost.createdByName || 'unknown').toLowerCase().replace(/\s+/g, ''),
    email: '',
    profileImage: '',
    avatar: '',
    headline: '',
  };
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
  
  // Handle various image field names
  if (Array.isArray(apiPost.images)) return apiPost.images;
  if (Array.isArray(apiPost.media)) return apiPost.media;
  if (Array.isArray(apiPost.imageUrls)) return apiPost.imageUrls;
  if (typeof apiPost.images === 'string') return [apiPost.images];
  if (typeof apiPost.image === 'string') return [apiPost.image];
  if (typeof apiPost.media === 'string') return [apiPost.media];
  
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

  // Handle both id formats with enhanced extraction
  let postId = apiPost._id || apiPost.id;
  
  // Handle MongoDB ObjectId format
  if (postId && typeof postId === 'object' && postId.$oid) {
    postId = postId.$oid;
  }
  
  // Generate fallback ID if still missing
  if (!postId || postId === 'undefined' || postId === 'null') {
    postId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.warn(`[API Mapper] Generated fallback ID for post:`, {
      originalId: apiPost._id,
      originalApiId: apiPost.id,
      fallbackId: postId,
      hasContent: !!apiPost.content || !!apiPost.discription
    });
  }

  // Determine if this is a community post
  const isCommunityPost = apiPost.type === 'Community' || 
                          apiPost.communityId || 
                          (apiPost.community && apiPost.community.id);

  console.log('🗺️ [API Mapper] Starting post mapping for:', postId);

  // Get author information using the robust author mapper
  const author = safeGetAuthor(apiPost);
  
  // Build simplified mapped post
  return {
    id: postId,
    // Handle description typo in API
    content: safeGetContent(apiPost),
    // Use the robust author mapper
    author: author,
    communityId: apiPost.communityId || null,
    createdAt: apiPost.createdAt || new Date().toISOString(),
    type: apiPost.type || 'Community',
    images: safeGetImages(apiPost),
    likes: safeGetLikesCount(apiPost),
    comments: safeGetCommentsCount(apiPost),
    reposts: apiPost.reposts || 0,
    isLiked: safeGetIsLiked(apiPost),
    isBookmarked: apiPost.isBookmarked || false,
    isReposted: apiPost.isReposted || false,
    commentsList: Array.isArray(apiPost.commentsList) ? apiPost.commentsList : [],
    originalPost: apiPost.originalPost || null,
    // Community info (will be enriched later if missing)
    community: isCommunityPost ? (() => {
      const hasValidName = apiPost.communityName && apiPost.communityName !== 'null' && apiPost.communityName.trim() !== '';
      if (!hasValidName) {
        console.log(`⚠️ [API Mapper] Using fallback community name for post ${postId}:`, {
          communityName: apiPost.communityName,
          communityId: apiPost.communityId,
          type: typeof apiPost.communityName
        });
      }
      return {
        id: apiPost.communityId || 'unknown',
        name: hasValidName ? apiPost.communityName : 'Community',
        logo: apiPost.communityLogo || null,
        isPrivate: apiPost.isPrivate || false,
      };
    })() : undefined,
    // Poll data (if present)
    pollOptions: apiPost.pollOptions || undefined,
    totalVotes: apiPost.totalVotes || undefined,
    hasVoted: apiPost.hasVoted || false,
    userVote: apiPost.userVote || undefined,
  };
};
