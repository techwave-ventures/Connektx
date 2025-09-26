// Community API - Direct backend integration only
import { safeSplit } from '../utils/safeSplit';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';


export interface CreateCommunityData {
  name: string;
  description: string;
  coverImage?: string;
  logo?: string;
  tags?: string[];
  location?: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  createdBy?: string;
  settings?: {
    allowMemberPosts?: boolean;
    allowMemberEvents?: boolean;
    autoApproveJoins?: boolean;
    allowExternalSharing?: boolean;
    moderationLevel?: 'low' | 'medium' | 'high';
    welcomeMessage?: string;
  };
}

export interface CreatePostData {
  discription: string; // Note: Backend uses misspelled 'discription'
  images?: string[];
  type?: 'text' | 'question' | 'poll' | 'resource';
  resourceUrl?: string;
  resourceType?: 'pdf' | 'link' | 'video' | 'document';
  pollOptions?: any[]; // Will need to determine exact structure from backend
}


// ================================
// COMMUNITY OPERATIONS
// ================================

export const createCommunity = async (token: string, communityData: CreateCommunityData) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Authentication token is required to create a community');
  }

  if (!communityData.name?.trim()) {
    throw new Error('Community name is required');
  }

  if (!communityData.description?.trim()) {
    throw new Error('Community description is required');
  }

  try {
    // Create FormData for proper file upload handling
    const formData = new FormData();
    
    // Add basic text fields
    formData.append('name', communityData.name.trim());
    formData.append('description', communityData.description.trim());
    formData.append('isPrivate', String(!!communityData.isPrivate));
    formData.append('requiresApproval', String(communityData.requiresApproval ?? false));

    // Handle tags array
    if (communityData.tags && communityData.tags.length > 0) {
      const tags = Array.isArray(communityData.tags)
        ? communityData.tags
        : typeof communityData.tags === 'string'
          ? safeSplit(communityData.tags, ',')
          : [];
      
      // Send tags as JSON string since FormData doesn't handle arrays well
      formData.append('tags', JSON.stringify(tags.filter(tag => tag.trim())));
    }

    // Handle location
    if (communityData.location && communityData.location.trim() !== '') {
      formData.append('location', communityData.location.trim());
    }

    // Handle logo file upload
    if (communityData.logo && communityData.logo.trim() !== '') {
      const logoUri = communityData.logo.trim();
      
      // Check if it's a local file URI that needs to be uploaded
      if (logoUri.startsWith('file://') || logoUri.startsWith('content://')) {
        try {
          // Get file info for proper upload
          const logoFileName = `logo_${Date.now()}.jpg`;
          const logoFile = {
            uri: logoUri,
            name: logoFileName,
            type: 'image/jpeg', // Default to JPEG, could be enhanced to detect actual type
          } as any;
          
          formData.append('logo', logoFile);
        } catch (logoError) {
          // Skip logo if processing fails
        }
      } else {
        // It's already a URL, send as text
        formData.append('logo', logoUri);
      }
    }

    // Handle cover image file upload
    if (communityData.coverImage && communityData.coverImage.trim() !== '') {
      const coverUri = communityData.coverImage.trim();
      
      // Check if it's a local file URI that needs to be uploaded
      if (coverUri.startsWith('file://') || coverUri.startsWith('content://')) {
        try {
          // Get file info for proper upload
          const coverFileName = `cover_${Date.now()}.jpg`;
          const coverFile = {
            uri: coverUri,
            name: coverFileName,
            type: 'image/jpeg', // Default to JPEG, could be enhanced to detect actual type
          } as any;
          
          formData.append('coverImage', coverFile);
        } catch (coverError) {
          // Skip cover image if processing fails
        }
      } else {
        // It's already a URL, send as text
        formData.append('coverImage', coverUri);
      }
    }

    const response = await fetch(`${API_BASE_URL}/community`, {
      method: 'POST',
      headers: {
        'token': token,
        // Don't set Content-Type for FormData - let the browser set it with boundary
      },
      body: formData
    });

    const responseText = await response.text();
    
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      // Provide more detailed error message
      const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`Failed to create community: ${errorMessage}`);
    }
    
    return data;
    
  } catch (error: any) {
    // Check if this is a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    
    // Re-throw the original error with more context
    throw error;
  }
};

