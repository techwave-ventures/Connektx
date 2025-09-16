// api/showcase.ts

import { API_BASE } from './user';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ShowcaseCommentRequest {
  showcaseId: string;
  text: string;
}

export interface ShowcaseComment {
  _id: string;
  id: string;
  text: string;
  content: string;
  user: {
    _id: string;
    id: string;
    name: string;
    profileImage: string;
    avatar: string;
  };
  author: {
    _id: string;
    id: string;
    name: string;
    profileImage: string;
    avatar: string;
  };
  createdAt: string;
  isLiked?: boolean;
  likesCount?: number;
  likes?: number;
  replies?: ShowcaseComment[];
}

export interface ShowcaseCommentResponse {
  success: boolean;
  message: string;
  body?: ShowcaseComment[] | ShowcaseComment;
  data?: ShowcaseComment[] | ShowcaseComment;
}

/**
 * Adds a comment to a showcase
 * Falls back to local storage if backend endpoints are not available
 */
export async function addCommentToShowcase(
  token: string,
  showcaseId: string,
  text: string
): Promise<ShowcaseCommentResponse> {
  console.log('🚀 [API] addCommentToShowcase called with:', { showcaseId, text, tokenExists: !!token });
  
  // Try multiple endpoints based on backend patterns
  const endpointConfigs = [
    // Pattern 1: User namespace (like story comments: POST /user/story/comment)
    {
      url: `${API_BASE}/user/showcase/comment`,
      body: { showcaseId, text },
      description: 'user namespace pattern'
    },
    // Pattern 2: Direct showcase endpoint as specified
    {
      url: `${API_BASE}/showcase/comment`,
      body: { showcaseId, text },
      description: 'direct showcase pattern'
    }
  ];
  
  let lastError;
  
  for (const config of endpointConfigs) {
    try {
      console.log(`📡 [API] Trying ${config.description}: ${config.url}`);
      console.log('📡 [API] Request body:', JSON.stringify(config.body, null, 2));
      
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
        body: JSON.stringify(config.body),
      });

      console.log(`📝 [API] Response status for ${config.description}:`, response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 [API] addCommentToShowcase SUCCESS with', config.description, ':', JSON.stringify(data, null, 2));
        
        return {
          success: true,
          message: 'Comment added successfully',
          body: data.body || data.comment || data,
          data: data.body || data.comment || data,
        };
      } else if (response.status !== 404) {
        const errorText = await response.text();
        lastError = new Error(`${config.description}: ${errorText}`);
        console.error(`❌ [API] ${config.description} failed:`, errorText);
      }
    } catch (error) {
      console.error(`❌ [API] ${config.description} threw error:`, error);
      lastError = error;
      continue;
    }
  }
  
  // Backend endpoints failed - use local storage fallback
  console.log('📝 [API] Backend endpoints failed, using local storage fallback');
  return await addCommentToShowcaseLocal(token, showcaseId, text);
}

/**
 * Gets comments for a specific showcase
 * Tries both user namespace and direct showcase endpoints
 */
export async function getShowcaseComments(
  showcaseId: string,
  token?: string
): Promise<ShowcaseCommentResponse> {
  console.log('🚀 [API] getShowcaseComments called with:', { showcaseId, tokenExists: !!token });
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['token'] = token;
  }
  
  // Try multiple endpoints based on backend patterns
  const endpoints = [
    // Pattern 1: User namespace (like story comments: GET /user/story/{storyId}/comments)
    {
      url: `${API_BASE}/user/showcase/${showcaseId}/comments`,
      description: 'user namespace pattern'
    },
    // Pattern 2: Direct showcase endpoint as specified
    {
      url: `${API_BASE}/showcase/comment/${showcaseId}`,
      description: 'direct showcase pattern'
    }
  ];
  
  let lastError;
  
  for (const config of endpoints) {
    try {
      console.log(`📡 [API] Trying ${config.description}: ${config.url}`);
      
      const response = await fetch(config.url, {
        method: 'GET',
        headers,
      });

      console.log(`📝 [API] Response status for ${config.description}:`, response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📦 [API] getShowcaseComments SUCCESS with', config.description, ':', JSON.stringify(data, null, 2));
        
        const comments = data.body || data.comments || data || [];
        console.log('✅ [API] getShowcaseComments returning:', Array.isArray(comments) ? `${comments.length} comments` : 'Non-array result');
        
        return {
          success: true,
          message: 'Comments fetched successfully',
          body: comments,
          data: comments,
        };
      } else if (response.status !== 404) {
        const errorText = await response.text();
        lastError = new Error(`${config.description}: ${errorText}`);
        console.error(`❌ [API] ${config.description} failed:`, errorText);
      }
    } catch (error) {
      console.error(`❌ [API] ${config.description} threw error:`, error);
      lastError = error;
      continue;
    }
  }
  
  // Backend endpoints failed - use local storage fallback
  console.log('📝 [API] Backend endpoints failed, using local storage fallback');
  return await getShowcaseCommentsLocal(showcaseId);
}

