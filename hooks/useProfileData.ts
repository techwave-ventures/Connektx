// hooks/useProfileData.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import { usePostStore } from '@/store/post-store';
import { useShowcaseStore } from '@/store/showcase-store';
import { usePortfolioStore } from '@/store/portfolio-store';
import { getUserById } from '@/api/user';
import * as PostAPI from '@/api/post';
import { mapUserFromApi } from '@/utils/mapUserFromApi';

interface ProfileDataCache {
  user: User | null;
  posts: any[];
  showcases: any[];
  portfolioItems: any[];
  timestamp: number;
  loading: boolean;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Global cache to persist across component mounts
const profileCache: { [userId: string]: ProfileDataCache } = {};

interface UseProfileDataOptions {
  userId: string;
  isOwnProfile: boolean;
  enableAutoRefresh?: boolean;
  cacheTimeout?: number;
}

// Filter content utility function (outside component to prevent re-creation)
const filterUserContent = (user: User | null, allPosts: any[], allShowcases: any[], allPortfolioItems: any[]) => {
  if (!user) return { posts: [], showcases: [], portfolioItems: [] };
  
  return {
    posts: allPosts.filter(post => post.author?.id === user.id),
    showcases: allShowcases
      .filter(entry => entry.author?.id === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    portfolioItems: allPortfolioItems.filter(item => item.userId === user.id),
  };
};

export const useProfileData = (options: UseProfileDataOptions) => {
  const { userId, isOwnProfile, enableAutoRefresh = true, cacheTimeout = CACHE_DURATION } = options;
  
  // Store references
  const { user: currentUser, token, refreshUserData } = useAuthStore();
  const { posts: allPosts } = usePostStore();
  const { entries: allShowcases } = useShowcaseStore();
  const { items: allPortfolioItems } = usePortfolioStore();
  
  // Local state
  const [profileData, setProfileData] = useState<ProfileDataCache>(() => {
    // Initialize with cache if available and not expired
    const cached = profileCache[userId];
    if (cached && (Date.now() - cached.timestamp < cacheTimeout)) {
      return cached;
    }
    
    // Initialize with empty state
    return {
      user: isOwnProfile ? currentUser : null,
      posts: [],
      showcases: [],
      portfolioItems: [],
      timestamp: 0,
      loading: true,
    };
  });

  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef(0); // Track last fetch to prevent rapid re-fetching
  const profileDataRef = useRef(profileData); // Stable reference to current profile data
  
  // Update ref whenever profile data changes
  profileDataRef.current = profileData;

  // Stable fetch function - prevent infinite loops
  const fetchProfileData = useCallback(async (showRefreshingState = false) => {
    if (!token) return;
    
    // Prevent rapid re-fetching
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) {
      console.log('--- HOOK DEBUG: Throttling fetch request');
      return;
    }
    lastFetchRef.current = now;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      if (showRefreshingState) {
        setRefreshing(true);
      }

      let fetchedUser: User | null = null;

      if (isOwnProfile) {
        // For own profile, refresh user data
        await refreshUserData();
        if (signal.aborted || !mountedRef.current) return;
        fetchedUser = useAuthStore.getState().user;
      } else {
        // For other users, fetch their profile
        try {
          const userResponse = await getUserById(token, userId);
          if (signal.aborted || !mountedRef.current) return;
          
          let userData = userResponse.body || userResponse.user || userResponse;
          if (!userData) {
            throw new Error('No user data found in API response');
          }
          fetchedUser = mapUserFromApi(userData);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          if (signal.aborted || !mountedRef.current) return;
          // Keep existing user data on error
          fetchedUser = profileData.user;
        }
      }

      if (signal.aborted || !mountedRef.current) return;

      // Fetch user posts explicitly using the API
      let userPostsData: any[] = [];
      if (fetchedUser) {
        try {
          // Always pass user ID to ensure proper filtering
          const targetUserId = isOwnProfile ? fetchedUser.id : userId;
          const userPostsResponse = await PostAPI.getUserPosts(token, targetUserId);
          userPostsData = userPostsResponse.posts || [];
          console.log('--- HOOK DEBUG: Fetched', userPostsData.length, 'user posts from API');
        } catch (error) {
          console.error('Failed to fetch user posts from API:', error);
          // Fallback to filtering from main store on API error
          userPostsData = allPosts.filter(post => post.author?.id === fetchedUser.id) || [];
          console.log('--- HOOK DEBUG: Using fallback filtering, found', userPostsData.length, 'posts');
        }
      }

      if (signal.aborted || !mountedRef.current) return;

      // Filter other content using stable utility function (but use API posts)
      const filteredContent = filterUserContent(fetchedUser, allPosts, allShowcases, allPortfolioItems);
      
      // Create new cache entry
      const newProfileData: ProfileDataCache = {
        user: fetchedUser,
        posts: userPostsData, // Use API-fetched posts instead of filtered ones
        showcases: filteredContent.showcases,
        portfolioItems: filteredContent.portfolioItems,
        timestamp: Date.now(),
        loading: false,
      };

      // Update cache and local state
      profileCache[userId] = newProfileData;
      setProfileData(newProfileData);

    } catch (error) {
      if (signal.aborted || !mountedRef.current) return;
      
      console.error('Failed to fetch profile data:', error);
      
      // On error, update loading state but keep existing data
      setProfileData(prev => ({ ...prev, loading: false }));
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [token, userId, isOwnProfile, refreshUserData]); // Remove circular dependencies

  // Refresh function for pull-to-refresh
  const refresh = useCallback(async () => {
    await fetchProfileData(true);
  }, [fetchProfileData]);

  // Smart refresh - only refresh if cache is expired or forced
  const smartRefresh = useCallback(async (force = false) => {
    const currentProfileData = profileDataRef.current;
    const isExpired = Date.now() - currentProfileData.timestamp > cacheTimeout;
    
    if (force || isExpired || currentProfileData.timestamp === 0) {
      await fetchProfileData();
    } else {
      // Update content from current store data without API call
      console.log('--- HOOK DEBUG: Using cached data, updating content from stores');
      const currentStores = {
        allPosts: usePostStore.getState().posts,
        allShowcases: useShowcaseStore.getState().entries,
        allPortfolioItems: usePortfolioStore.getState().items,
      };
      
      // Filter showcases and portfolio items only, keep existing user posts
      const filteredShowcases = currentStores.allShowcases
        .filter(entry => entry.author?.id === currentProfileData.user?.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const filteredPortfolioItems = currentStores.allPortfolioItems
        .filter(item => item.userId === currentProfileData.user?.id);
      
      // Only update if content has actually changed to prevent infinite loops
      const hasContentChanged = (
        filteredShowcases.length !== currentProfileData.showcases.length ||
        filteredPortfolioItems.length !== currentProfileData.portfolioItems.length
      );
      
      if (hasContentChanged) {
        console.log('--- HOOK DEBUG: Content changed, updating showcases/portfolio only');
        const updatedData = {
          ...currentProfileData,
          posts: currentProfileData.posts, // Keep existing user posts from API
          showcases: filteredShowcases,
          portfolioItems: filteredPortfolioItems,
          timestamp: Date.now(),
        };
        profileCache[userId] = updatedData;
        setProfileData(updatedData);
      } else {
        console.log('--- HOOK DEBUG: Content unchanged, skipping state update');
      }
    }
  }, [fetchProfileData, userId, cacheTimeout]); // Stable dependencies only

  // Single effect for initial load - only run once per userId change
  useEffect(() => {
    if (!token || !enableAutoRefresh) return;
    
    // Only fetch if we have no data or cache is expired
    const cached = profileCache[userId];
    const isCacheValid = cached && (Date.now() - cached.timestamp < cacheTimeout);
    
    if (!isCacheValid) {
      console.log('--- HOOK DEBUG: Initial fetch triggered for userId:', userId);
      fetchProfileData();
    } else {
      console.log('--- HOOK DEBUG: Using cached data for userId:', userId);
      setProfileData(cached);
    }
  }, [userId, token, enableAutoRefresh, cacheTimeout, fetchProfileData]); // Include fetchProfileData to ensure proper updates

  // REMOVED: Problematic useEffect that was causing infinite loops
  // Store changes will be handled manually through smartRefresh when needed

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    user: profileData.user,
    posts: profileData.posts,
    showcases: profileData.showcases,
    portfolioItems: profileData.portfolioItems,
    loading: profileData.loading,
    refreshing,
    refresh,
    smartRefresh,
    isCacheExpired: Date.now() - profileData.timestamp > cacheTimeout,
    lastUpdated: profileData.timestamp,
  };
};

export default useProfileData;