export const getAllCommunities = async (token?: string, filters?: {
  search?: string;
  filter?: 'all' | 'joined' | 'public' | 'private' | 'trending';
  page?: number;
  limit?: number;
  sortBy?: 'lastActivity' | 'memberCount' | 'newest' | 'name';
}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.filter) queryParams.append('filter', filters.filter);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.sortBy) queryParams.append('sortBy', filters.sortBy);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token && typeof token === 'string' && token.trim() !== '') {
      headers['token'] = token;
    }

    const response = await fetch(`${API_BASE_URL}/community?${queryParams}`, {
      method: 'GET',
      headers,
    });

    let data: any;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
};

export const getCommunityById = async (token: string, communityId: string) => {
  const response = await fetch(`${API_BASE_URL}/community/${communityId}`, {
    method: 'GET',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch community');
  }

  return data;
};

export const updateCommunity = async (token: string, communityId: string, updates: Partial<CreateCommunityData>) => {
  // Create FormData instead of JSON payload
  const formData = new FormData();
  
  if (updates.name?.trim()) {
    formData.append('name', updates.name.trim());
  }
  if (updates.description?.trim()) {
    formData.append('description', updates.description.trim());
  }
  if (updates.isPrivate !== undefined) {
    formData.append('isPrivate', String(!!updates.isPrivate));
  }
  if (updates.requiresApproval !== undefined) {
    formData.append('requiresApproval', String(!!updates.requiresApproval));
  }
  if (updates.logo?.trim()) {
    formData.append('logo', updates.logo.trim());
  }
  if (updates.coverImage?.trim()) {
    formData.append('coverImage', updates.coverImage.trim());
  }
  if (updates.location?.trim()) {
    formData.append('location', updates.location.trim());
  }
  if (updates.tags && updates.tags.length > 0) {
    const tags = Array.isArray(updates.tags)
      ? updates.tags
      : typeof updates.tags === 'string'
        ? safeSplit(updates.tags, ',')
        : [];
    
    // Append each tag individually for FormData
    tags.forEach(tag => {
      if (tag.trim()) {
        formData.append('tags', tag.trim());
      }
    });
  }
  if (updates.settings) {
    // For settings object, we need to send each property individually
    if (updates.settings.allowMemberPosts !== undefined) {
      formData.append('allowMemberPosts', String(!!updates.settings.allowMemberPosts));
    }
    if (updates.settings.allowMemberEvents !== undefined) {
      formData.append('allowMemberEvents', String(!!updates.settings.allowMemberEvents));
    }
    if (updates.settings.autoApproveJoins !== undefined) {
      formData.append('autoApproveJoins', String(!!updates.settings.autoApproveJoins));
    }
    if (updates.settings.allowExternalSharing !== undefined) {
      formData.append('allowExternalSharing', String(!!updates.settings.allowExternalSharing));
    }
    if (updates.settings.moderationLevel) {
      formData.append('moderationLevel', updates.settings.moderationLevel);
    }
    if (updates.settings.welcomeMessage?.trim()) {
      formData.append('welcomeMessage', updates.settings.welcomeMessage.trim());
    }
  }

  const response = await fetch(`${API_BASE_URL}/community/${communityId}`, {
    method: 'PUT',
    headers: {
      'token': token,
      // Remove 'Content-Type' header to let the browser set it automatically for FormData
    },
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update community');
  }

  return data;
};

export const deleteCommunity = async (token: string, communityId: string) => {
  const response = await fetch(`${API_BASE_URL}/community/${communityId}`, {
    method: 'DELETE',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete community');
  }

  return data;
};

// ================================
// MEMBERSHIP OPERATIONS
// ================================

export const joinCommunity = async (token: string, communityId: string, message?: string) => {
  try {
    const requestBody = message?.trim() ? { message: message.trim() } : {};
    
    const response = await fetch(`${API_BASE_URL}/community/${communityId}/join`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseText = await response.text();
    
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      let errorMessage = data.message || 'Failed to join community';
      
      // Handle specific backend errors more gracefully
      if (response.status === 401) {
        if (errorMessage.includes('Tokine') || errorMessage.includes('Token')) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else {
          errorMessage = 'Unauthorized: ' + errorMessage;
        }
      } else if (response.status === 500) {
        if (errorMessage.includes('Cannot read properties of undefined')) {
          errorMessage = 'Server configuration error. Please contact support or try again later.';
        } else {
          errorMessage = 'Server error: ' + errorMessage;
        }
      } else if (response.status === 400) {
        errorMessage = 'Invalid request: ' + errorMessage;
      } else if (response.status === 404) {
        errorMessage = 'Community not found or has been deleted.';
      }
      
      throw new Error(errorMessage);
    }
    
    return data;
    
  } catch (error: any) {
    // Check if this is actually a network/connection error
    if (error instanceof TypeError && 
        (error.message.includes('fetch') || 
         error.message.includes('Failed to fetch') ||
         error.message.includes('Network request failed') ||
         error.message.includes('ERR_NETWORK') ||
         error.message.includes('ERR_INTERNET_DISCONNECTED'))) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    
    // If it's already a proper error message from the API handling above, re-throw as-is
    throw error;
  }
};

export const leaveCommunity = async (token: string, communityId: string) => {
  const response = await fetch(`${API_BASE_URL}/community/${communityId}/leave`, {
    method: 'POST',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to leave community');
  }

  return data;
};

export const getUserCommunities = async (token: string) => {
  try {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Invalid or missing authentication token');
    }

    const response = await fetch(`${API_BASE_URL}/community/user`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });
    
    let data: any;
    const responseText = await response.text();
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
};

// ================================
// COMMUNITY POST OPERATIONS
// ================================

// Helper function for getting file information
function getFileInfo(uri: string) {
  // Find last dot and slash
  let lastDotIndex = -1;
  let lastSlashIndex = -1;
  
  for (let i = uri.length - 1; i >= 0; i--) {
    if (uri[i] === '.' && lastDotIndex === -1) {
      lastDotIndex = i;
    }
    if ((uri[i] === '/' || uri[i] === '\\') && lastSlashIndex === -1) {
      lastSlashIndex = i;
    }
  }
  
  const filename = lastSlashIndex !== -1 ? uri.substring(lastSlashIndex + 1) : uri;
  const extension = lastDotIndex !== -1 ? uri.substring(lastDotIndex + 1).toLowerCase() : 'jpg';
  
  let mimeType = 'image/jpeg';
  switch (extension) {
    case 'png': mimeType = 'image/png'; break;
    case 'gif': mimeType = 'image/gif'; break;
    case 'webp': mimeType = 'image/webp'; break;
    case 'heic': mimeType = 'image/heic'; break;
  }
  
  return { filename: filename || `image_${Date.now()}.jpg`, mimeType };
}

export const createCommunityPostWithFiles = async (token: string, communityId: string, postData: CreatePostData & { imageUris?: string[] }) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Authentication token is required to create a post');
  }

  if (!postData.discription) {
    throw new Error('Post content (discription) is required');
  }

  const url = `${API_BASE_URL}/community/${communityId}/posts`;

  try {
    const formData = new FormData();
    
    formData.append('discription', postData.discription);
    
    if (postData.type) {
      formData.append('type', postData.type);
    }
    
    // Handle image files properly
    if (postData.imageUris && postData.imageUris.length > 0) {
      postData.imageUris.forEach((uri, index) => {
        const { filename, mimeType } = getFileInfo(uri);
        
        formData.append('images', {
          uri,
          name: filename,
          type: mimeType,
        } as any);
      });
    }
    
    if (postData.resourceUrl) {
      formData.append('resourceUrl', postData.resourceUrl);
    }
    
    if (postData.resourceType) {
      formData.append('resourceType', postData.resourceType);
    }
    
    if (postData.pollOptions && postData.pollOptions.length > 0) {
      postData.pollOptions.forEach((option, index) => {
        formData.append('pollOptions', typeof option === 'string' ? option : JSON.stringify(option));
      });
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'token': token,
        // Don't set Content-Type for FormData - let browser handle it
      },
      body: formData,
    });

    let data: any;
    const responseText = await response.text();

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const createCommunityPost = async (token: string, communityId: string, postData: CreatePostData) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Authentication token is required to create a post');
  }

  if (!postData.discription) {
    throw new Error('Post content (discription) is required');
  }

  const url = `${API_BASE_URL}/community/${communityId}/posts`;

  try {
    // Create FormData instead of JSON payload
    const formData = new FormData();
    
    formData.append('discription', postData.discription);
    
    if (postData.type) {
      formData.append('type', postData.type);
    }
    
    if (postData.images && postData.images.length > 0) {
      postData.images.forEach((image, index) => {
        formData.append('images', image);
      });
    }
    
    if (postData.resourceUrl) {
      formData.append('resourceUrl', postData.resourceUrl);
    }
    
    if (postData.resourceType) {
      formData.append('resourceType', postData.resourceType);
    }
    
    if (postData.pollOptions && postData.pollOptions.length > 0) {
      postData.pollOptions.forEach((option, index) => {
        formData.append('pollOptions', typeof option === 'string' ? option : JSON.stringify(option));
      });
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'token': token,
        // Remove 'Content-Type' header to let the browser set it automatically for FormData
      },
      body: formData,
    });

    let data: any;
    const responseText = await response.text();

    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const getCommunityPosts = async (token: string, communityId: string, filters?: {
  type?: 'all' | 'posts' | 'questions';
  sortBy?: 'best' | 'new' | 'top';
  page?: number;
  limit?: number;
}) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Authentication token is required to fetch community posts');
  }
  
  if (!communityId || typeof communityId !== 'string' || communityId.trim() === '') {
    throw new Error('Community ID is required to fetch posts');
  }

  const queryParams = new URLSearchParams();
  
  if (filters?.type) queryParams.append('type', filters.type);
  if (filters?.sortBy) queryParams.append('sortBy', filters.sortBy);
  if (filters?.page) queryParams.append('page', filters.page.toString());
  if (filters?.limit) queryParams.append('limit', filters.limit.toString());

  const url = `${API_BASE_URL}/community/${communityId}/posts?${queryParams}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token.trim(),
        'Content-Type': 'application/json',
      },
    });

    let data: any;
    const responseText = await response.text();

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      throw new Error(`Invalid JSON response from community posts API: ${responseText.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      // Check for the specific schema populate error
      if (data?.error && data.error.includes('Cannot populate path `comments.authorId`')) {
        // Return a valid but empty response instead of throwing
        return { success: true, posts: [] };
      }
      
      throw new Error(data?.message || `HTTP ${response.status}: Failed to fetch community posts`);
    }

    return data;
    
  } catch (error: any) {
    // Check if this is a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    
    // Re-throw with more context
    const errorMessage = error?.message || 'Unknown error occurred while fetching community posts';
    throw new Error(errorMessage);
  }
};


