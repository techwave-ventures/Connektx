// hooks/useProfileData.ts

import { useState, useEffect, useCallback, useRef } from 'react';

// Gate hook debug logs behind a debug flag
const DEBUG_PROFILE = typeof __DEV__ !== 'undefined' && __DEV__ && process.env.LOG_LEVEL === 'verbose';
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
    
    // Seed posts synchronously from existing stores to avoid blank UI
    const seedUserId = isOwnProfile ? (currentUser?.id || userId) : userId;
    const seedPosts = Array.isArray(allPosts)
      ? allPosts.filter(p => p?.author?.id === seedUserId)
      : [];

    // Initialize with seeded state
    return {
      user: isOwnProfile ? currentUser : null,
      posts: seedPosts,
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
      if (DEBUG_PROFILE) console.log('--- HOOK DEBUG: Throttling fetch request');
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

      // Start both requests as early as possible
      const seedUserId = isOwnProfile ? (useAuthStore.getState().user?.id || userId) : userId;
      const postsPromise = (async () => {
        try {
          const resp = await PostAPI.getUserPosts(token, seedUserId);
          return resp;
        } catch (e) {
          return e;
        }
      })();

      // Fetch user data (own vs other) in parallel
      let fetchedUser: User | null = null;
      let userPromise: Promise<void>;
      if (isOwnProfile) {
        userPromise = (async () => {
          await refreshUserData();
          if (signal.aborted || !mountedRef.current) return;
          fetchedUser = useAuthStore.getState().user;
        })();
      } else {
        userPromise = (async () => {
          try {
            const userResponse = await getUserById(token, userId);
            if (signal.aborted || !mountedRef.current) return;
            const userData = userResponse.body || userResponse.user || userResponse;
            if (!userData) throw new Error('No user data found in API response');
            fetchedUser = mapUserFromApi(userData);
          } catch (error) {
            console.error('Failed to fetch user profile:', error);
            if (signal.aborted || !mountedRef.current) return;
            // Keep existing user data on error
            fetchedUser = profileData.user;
          }
        })();
      }

      // Await user and posts concurrently
      const [postsResp] = await Promise.all([postsPromise, userPromise]);
      if (signal.aborted || !mountedRef.current) return;

      // Map posts response
      let userPostsData: any[] = [];
      try {
        const userPostsResponse: any = postsResp;
        if (userPostsResponse && !(userPostsResponse instanceof Error)) {
          const rawUserPosts = userPostsResponse?.posts || userPostsResponse?.body || userPostsResponse || [];
          try {
            const { mapApiPostToPost } = require('../utils/api-mappers');
            userPostsData = Array.isArray(rawUserPosts)
              ? rawUserPosts.map((p: any) => { try { return mapApiPostToPost(p); } catch { return null; } }).filter(Boolean)
              : [];
          } catch {
            userPostsData = Array.isArray(rawUserPosts) ? rawUserPosts : [];
          }
          if (DEBUG_PROFILE) console.log('--- HOOK DEBUG: Fetched', userPostsData.length, 'user posts from API');
        } else {
          throw userPostsResponse || new Error('Posts fetch error');
        }
      } catch (error) {
        console.error('Failed to fetch user posts from API:', error);
        // Fallback to filtering from main store on API error or if user not ready yet
        const fallbackUserId = fetchedUser?.id || seedUserId;
        userPostsData = allPosts.filter(post => post.author?.id === fallbackUserId) || [];
        if (DEBUG_PROFILE) console.log('--- HOOK DEBUG: Using fallback filtering, found', userPostsData.length, 'posts');
      }

      if (signal.aborted || !mountedRef.current) return;

      // Filter other content using stable utility function (but use API posts)
      const filteredContent = filterUserContent(fetchedUser, allPosts, allShowcases, allPortfolioItems);
      
      // Minimal enrichment of user posts with real community names (ID-matched only)
      let enrichedUserPosts = userPostsData;
      try {
        const { useCommunityStore } = require('../store/community-store');
        const communities: any[] = useCommunityStore.getState().communities || [];
        if (Array.isArray(communities) && communities.length > 0 && Array.isArray(userPostsData) && userPostsData.length > 0) {
          const byId: Record<string, any> = {};
          for (const c of communities) byId[c.id] = c;
          enrichedUserPosts = userPostsData.map((p: any) => {
            try {
              const isCommunityType = p?.type === 'community' || p?.type === 'question';
              const cid = p?.community?.id || p?.communityId;
              if (!isCommunityType || !cid || !byId[cid]) return p;
              const entity = byId[cid];
              // If name already present and matches, keep as-is
              if (p?.community?.name && p.community.name === entity.name) return p;
              return {
                ...p,
                community: {
                  id: entity.id,
                  name: entity.name,
                  logo: entity.logo || p?.community?.logo || null,
                  isPrivate: !!entity.isPrivate,
                },
              };
            } catch { return p; }
          });
        }
      } catch { /* non-fatal */ }
      
      // Create new cache entry
      const newProfileData: ProfileDataCache = {
        user: fetchedUser,
        posts: enrichedUserPosts, // Use API-fetched posts with safe enrichment
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
      if (DEBUG_PROFILE) console.log('--- HOOK DEBUG: Using cached data, updating content from stores');
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
        if (DEBUG_PROFILE) console.log('--- HOOK DEBUG: Content changed, updating showcases/portfolio only');
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
        if (DEBUG_PROFILE) console.log('--- HOOK DEBUG: Content unchanged, skipping state update');
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
      if (DEBUG_PROFILE) console.log('--- HOOK DEBUG: Initial fetch triggered for userId:', userId);
      fetchProfileData();
    } else {
      if (DEBUG_PROFILE) console.log('--- HOOK DEBUG: Using cached data for userId:', userId);
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
