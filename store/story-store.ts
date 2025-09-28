import { create } from 'zustand';
import { useAuthStore } from '@/store/auth-store';
import { followingUserStory } from '@/api/user';
import { mapStoriesFromApi } from '@/utils/mapStoryFromApi';
import { Story } from '@/types';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';

interface UserSummary {
  id: string;
  name: string;
  avatar: string;
  streak?: number;
}

interface StoryGroup {
  user: UserSummary;
  stories: Story[];
}

interface StoryState {
  // Data
  userStories: Story[]; // current user's own stories
  followingStoryGroups: StoryGroup[]; // grouped by followed user
  // Status
  isLoading: boolean;
  error: string | null;
  // Guards
  hasFetched: boolean;
  lastToken: string | null;
  // Actions
  fetchOnce: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  userStories: [],
  followingStoryGroups: [],
  isLoading: false,
  error: null,
  hasFetched: false,
  lastToken: null,

  fetchOnce: async () => {
    const { token, user } = useAuthStore.getState();
    const state = get();

    // If no token, nothing to fetch
    if (!token) return;

    // If already fetched with same token, skip
    if (state.hasFetched && state.lastToken === token) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Fetch current user's own stories
      const selfRes = await fetch(`${API_BASE}/user/story/self`, {
        method: 'GET',
        headers: {
          token: token,
          'Content-Type': 'application/json',
        },
      });

      let userStories: Story[] = [];
      if (selfRes.ok) {
        const json = await selfRes.json();
        if (json?.success && Array.isArray(json?.body)) {
          userStories = mapStoriesFromApi(json.body, user);
        }
      }

      // Fetch following users' stories
      const rawFollowing = await followingUserStory(token);
      const groupsByUser: Record<string, StoryGroup> = {};

      (rawFollowing || []).forEach((story: any) => {
        const userId = story?.userId?._id;
        if (!userId) return;

        // Exclude current user's own stories
        if (user?.id && userId === user.id) return;

        const mapped: Story = {
          id: story._id,
          _id: story._id,
          url: story.url,
          image: story.url,
          type: story.type || 'image',
          viewed: false,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
          userId: story.userId?._id,
          user: {
            id: story.userId._id,
            name: story.userId.name,
            avatar: story.userId.profileImage || '',
            streak: story.userId.streak || 0,
          } as any,
        } as Story;

        if (!groupsByUser[userId]) {
          groupsByUser[userId] = {
            user: {
              id: story.userId._id,
              name: story.userId.name,
              avatar: story.userId.profileImage || '',
              streak: story.userId.streak || 0,
            },
            stories: [mapped],
          };
        } else {
          groupsByUser[userId].stories.push(mapped);
        }
      });

      const followingStoryGroups = Object.values(groupsByUser);

      set({
        userStories,
        followingStoryGroups,
        isLoading: false,
        error: null,
        hasFetched: true,
        lastToken: token,
      });
    } catch (e: any) {
      console.error('[StoryStore] Failed to fetch stories:', e);
      set({
        isLoading: false,
        error: e?.message || 'Failed to fetch stories',
        hasFetched: true,
        lastToken: token || null,
      });
    }
  },

  refresh: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    set({ isLoading: true, error: null });

    try {
      // Reuse fetchOnce logic by resetting hasFetched for this token, then calling fetchOnce
      set({ hasFetched: false, lastToken: null });
      await get().fetchOnce();
    } catch (e: any) {
      set({ isLoading: false, error: e?.message || 'Failed to refresh stories' });
    }
  },
}));