export const likeCommunityPost = async (token: string, postId: string) => {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Authentication token is required to like a post');
  }

  if (!postId || typeof postId !== 'string' || postId.trim() === '') {
    throw new Error('Post ID is required to like a post');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'token': token.trim(),
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();

    let data: any;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      // If response is successful but not JSON, treat as success
      if (response.ok) {
        return { success: true, message: 'Post liked successfully' };
      }
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}: Failed to like post`);
    }

    return data || { success: true, message: 'Post liked successfully' };
    
  } catch (error: any) {
    // Check if this is a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    
    // Re-throw with more context
    const errorMessage = error?.message || 'Unknown error occurred while liking post';
    throw new Error(errorMessage);
  }
};

export const addCommentToCommunityPost = async (token: string, postId: string, content: string) => {
  // Create FormData instead of JSON payload
  const formData = new FormData();
  formData.append('content', content);

  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'token': token,
      // Remove 'Content-Type' header to let the browser set it automatically for FormData
    },
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to add comment');
  }

  return data;
};

// ================================
// MODERATION OPERATIONS
// ================================

export const pinCommunityPost = async (token: string, postId: string, pin: boolean = true) => {
  // Create FormData instead of JSON payload
  const formData = new FormData();
  formData.append('pin', String(pin));

  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/pin`, {
    method: 'POST',
    headers: {
      'token': token,
      // Remove 'Content-Type' header to let the browser set it automatically for FormData
    },
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to pin post');
  }

  return data;
};