/**
 * Likes a showcase comment
 * Endpoint: PUT /showcase/comment/{commentId}/like
 */
export async function likeShowcaseComment(
  token: string,
  commentId: string,
  showcaseId: string
): Promise<ShowcaseCommentResponse> {
  try {
    console.log('🚀 [API] likeShowcaseComment called with:', { commentId, showcaseId, tokenExists: !!token });
    
    // Try multiple endpoint formats that might be available
    const endpoints = [
      `${API_BASE}/showcase/comment/${commentId}/like`,
      `${API_BASE}/showcase/${showcaseId}/comment/${commentId}/like`,
      `${API_BASE}/showcase/comment/like`,
    ];
    
    let lastError;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`📡 [API] Trying endpoint: ${endpoint}`);
        
        const requestBody = endpoint.includes('/comment/like') && !endpoint.includes(commentId) 
          ? { commentId, showcaseId } 
          : {};
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'token': token,
          },
          body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
        });

        console.log(`📝 [API] Response status for ${endpoint}:`, response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [API] likeShowcaseComment success:', data);
          
          return {
            success: true,
            message: 'Comment liked successfully',
            body: data.body || data.comment || data,
            data: data.body || data.comment || data,
          };
        } else if (response.status !== 404) {
          const errorText = await response.text();
          lastError = new Error(errorText || 'Failed to like comment');
        }
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    
    throw lastError || new Error('All like endpoints failed');
    
  } catch (error) {
    console.error('❌ [API] Error liking showcase comment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to like showcase comment',
    };
  }
}

/**
 * Replies to a showcase comment
 * Endpoint: POST /showcase/replyToComment
 * Body: { showcaseId, commentId, content }
 */
export async function replyToShowcaseComment(
  token: string,
  commentId: string,
  showcaseId: string,
  text: string
): Promise<ShowcaseCommentResponse> {
  console.log('🚀 [API] replyToShowcaseComment called with:', { commentId, showcaseId, text, tokenExists: !!token });
  
  // Try the main endpoint and fallback patterns
  const endpointConfigs = [
    // Pattern 1: Your specified endpoint
    {
      url: `${API_BASE}/showcase/replyToComment`,
      body: { showcaseId, commentId, content: text },
      description: 'main replyToComment endpoint'
    },
    // Pattern 2: Alternative patterns
    {
      url: `${API_BASE}/user/showcase/replyToComment`,
      body: { showcaseId, commentId, content: text },
      description: 'user namespace pattern'
    },
    {
      url: `${API_BASE}/showcase/comment/${commentId}/reply`,
      body: { text, content: text, showcaseId },
      description: 'nested endpoint pattern'
    }
  ];
  
  let lastError;
  
  for (const config of endpointConfigs) {
    try {
      console.log(`📡 [API] Trying ${config.description}: ${config.url}`);
      console.log('📡 [API] Request body:', JSON.stringify(config.body, null, 2));
      
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        },
        body: JSON.stringify(config.body),
      });

      console.log(`📝 [API] Reply response status for ${config.description}:`, response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [API] replyToShowcaseComment SUCCESS with', config.description, ':', JSON.stringify(data, null, 2));
        
        return {
          success: true,
          message: 'Reply added successfully',
          body: data.body || data.comment || data.reply || data,
          data: data.body || data.comment || data.reply || data,
        };
      } else if (response.status !== 404) {
        const errorText = await response.text();
        lastError = new Error(`${config.description}: ${errorText}`);
        console.error(`❌ [API] ${config.description} failed:`, errorText);
      }
    } catch (error) {
      console.error(`❌ [API] ${config.description} threw error:`, error);
      lastError = error;
      continue;
    }
  }
  
  // Backend endpoints failed - use local storage fallback
  console.log('📝 [API] Backend endpoints failed, using local storage fallback for reply');
  return await replyToShowcaseCommentLocal(token, commentId, showcaseId, text);
}

