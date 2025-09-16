// api/post.ts - Post API integration
export const API_BASE = 'https://social-backend-y1rg.onrender.com';

// Post interfaces
export interface Post {
  id: string;
  _id?: string;
  author: any;
  content: string;
  images?: string[];
  createdAt: string;
  likes: number;
  comments: number;
  reposts?: number;
  isLiked: boolean;
  isBookmarked?: boolean;
  isReposted?: boolean;
  commentsList?: Comment[];
  originalPost?: Post;
  repostComment?: string;
  repostedBy?: any;
  repostedAt?: string;
  visibility?: string;
}

export interface Comment {
  id: string;
  author: any;
  content: string;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

export interface CreatePostData {
  content: string;
  images?: string[];
  visibility?: 'public' | 'private' | 'friends';
  isReposted?: boolean;
  originalPostId?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasNextPage: boolean;
  limit: number;
}

export interface PostsResponse {
  success: boolean;
  posts: Post[];
  pagination?: PaginationInfo;
  message: string;
}

// ================================
// POST OPERATIONS
// ================================

/**
 * Fetch posts from the API - This implements the requested post/getposts endpoint logic
 * @param token - User authentication token
 * @param filter - Optional filter for posts ('trending', 'latest', etc.)
 * @param page - Optional page number for pagination
 * @param limit - Optional limit for number of posts
 */
export async function getPosts(
  token: string, 
  options?: {
    filter?: 'trending' | 'latest' | 'following';
    page?: number;
    limit?: number;
  }
) {
  try {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Authentication token is required');
    }

    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const filter = options?.filter === 'latest' ? '1' : '0';

    const response = await fetch(`${API_BASE}/post/getposts`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: filter,
        page: page,
        limit: limit
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to fetch posts`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch posts');
    }

    const posts = data.body || [];
    const totalPosts = data.total || posts.length;
    const totalPages = Math.ceil(totalPosts / limit);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      posts: posts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalPosts: totalPosts,
        hasNextPage: hasNextPage,
        limit: limit
      },
      message: data.message || 'Posts fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

/**
 * Get all posts (alternative endpoint)
 */
export async function getAllPosts(
  token: string, 
  filter: 'trending' | 'latest' = 'latest',
  options?: {
    page?: number;
    limit?: number;
  }
): Promise<PostsResponse> {
  try {
    const filterParam = filter === 'latest' ? '1' : '0';
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    
    const url = new URL(`${API_BASE}/post/all/allPosts/`);
    url.searchParams.append('filter', filterParam);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('limit', limit.toString());
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to fetch posts`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch posts');
    }

    const posts = data.body || [];
    const totalPosts = data.total || posts.length;
    const totalPages = Math.ceil(totalPosts / limit);
    const hasNextPage = page < totalPages;

    return {
      success: true,
      posts: posts,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalPosts: totalPosts,
        hasNextPage: hasNextPage,
        limit: limit
      },
      message: data.message || 'Posts fetched successfully'
    };
  } catch (error) {
    console.error('Error fetching all posts:', error);
    throw error;
  }
}

/**
 * Get posts for a specific user
 */
export async function getUserPosts(token: string, userId?: string) {
  try {
    if (!token) {
      throw new Error('Authentication token is required');
    }

    // Try different possible endpoints for user posts
    const endpoints = [
      // For current user's posts
      userId ? null : `${API_BASE}/post/user`,
      // For specific user's posts - try different patterns
      userId ? `${API_BASE}/post/user/${userId}` : null,
      userId ? `${API_BASE}/user/${userId}/posts` : null,
      userId ? `${API_BASE}/posts/user/${userId}` : null,
      // Fallback: get all posts and filter on client side if needed
      `${API_BASE}/post/all/allPosts/?filter=1`
    ].filter(Boolean); // Remove null values

    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'token': token,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastError = new Error(errorText || `HTTP ${response.status}: Failed to fetch user posts`);
          
          // If 404, try next endpoint
          if (response.status === 404) {
            continue;
          }
          
          // For other errors, try next endpoint too
          continue;
        }

        const data = await response.json();
        
        if (!data.success) {
          lastError = new Error(data.message || 'Failed to fetch user posts');
          continue;
        }

        let posts = data.body || [];

        // If this was the fallback endpoint, filter posts
        if (endpoint.includes('/all/allPosts')) {
          if (userId) {
            // Filter for specific user
            posts = posts.filter((post: any) => {
              return post.author?._id === userId || 
                     post.author?.id === userId ||
                     post.userId === userId ||
                     post.UserId === userId;
            });
          } else {
            // For current user, we need to extract user ID from token or return empty
            // Since we don't have user ID, we should return empty array
            // The hook should handle getting current user's ID properly
            console.warn('getUserPosts: No userId provided for current user, cannot filter posts from fallback');
            posts = [];
          }
        }

        return {
          success: true,
          posts,
          message: data.message || 'User posts fetched successfully'
        };
      } catch (error) {
        lastError = error as Error;
        continue;
      }
    }

    // If all endpoints failed, throw the last error
    throw lastError || new Error('All endpoints failed to fetch user posts');
    
  } catch (error) {
    console.error('Error fetching user posts:', error);
    throw error;
  }
}