export const deleteCommunityPost = async (token: string, postId: string, communityId?: string) => {
  const headers = {
    'token': token,
    'Content-Type': 'application/json',
  } as Record<string, string>;

  const tryDelete = async (url: string) => {
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    // Some backends return 204 No Content on successful delete
    if (response.status === 204) {
      return { success: true };
    }

    const responseText = await response.text();
    let data: any = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      // Non-JSON response; treat based on status
    }

    if (!response.ok) {
      throw new Error(data?.message || `Failed to delete post`);
    }

    // If there is a body, return it; otherwise return a generic success
    return data ?? { success: true };
  };

  // Primary route
  try {
    return await tryDelete(`${API_BASE_URL}/community/posts/${postId}`);
  } catch (primaryErr) {
    // Fallback route that includes communityId in the path
    if (communityId) {
      try {
        return await tryDelete(`${API_BASE_URL}/community/${communityId}/posts/${postId}`);
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    throw primaryErr;
  }
};

// ================================
// MEMBER MANAGEMENT
// ================================

export const handleJoinRequest = async (token: string, requestId: string, action: 'approve' | 'reject') => {
  // Create FormData instead of JSON payload
  const formData = new FormData();
  formData.append('action', action);

  const response = await fetch(`${API_BASE_URL}/community/requests/${requestId}/handle`, {
    method: 'POST',
    headers: {
      'token': token,
      // Remove 'Content-Type' header to let the browser set it automatically for FormData
    },
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to handle join request');
  }

  return data;
};

export const getCommunityMembers = async (token: string, communityId: string) => {
  try {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Authentication token is required to get community members');
    }

    if (!communityId || typeof communityId !== 'string' || communityId.trim() === '') {
      throw new Error('Community ID is required to get members');
    }

    console.log('getCommunityMembers: Making request to:', `${API_BASE_URL}/community/${communityId}/members`);
    console.log('getCommunityMembers: Token present:', !!token);

    const response = await fetch(`${API_BASE_URL}/community/${communityId}/members`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });

    console.log('getCommunityMembers: Response status:', response.status);
    
    let data: any;
    const responseText = await response.text();
    console.log('getCommunityMembers: Raw response:', responseText.substring(0, 200));
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('getCommunityMembers: JSON parse error:', parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      console.error('getCommunityMembers: API error:', data);
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('getCommunityMembers: Success, members count:', data?.members?.length || 0);
    return data;
  } catch (error) {
    console.error('getCommunityMembers: Network or other error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    throw error;
  }
};

export const assignRole = async (token: string, communityId: string, memberId: string, role: 'admin' | 'moderator') => {
  // Create FormData instead of JSON payload
  const formData = new FormData();
  formData.append('role', role);

  const response = await fetch(`${API_BASE_URL}/community/${communityId}/members/${memberId}/role`, {
    method: 'POST',
    headers: {
      'token': token,
      // Remove 'Content-Type' header to let the browser set it automatically for FormData
    },
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to assign role');
  }

  return data;
};

export const removeMember = async (token: string, communityId: string, memberId: string) => {
  const response = await fetch(`${API_BASE_URL}/community/${communityId}/members/${memberId}`, {
    method: 'DELETE',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to remove member');
  }

  return data;
};