/**
 * Gets comments made by a specific user across all showcases
 * Endpoint: POST /showcase/comment/getUser
 */
export async function getUserShowcaseComments(
  token: string, 
  userId: string
): Promise<ShowcaseCommentResponse> {
  try {
    console.log('🚀 [API] getUserShowcaseComments called with:', { userId, tokenExists: !!token });
    
    const requestBody = { userId };
    console.log('📡 [API] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE}/showcase/comment/getUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📝 [API] getUserShowcaseComments response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Failed to fetch user showcase comments:', errorText);
      throw new Error(errorText || 'Failed to fetch user showcase comments');
    }

    const data = await response.json();
    console.log('📦 [API] getUserShowcaseComments raw response data:', JSON.stringify(data, null, 2));
    
    const result = data.body || data.comments || data || [];
    console.log('✅ [API] getUserShowcaseComments returning:', Array.isArray(result) ? `${result.length} comments` : 'Non-array result');
    
    return {
      success: true,
      message: 'User showcase comments fetched successfully',
      body: result,
      data: result,
    };
  } catch (error) {
    console.error('❌ [API] Error fetching user showcase comments:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch user showcase comments',
      body: [],
      data: [],
    };
  }
}

/**
 * Normalizes a comment object to ensure consistent field names
 */
export function normalizeShowcaseComment(comment: any): ShowcaseComment {
  // Try to get the best available user data
  const userData = comment.user || comment.author;
  const authorData = comment.author || comment.user;
  
  const normalizedAuthor = {
    _id: userData?._id || userData?.id || authorData?._id || authorData?.id || '',
    id: userData?.id || userData?._id || authorData?.id || authorData?._id || '',
    name: userData?.name || authorData?.name || userData?.username || authorData?.username || 'User',
    profileImage: userData?.profileImage || userData?.avatar || authorData?.profileImage || authorData?.avatar || '',
    avatar: userData?.avatar || userData?.profileImage || authorData?.avatar || authorData?.profileImage || '',
    username: userData?.username || authorData?.username || userData?.name || authorData?.name || '',
  };

  // Process replies recursively
  let processedReplies: ShowcaseComment[] = [];
  if (comment.replies) {
    if (Array.isArray(comment.replies)) {
      processedReplies = comment.replies.map((reply: any) => {
        return normalizeShowcaseComment(reply);
      });
    }
  }
  
  const normalized = {
    _id: comment._id || comment.id || '',
    id: comment.id || comment._id || '',
    text: comment.text || comment.content || '',
    content: comment.content || comment.text || '',
    user: normalizedAuthor,
    author: normalizedAuthor,
    createdAt: comment.createdAt || comment.created || new Date().toISOString(),
    isLiked: Boolean(comment.isLiked || comment.liked || false),
    likesCount: comment.likesCount || comment.likes || 0,
    likes: comment.likes || comment.likesCount || 0,
    replies: processedReplies,
  };
  
  return normalized;
}

/**
 * Normalizes an array of comments
 */
export function normalizeShowcaseComments(comments: any[]): ShowcaseComment[] {
  if (!Array.isArray(comments)) {
    return [];
  }
  
  return comments.map(normalizeShowcaseComment);
}

// ==================== LOCAL STORAGE FALLBACK FUNCTIONS ====================

/**
 * Local storage fallback for adding comments when backend is not available
 */
export async function addCommentToShowcaseLocal(
  token: string,
  showcaseId: string,
  text: string
): Promise<ShowcaseCommentResponse> {
  try {
    console.log('📝 [LOCAL] Adding comment to local storage');
    
    // Get current user info from auth store
    const { user } = require('@/store/auth-store').useAuthStore.getState();
    
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }
    
    // Create new comment
    const newComment: ShowcaseComment = {
      _id: `local_${Date.now()}`,
      id: `local_${Date.now()}`,
      text,
      content: text,
      user: {
        _id: user.id || user._id,
        id: user.id || user._id,
        name: user.name || user.username || 'Anonymous',
        profileImage: user.avatar || user.profileImage || '',
        avatar: user.avatar || user.profileImage || '',
      },
      author: {
        _id: user.id || user._id,
        id: user.id || user._id,
        name: user.name || user.username || 'Anonymous',
        profileImage: user.avatar || user.profileImage || '',
        avatar: user.avatar || user.profileImage || '',
      },
      createdAt: new Date().toISOString(),
      isLiked: false,
      likesCount: 0,
      likes: 0,
      replies: []
    };
    
    // Get existing comments from local storage
    const storageKey = `showcase_comments_${showcaseId}`;
    const existingComments = await AsyncStorage.getItem(storageKey);
    const comments = existingComments ? JSON.parse(existingComments) : [];
    
    // Add new comment to the beginning for newest-first ordering
    comments.unshift(newComment);
    
    // Save back to local storage
    await AsyncStorage.setItem(storageKey, JSON.stringify(comments));
    
    console.log('✅ [LOCAL] Comment added to local storage successfully');
    
    return {
      success: true,
      message: 'Comment added successfully (stored locally)',
      body: newComment,
      data: newComment
    };
  } catch (error) {
    console.error('❌ [LOCAL] Error adding comment to local storage:', error);
    return {
      success: false,
      message: 'Failed to save comment locally'
    };
  }
}

