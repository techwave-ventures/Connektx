import { create } from 'zustand';
import { Comment } from '../types';
import { getUserComments } from '../api/user';

// Cache TTL for user comments (in ms)
const COMMENTS_TTL = 2 * 60 * 1000; // 2 minutes

interface CachedComments {
  items: (Comment & {
    post?: {
      _id: string;
      content: string;
      author: {
        _id: string;
        name: string;
        profilePicture?: string;
      };
      createdAt: string;
    };
  })[];
  timestamp: number;
  isLoading: boolean;
}

interface UserCommentsState {
  // Current view model (kept for compatibility with existing screens)
  userComments: (Comment & {
    post?: {
      _id: string;
      content: string;
      author: {
        _id: string;
        name: string;
        profilePicture?: string;
      };
      createdAt: string;
    };
  })[];
  isLoading: boolean;
  error: string | null;

  // New cache by userId
  userCommentsByUserId: Record<string, CachedComments>;
  lastUserId?: string;

  fetchUserComments: (userId: string) => Promise<void>;
  refreshUserComments: (userId: string) => Promise<void>;
  clearUserComments: () => void;
}

export const useUserCommentsStore = create<UserCommentsState>((set, get) => ({
  userComments: [],
  isLoading: false,
  error: null,
  userCommentsByUserId: {},
  lastUserId: undefined,

  fetchUserComments: async (userId: string) => {
    const state = get();
    const cache = state.userCommentsByUserId[userId];
    const now = Date.now();

    // If we have fresh cache, show it immediately and refresh in background
    if (cache && now - cache.timestamp < COMMENTS_TTL) {
      set({ userComments: cache.items, isLoading: cache.isLoading, lastUserId: userId, error: null });
      // Kick off background refresh but do not block UI
      get().refreshUserComments(userId).catch(() => {});
      return;
    }

    // Otherwise, mark loading but don't clear existing comments (avoid blank flash)
    set({ isLoading: true, error: null, lastUserId: userId });

    try {
      const { token } = require('./auth-store').useAuthStore.getState();
      if (!token) throw new Error('No authentication token available');

      const data = await getUserComments(token, userId);

      // Normalize response shape
      let commentsArray: any[] = [];
      if (Array.isArray(data)) commentsArray = data;
      else if (data?.comments && Array.isArray(data.comments)) commentsArray = data.comments;
      else if (Array.isArray(data?.body)) commentsArray = data.body;
      else if (data?.success && Array.isArray(data?.body)) commentsArray = data.body;
      else commentsArray = [];

      // Map the response to ensure it has the correct structure
      const mappedComments = commentsArray.map((comment: any, index: number) => {
        const mappedComment = {
          _id: comment._id || comment.id || `temp-id-${index}`,
          id: comment._id || comment.id || `temp-id-${index}`,
          content: comment.content || comment.text || '',
          author: comment.author || comment.user || null,
          createdAt: comment.createdAt || comment.created_at || new Date().toISOString(),
          likes: comment.likes || [],
          replies: comment.replies || [],
          post: null as any
        };
        if (comment.post) {
          try {
            mappedComment.post = {
              _id: comment.post._id || comment.post.id || 'unknown',
              content: comment.post.content || comment.post.text || '',
              author: {
                _id: comment.post.author?._id || comment.post.author?.id || comment.post.user?._id || comment.post.user?.id || 'unknown',
                name: comment.post.author?.name || comment.post.author?.username || comment.post.user?.name || comment.post.user?.username || 'Unknown User',
                profilePicture: comment.post.author?.profilePicture || comment.post.author?.avatar || comment.post.user?.profilePicture || comment.post.user?.avatar || undefined
              },
              createdAt: comment.post.createdAt || comment.post.created_at || new Date().toISOString()
            };
          } catch {
            mappedComment.post = undefined as any;
          }
        } else if (comment.postId || comment.post_id) {
          mappedComment.post = {
            _id: comment.postId || comment.post_id,
            content: 'Post content not available',
            author: { _id: 'unknown', name: 'Unknown User', profilePicture: undefined },
            createdAt: new Date().toISOString()
          } as any;
        }
        return mappedComment;
      });

      // Update cache and current view
      const updated: CachedComments = { items: mappedComments, timestamp: Date.now(), isLoading: false };
      set((prev) => ({
        userComments: mappedComments,
        isLoading: false,
        error: null,
        userCommentsByUserId: { ...prev.userCommentsByUserId, [userId]: updated },
        lastUserId: userId,
      }));
    } catch (error) {
      // Do not clear existing comments on error
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch user comments', 
        isLoading: false,
      });
    }
  },

  refreshUserComments: async (userId: string) => {
    // Background refresh; keep existing items visible
    try {
      const { token } = require('./auth-store').useAuthStore.getState();
      if (!token) throw new Error('No authentication token available');

      const data = await getUserComments(token, userId);

      let commentsArray: any[] = [];
      if (Array.isArray(data)) commentsArray = data;
      else if (data?.comments && Array.isArray(data.comments)) commentsArray = data.comments;
      else if (Array.isArray(data?.body)) commentsArray = data.body;
      else if (data?.success && Array.isArray(data?.body)) commentsArray = data.body;
      else commentsArray = [];

      const mappedComments = commentsArray.map((comment: any, index: number) => {
        const mappedComment = {
          _id: comment._id || comment.id || `temp-id-${index}`,
          id: comment._id || comment.id || `temp-id-${index}`,
          content: comment.content || comment.text || '',
          author: comment.author || comment.user || null,
          createdAt: comment.createdAt || comment.created_at || new Date().toISOString(),
          likes: comment.likes || [],
          replies: comment.replies || [],
          post: null as any
        };
        if (comment.post) {
          try {
            mappedComment.post = {
              _id: comment.post._id || comment.post.id || 'unknown',
              content: comment.post.content || comment.post.text || '',
              author: {
                _id: comment.post.author?._id || comment.post.author?.id || comment.post.user?._id || comment.post.user?.id || 'unknown',
                name: comment.post.author?.name || comment.post.author?.username || comment.post.user?.name || comment.post.user?.username || 'Unknown User',
                profilePicture: comment.post.author?.profilePicture || comment.post.author?.avatar || comment.post.user?.profilePicture || comment.post.user?.avatar || undefined
              },
              createdAt: comment.post.createdAt || comment.post.created_at || new Date().toISOString()
            };
          } catch {
            mappedComment.post = undefined as any;
          }
        } else if (comment.postId || comment.post_id) {
          mappedComment.post = {
            _id: comment.postId || comment.post_id,
            content: 'Post content not available',
            author: { _id: 'unknown', name: 'Unknown User', profilePicture: undefined },
            createdAt: new Date().toISOString()
          } as any;
        }
        return mappedComment;
      });

      const refreshed: CachedComments = { items: mappedComments, timestamp: Date.now(), isLoading: false };
      set((prev) => ({
        // Update cache
        userCommentsByUserId: { ...prev.userCommentsByUserId, [userId]: refreshed },
        // If this userId is currently selected in view, update the visible list too
        userComments: prev.lastUserId === userId ? mappedComments : prev.userComments,
        error: null,
      }));
    } catch (error) {
      // Keep existing items on error; only record the error
      set({ 
        error: error instanceof Error ? error.message : 'Failed to refresh user comments'
      });
    }
  },

  clearUserComments: () => {
    set({ 
      userComments: [], 
      error: null, 
      isLoading: false 
    });
  }
}));