/**
 * Get a single post by ID
 */
export async function getPostById(token: string, postId: string) {
  try {
    if (!postId || !token) {
      throw new Error('Post ID and token are required');
    }

    const response = await fetch(`${API_BASE}/post/${postId}`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to fetch post`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch post');
    }

    return data;
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    throw error;
  }
}

/**
 * Create a new post
 */
export async function createPost(token: string, postData: CreatePostData) {
  try {
    if (!token || !postData.content?.trim()) {
      throw new Error('Token and post content are required');
    }

    const response = await fetch(`${API_BASE}/post/create`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: postData.content.trim(),
        images: postData.images || [],
        visibility: postData.visibility || 'public',
        isReposted: postData.isReposted || false,
        originalPostId: postData.originalPostId
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to create post`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to create post');
    }

    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

/**
 * Edit an existing post
 */
export async function editPost(token: string, postId: string, postData: Partial<CreatePostData>) {
  try {
    if (!token || !postId) {
      throw new Error('Token and post ID are required');
    }

    const response = await fetch(`${API_BASE}/post/${postId}/edit`, {
      method: 'PUT',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to edit post`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to edit post');
    }

    return data;
  } catch (error) {
    console.error('Error editing post:', error);
    throw error;
  }
}

/**
 * Delete a post
 */
export async function deletePost(token: string, postId: string) {
  try {
    if (!token || !postId) {
      throw new Error('Token and post ID are required');
    }

    const response = await fetch(`${API_BASE}/post/${postId}/delete`, {
      method: 'DELETE',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to delete post`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to delete post');
    }

    return data;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

/**
 * Like a post
 */
export async function likePost(token: string, postId: string) {
  try {
    if (!token || !postId) {
      throw new Error('Token and post ID are required');
    }

    const response = await fetch(`${API_BASE}/post/like`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to like post`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to like post');
    }

    return data;
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(token: string, postId: string) {
  try {
    if (!token || !postId) {
      throw new Error('Token and post ID are required');
    }

    const response = await fetch(`${API_BASE}/post/unlike`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to unlike post`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to unlike post');
    }

    return data;
  } catch (error) {
    console.error('Error unliking post:', error);
    throw error;
  }
}

/**
 * Bookmark a post
 */
export async function bookmarkPost(token: string, postId: string) {
  try {
    if (!token || !postId) {
      throw new Error('Token and post ID are required');
    }

    const response = await fetch(`${API_BASE}/post/bookmark`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to bookmark post`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to bookmark post');
    }

    return data;
  } catch (error) {
    console.error('Error bookmarking post:', error);
    throw error;
  }
}

/**
 * Repost a post
 */
export async function repostPost(token: string, postId: string, comment?: string) {
  try {
    if (!token || !postId) {
      throw new Error('Token and post ID are required');
    }

    const response = await fetch(`${API_BASE}/post/repost`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        postId,
        comment: comment?.trim() || ''
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to repost`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to repost');
    }

    return data;
  } catch (error) {
    console.error('Error reposting post:', error);
    throw error;
  }
}

/**
 * Get comments for a post
 */
export async function getPostComments(token: string, postId: string) {
  try {
    if (!token || !postId) {
      throw new Error('Token and post ID are required');
    }

    const response = await fetch(`${API_BASE}/post/${postId}/comments`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to fetch comments`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch comments');
    }

    return data;
  } catch (error) {
    console.error('Error fetching post comments:', error);
    throw error;
  }
}

/**
 * Add a comment to a post
 */
export async function addPostComment(token: string, postId: string, content: string) {
  try {
    if (!token || !postId || !content?.trim()) {
      throw new Error('Token, post ID, and comment content are required');
    }

    const response = await fetch(`${API_BASE}/post/comment`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        postId,
        content: content.trim()
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to add comment`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to add comment');
    }

    return data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Like a comment
 */
export async function likeComment(token: string, commentId: string) {
  try {
    if (!token || !commentId) {
      throw new Error('Token and comment ID are required');
    }

    const response = await fetch(`${API_BASE}/post/comment/like`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ commentId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to like comment`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to like comment');
    }

    return data;
  } catch (error) {
    console.error('Error liking comment:', error);
    throw error;
  }
}

// ================================
// POLL OPERATIONS
// ================================

/**
 * Vote on a poll option
 */
export async function votePoll(token: string, postId: string, optionId: string) {
  try {
    if (!token || !postId || !optionId) {
      throw new Error('Token, post ID, and option ID are required');
    }

    const response = await fetch(`${API_BASE}/post/poll/vote`, {
      method: 'POST',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        postId,
        optionId 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to vote on poll`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to vote on poll');
    }

    return data;
  } catch (error) {
    console.error('Error voting on poll:', error);
    throw error;
  }
}

/**
 * Get poll results for a post
 */
export async function getPostPoll(token: string, postId: string) {
  try {
    if (!token || !postId) {
      throw new Error('Token and post ID are required');
    }

    const response = await fetch(`${API_BASE}/post/${postId}/poll`, {
      method: 'GET',
      headers: {
        'token': token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}: Failed to fetch poll data`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch poll data');
    }

    return data;
  } catch (error) {
    console.error('Error fetching poll data:', error);
    throw error;
  }
}
