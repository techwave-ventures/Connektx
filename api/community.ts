// Community API - Direct backend integration only
import { safeSplit } from '../utils/safeSplit';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';

console.log('Community API: Base URL:', API_BASE_URL);


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

  // Create FormData instead of JSON payload
  const formData = new FormData();
  
  formData.append('name', communityData.name.trim());
  formData.append('description', communityData.description.trim());
  formData.append('isPrivate', String(!!communityData.isPrivate));
  formData.append('requiresApproval', String(communityData.requiresApproval ?? false));

  if (communityData.tags && communityData.tags.length > 0) {
    const tags = Array.isArray(communityData.tags)
      ? communityData.tags
      : typeof communityData.tags === 'string'
        ? safeSplit(communityData.tags, ',')
        : [];
    
    // Append each tag individually for FormData
    tags.forEach(tag => {
      if (tag.trim()) {
        formData.append('tags', tag.trim());
      }
    });
  }

  if (communityData.logo && communityData.logo.trim() !== '') {
    formData.append('logo', communityData.logo.trim());
  }
  if (communityData.coverImage && communityData.coverImage.trim() !== '') {
    formData.append('coverImage', communityData.coverImage.trim());
  }
  if (communityData.location && communityData.location.trim() !== '') {
    formData.append('location', communityData.location.trim());
  }

  const response = await fetch(`${API_BASE_URL}/community`, {
    method: 'POST',
    headers: {
      'token': token,
      // Remove 'Content-Type' header to let the browser set it automatically for FormData
    },
    body: formData
  });

  const responseText = await response.text();
  let data: any;
  
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
  }

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data;
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

    console.log('getAllCommunities: Making request to:', `${API_BASE_URL}/community?${queryParams}`);
    console.log('getAllCommunities: Headers:', headers);

    const response = await fetch(`${API_BASE_URL}/community?${queryParams}`, {
      method: 'GET',
      headers,
    });

    console.log('getAllCommunities: Response status:', response.status);
    
    let data: any;
    const responseText = await response.text();
    console.log('getAllCommunities: Raw response:', responseText.substring(0, 200));
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('getAllCommunities: JSON parse error:', parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      console.error('getAllCommunities: API error:', data);
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('getAllCommunities: Success, communities count:', data?.communities?.length || 0);
    return data;
  } catch (error) {
    console.error('getAllCommunities: Network or other error:', error);
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
  const response = await fetch(`${API_BASE_URL}/community/${communityId}`, {
    method: 'PUT',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
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
  console.log('🌐 [CommunityAPI] Starting joinCommunity API call...');
  console.log('  Request details:', {
    url: `${API_BASE_URL}/community/${communityId}/join`,
    method: 'POST',
    hasToken: !!token,
    tokenLength: token?.length || 0,
    tokenPrefix: token ? `${token.substring(0, 10)}...` : 'null',
    communityId,
    hasMessage: !!message,
    messageLength: message?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  try {
    console.log('  📡 Making HTTP request...');
    const requestStartTime = Date.now();
    
    const requestBody = JSON.stringify({ message });
    console.log('  Request body:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/community/${communityId}/join`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
    
    const requestEndTime = Date.now();
    console.log('  📈 Request completed:', {
      duration: requestEndTime - requestStartTime,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    console.log('  📄 Parsing response...');
    const responseText = await response.text();
    console.log('    Raw response length:', responseText.length);
    console.log('    Raw response preview:', responseText.substring(0, 200));
    
    let data: any;
    try {
      data = JSON.parse(responseText);
      console.log('    Parsed JSON successfully:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        hasCommunity: !!(data && data.community),
        hasMessage: !!(data && data.message)
      });
    } catch (parseError) {
      console.error('    JSON parse failed:', parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      console.error('  ❌ API returned error status:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage: data.message || 'Unknown error',
        fullResponse: data
      });
      throw new Error(data.message || 'Failed to join community');
    }
    
    console.log('  ✅ [CommunityAPI] joinCommunity successful!');
    console.log('    Response summary:', {
      success: true,
      communityUpdated: !!(data && data.community),
      responseKeys: Object.keys(data || {})
    });
    
    return data;
    
  } catch (error: any) {
    console.error('  ❌ [CommunityAPI] joinCommunity failed:');
    console.error('    Error type:', typeof error);
    console.error('    Error name:', error?.name);
    console.error('    Error message:', error?.message);
    console.error('    Error stack:', error?.stack);
    console.error('    Full error:', error);
    
    // Check if this is a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('    This appears to be a network connectivity error');
      throw new Error('Network error: Unable to connect to server. Please check your internet connection.');
    }
    
    // Re-throw the original error
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

    console.log('getUserCommunities: Making request to:', `${API_BASE_URL}/community/user`);
    console.log('getUserCommunities: Token present:', !!token);

    const response = await fetch(`${API_BASE_URL}/community/user`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });

    console.log('getUserCommunities: Response status:', response.status);
    
    let data: any;
    const responseText = await response.text();
    console.log('getUserCommunities: Raw response:', responseText.substring(0, 200));
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('getUserCommunities: JSON parse error:', parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }

    if (!response.ok) {
      console.error('getUserCommunities: API error:', data);
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('getUserCommunities: Success, user communities:', data);
    return data;
  } catch (error) {
    console.error('getUserCommunities: Network or other error:', error);
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
  console.log('🚀 [CommunityAPI] Starting createCommunityPostWithFiles...');
  console.log('  Community ID:', communityId);
  console.log('  Post Data:', JSON.stringify(postData, null, 2));
  console.log('  Token present:', !!token);
  
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Authentication token is required to create a post');
  }

  if (!postData.discription) {
    throw new Error('Post content (discription) is required');
  }

  const url = `${API_BASE_URL}/community/${communityId}/posts`;
  console.log('  API URL:', url);

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
        console.log(`  Adding image ${index + 1}:`, { uri, filename, mimeType });
        
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

    console.log('  Response status:', response.status);
    console.log('  Response statusText:', response.statusText);

    let data: any;
    const responseText = await response.text();
    console.log('  Raw response:', responseText);

    try {
      data = JSON.parse(responseText);
      console.log('  Parsed data:', data);
    } catch (parseError) {
      console.error('  JSON parse error:', parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error('  ❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        message: data?.message,
        fullData: data
      });
      throw new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('  ✅ Post created successfully:', data);
    return data;
  } catch (error) {
    console.error('  ❌ createCommunityPostWithFiles failed:', error);
    throw error;
  }
};

export const createCommunityPost = async (token: string, communityId: string, postData: CreatePostData) => {
  console.log('🚀 [CommunityAPI] Starting createCommunityPost...');
  console.log('  Community ID:', communityId);
  console.log('  Post Data:', JSON.stringify(postData, null, 2));
  console.log('  Token present:', !!token);
  console.log('  Token length:', token?.length);
  
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new Error('Authentication token is required to create a post');
  }

  if (!postData.discription) {
    throw new Error('Post content (discription) is required');
  }

  const url = `${API_BASE_URL}/community/${communityId}/posts`;
  console.log('  API URL:', url);

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

    console.log('  Response status:', response.status);
    console.log('  Response statusText:', response.statusText);
    console.log('  Response headers:', Object.fromEntries(response.headers.entries()));

    let data: any;
    const responseText = await response.text();
    console.log('  Raw response:', responseText);

    try {
      data = JSON.parse(responseText);
      console.log('  Parsed data:', data);
    } catch (parseError) {
      console.error('  JSON parse error:', parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error('  ❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        message: data?.message,
        fullData: data
      });
      throw new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('  ✅ Post created successfully:', data);
    return data;
  } catch (error) {
    console.error('  ❌ createCommunityPost failed:', error);
    throw error;
  }
};

export const getCommunityPosts = async (token: string, communityId: string, filters?: {
  type?: 'all' | 'posts' | 'questions';
  sortBy?: 'best' | 'new' | 'top';
  page?: number;
  limit?: number;
}) => {
  console.log('🔗 [CommunityAPI] getCommunityPosts called');
  console.log('  Community ID:', communityId);
  console.log('  Filters:', filters);
  console.log('  Token present:', !!token);
  
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
  console.log('  API URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'token': token.trim(),
        'Content-Type': 'application/json',
      },
    });

    console.log('  Response status:', response.status);
    console.log('  Response statusText:', response.statusText);
    console.log('  Response ok:', response.ok);

    let data: any;
    const responseText = await response.text();
    console.log('  Raw response (first 200 chars):', responseText.substring(0, 200));

    try {
      data = responseText ? JSON.parse(responseText) : {};
      console.log('  Parsed data structure:', {
        success: data?.success,
        postsCount: Array.isArray(data?.posts) ? data.posts.length : 'not array',
        hasData: !!data,
      });
    } catch (parseError) {
      console.error('  JSON parse error:', parseError);
      throw new Error(`Invalid JSON response from community posts API: ${responseText.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      console.error('  ❌ API returned error:', {
        status: response.status,
        statusText: response.statusText,
        message: data?.message || 'Unknown error',
        fullData: data
      });
      
      // Check for the specific schema populate error
      if (data?.error && data.error.includes('Cannot populate path `comments.authorId`')) {
        console.log('  ⚠️ Schema populate error detected, returning empty posts array');
        // Return a valid but empty response instead of throwing
        return { success: true, posts: [] };
      }
      
      throw new Error(data?.message || `HTTP ${response.status}: Failed to fetch community posts`);
    }

    console.log('  ✅ getCommunityPosts successful!');
    return data;
    
  } catch (error: any) {
    console.error('  ❌ getCommunityPosts failed:', error);
    
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
  console.log('🎯 [CommunityAPI] Starting likeCommunityPost...');
  console.log('  Post ID:', postId);
  console.log('  Token present:', !!token);
  console.log('  Token length:', token?.length);
  console.log('  API URL:', `${API_BASE_URL}/community/posts/${postId}/like`);
  
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

    console.log('  Response status:', response.status);
    console.log('  Response statusText:', response.statusText);
    console.log('  Response ok:', response.ok);

    const responseText = await response.text();
    console.log('  Raw response:', responseText);

    let data: any;
    try {
      data = responseText ? JSON.parse(responseText) : {};
      console.log('  Parsed data:', data);
    } catch (parseError) {
      console.error('  JSON parse error:', parseError);
      // If response is successful but not JSON, treat as success
      if (response.ok) {
        console.log('  ✅ Like successful (non-JSON response)');
        return { success: true, message: 'Post liked successfully' };
      }
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }
    
    if (!response.ok) {
      console.error('  ❌ API returned error:', {
        status: response.status,
        statusText: response.statusText,
        message: data?.message || 'Unknown error',
        fullData: data
      });
      throw new Error(data?.message || `HTTP ${response.status}: Failed to like post`);
    }

    console.log('  ✅ Like successful!');
    return data || { success: true, message: 'Post liked successfully' };
    
  } catch (error: any) {
    console.error('  ❌ likeCommunityPost failed:', error);
    
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
  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
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
  const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/pin`, {
    method: 'POST',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin }),
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
  const response = await fetch(`${API_BASE_URL}/community/requests/${requestId}/handle`, {
    method: 'POST',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
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
  const response = await fetch(`${API_BASE_URL}/community/${communityId}/members/${memberId}/role`, {
    method: 'POST',
    headers: {
      'token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
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