/**
 * Local storage fallback for getting comments when backend is not available
 */
export async function getShowcaseCommentsLocal(
  showcaseId: string
): Promise<ShowcaseCommentResponse> {
  try {
    console.log('📝 [LOCAL] Getting comments from local storage');
    
    const storageKey = `showcase_comments_${showcaseId}`;
    const existingComments = await AsyncStorage.getItem(storageKey);
    const comments = existingComments ? JSON.parse(existingComments) : [];
    
    console.log(`✅ [LOCAL] Retrieved ${comments.length} comments from local storage`);
    
    return {
      success: true,
      message: 'Comments loaded from local storage',
      body: comments,
      data: comments
    };
  } catch (error) {
    console.error('❌ [LOCAL] Error getting comments from local storage:', error);
    return {
      success: false,
      message: 'Failed to load comments from local storage',
      body: [],
      data: []
    };
  }
}

/**
 * Local storage fallback for replying to comments when backend is not available
 */
export async function replyToShowcaseCommentLocal(
  token: string,
  commentId: string,
  showcaseId: string,
  text: string
): Promise<ShowcaseCommentResponse> {
  try {
    console.log('📝 [LOCAL] Adding reply to local storage');
    
    // Get current user info from auth store
    const { user } = require('@/store/auth-store').useAuthStore.getState();
    
    if (!user) {
      return {
        success: false,
        message: 'User not authenticated'
      };
    }
    
    // Create new reply
    const newReply: ShowcaseComment = {
      _id: `local_reply_${Date.now()}`,
      id: `local_reply_${Date.now()}`,
      text,
      content: text,
      user: {
        _id: user.id || user._id,
        id: user.id || user._id,
        name: user.name || user.username || 'Anonymous',
        profileImage: user.avatar || user.profileImage || '',
        avatar: user.avatar || user.profileImage || '',
      },
      author: {
        _id: user.id || user._id,
        id: user.id || user._id,
        name: user.name || user.username || 'Anonymous',
        profileImage: user.avatar || user.profileImage || '',
        avatar: user.avatar || user.profileImage || '',
      },
      createdAt: new Date().toISOString(),
      isLiked: false,
      likesCount: 0,
      likes: 0,
      replies: []
    };
    
    // Get existing comments from local storage
    const storageKey = `showcase_comments_${showcaseId}`;
    const existingComments = await AsyncStorage.getItem(storageKey);
    const comments = existingComments ? JSON.parse(existingComments) : [];
    
    // Find the comment to reply to and add the reply
    let replyAdded = false;
    const updateComments = (commentsList: ShowcaseComment[]): ShowcaseComment[] => {
      return commentsList.map(comment => {
        if (comment.id === commentId || comment._id === commentId) {
          // Found the comment to reply to
          replyAdded = true;
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply]
          };
        } else if (comment.replies && comment.replies.length > 0) {
          // Check nested replies
          return {
            ...comment,
            replies: updateComments(comment.replies)
          };
        }
        return comment;
      });
    };
    
    const updatedComments = updateComments(comments);
    
    if (!replyAdded) {
      return {
        success: false,
        message: 'Parent comment not found'
      };
    }
    
    // Save back to local storage
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedComments));
    
    console.log('✅ [LOCAL] Reply added to local storage successfully');
    
    return {
      success: true,
      message: 'Reply added successfully (stored locally)',
      body: newReply,
      data: newReply
    };
  } catch (error) {
    console.error('❌ [LOCAL] Error adding reply to local storage:', error);
    return {
      success: false,
      message: 'Failed to save reply locally'
    };
  }
}
