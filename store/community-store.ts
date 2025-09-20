import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as CommunityAPI from '../api/community';
import { safeSplit } from '../utils/safeSplit';
import { useAuthStore } from './auth-store';
import { Aperture } from 'lucide-react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';

// Helper functions for safe data processing
const ensureArray = (value: any): string[] => {
  try {
    if (Array.isArray(value)) {
      return value.filter(item => item && typeof item === 'string');
    }
    if (typeof value === 'string' && value.trim()) {
      return safeSplit(value, ',');
    }
    return [];
  } catch (error) {
    console.warn('ensureArray error:', error, 'for value:', value);
    return [];
  }
};

const ensureTagsArray = (tags: any): string[] => {
  try {
    if (Array.isArray(tags)) {
      return tags.filter(tag => tag && typeof tag === 'string' && tag.trim());
    }
    if (typeof tags === 'string' && tags.trim()) {
      return safeSplit(tags, ',').filter(tag => tag.trim());
    }
    return [];
  } catch (error) {
    console.warn('ensureTagsArray error:', error, 'for tags:', tags);
    return [];
  }
};

export interface Community {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  logo?: string;
  tags: string[];
  location?: string;
  memberCount: number;
  members: string[];
  admins: string[];
  moderators: string[];
  owner: string; // Community creator/owner ID
  isPrivate: boolean;
  requiresApproval: boolean; // Whether join requests need approval
  lastActivity: string;
  createdAt: string;
  createdBy: string;
  posts: CommunityPost[];
  resources: CommunityResource[];
  announcements: CommunityAnnouncement[];
  joinRequests: JoinRequest[];
  bannedUsers: string[];
  settings: CommunitySettings;
}

export interface CommunityPost {
  id: string;
  communityId: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  images?: string[];
  type: 'text' | 'question' | 'poll' | 'resource';
  likes: string[];
  likesCount?: number;
  likedByCurrentUser?: boolean;
  comments: CommunityComment[];
  isPinned: boolean;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  likes: string[];
  createdAt: string;
}


export interface CommunityResource {
  id: string;
  communityId: string;
  title: string;
  description: string;
  url: string;
  type: 'pdf' | 'link' | 'video' | 'document';
  uploadedBy: string;
  uploadedAt: string;
}

export interface CommunityAnnouncement {
  id: string;
  communityId: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface JoinedCommunity {
  communityId: string;
  joinedAt: string;
  role: 'member' | 'moderator' | 'admin' | 'owner';
}

export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  communityId: string;
  message?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface CommunitySettings {
  allowMemberPosts: boolean;
  allowMemberEvents: boolean;
  autoApproveJoins: boolean;
  allowExternalSharing: boolean;
  moderationLevel: 'low' | 'medium' | 'high';
  welcomeMessage?: string;
}

interface CommunityState {
  communities: Community[];
  joinedCommunities: JoinedCommunity[];
  activeCommunity: Community | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterType: 'all' | 'trending' | 'nearby' | 'joined';
  isInitialized: boolean;
  
  // New API integration actions
  initializeCommunities: (token?: string) => Promise<void>;
  refreshCommunities: (token?: string) => Promise<void>;
  
  // Community actions
  createCommunity: (token: string, communityData: CommunityAPI.CreateCommunityData) => Promise<void>;
  updateCommunity: (token: string, id: string, communityData: Partial<CommunityAPI.CreateCommunityData>) => Promise<void>;
  deleteCommunity: (token: string, id: string) => Promise<void>;
  joinCommunity: (token: string, communityId: string, message?: string) => Promise<void>;
  leaveCommunity: (token: string, communityId: string) => Promise<void>;
  setActiveCommunity: (id: string) => void;
  loadCommunityDetails: (token: string, communityId: string) => Promise<void>;
  fetchCommunityPosts: (token: string, communityId: string, filters?: { sortBy?: 'best' | 'new' | 'top' }) => Promise<void>;
  fetchAllCommunityPosts: (token: string, communityIds?: string[]) => Promise<void>;
  
  // API Post actions
  createPost: (token: string, communityId: string, postData: CommunityAPI.CreatePostData) => Promise<void>;
  likePost: (token: string, postId: string) => Promise<void>;
  addComment: (token: string, postId: string, content: string) => Promise<void>;
  
  // API Event actions
  createCommunityEvent: (token: string, communityId: string, eventData: any) => Promise<void>;
  fetchCommunityEvents: (token: string, communityId: string) => Promise<void>;
  canCreateEvent: (communityId: string, userId: string) => boolean;
  
  // API Moderation actions
  pinPost: (token: string, communityId: string, postId: string) => Promise<void>;
  unpinPost: (token: string, communityId: string, postId: string) => Promise<void>;
  deletePost: (token: string, communityId: string, postId: string) => Promise<void>;
  
  // API Member management
  assignRole: (token: string, communityId: string, memberId: string, role: 'admin' | 'moderator') => Promise<void>;
  removeMember: (token: string, communityId: string, memberId: string) => Promise<void>;
  
  // API Join request management
  approveJoinRequest: (token: string, requestId: string) => Promise<void>;
  rejectJoinRequest: (token: string, requestId: string) => Promise<void>;
  
  
  // Helper functions
  getUserRole: (communityId: string, userId: string) => 'owner' | 'admin' | 'moderator' | 'member' | null;
  isOwner: (communityId: string, userId: string) => boolean;
  isAdmin: (communityId: string, userId: string) => boolean;
  isModerator: (communityId: string, userId: string) => boolean;
  
  // Legacy methods (deprecated)
  requestToJoin: (communityId: string, userId: string, userName: string, userAvatar?: string, message?: string) => void;
  removeRole: (communityId: string, userId: string, removedBy: string) => void;
  banMember: (communityId: string, userId: string, bannedBy: string) => void;
  unbanMember: (communityId: string, userId: string, unbannedBy: string) => void;
  transferOwnership: (communityId: string, newOwnerId: string, currentOwnerId: string) => void;
  deleteComment: (communityId: string, postId: string, commentId: string, deletedBy: string) => void;
  updateCommunitySettings: (communityId: string, settings: Partial<CommunitySettings>, updatedBy: string) => void;
  likeComment: (commentId: string, userId: string) => void;
  addResource: (communityId: string, resourceData: Omit<CommunityResource, 'id' | 'uploadedAt'>) => void;
  createAnnouncement: (communityId: string, announcementData: Omit<CommunityAnnouncement, 'id' | 'createdAt'>) => void;
  
  // Analytics for owners
  getCommunityAnalytics: (communityId: string) => {
    totalMembers: number;
    totalPosts: number;
    totalComments: number;
    totalLikes: number;
    totalResources: number;
    recentJoins: number;
    engagementRate: number;
  };
  
  // Search and filter
  setSearchQuery: (query: string) => void;
  setFilterType: (filter: 'all' | 'trending' | 'nearby' | 'joined') => void;
  getFilteredCommunities: () => Community[];
}

export const useCommunityStore = create<CommunityState>()(
  persist(
    (set, get) => ({
      communities: [],
      joinedCommunities: [],
      activeCommunity: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      filterType: 'all',
      isInitialized: false,

      // Initialize communities from backend
      initializeCommunities: async (token?: string) => {
        if (get().isInitialized) return;
        
        try {
          set({ isLoading: true, error: null });
          console.log('initializeCommunities: Starting initialization with valid token');
          
          // Fetch all communities (required) and user communities (optional)
          const hasToken = !!(token && typeof token === 'string' && token.trim() !== '');
          const allCommunitiesResponse = await CommunityAPI.getAllCommunities(hasToken ? token : undefined);
          
          // Try to get user communities, but don't fail if it doesn't work
          let userCommunitiesResponse = null as any;
          if (hasToken) {
            try {
              userCommunitiesResponse = await CommunityAPI.getUserCommunities(token!);
            } catch (userCommunitiesError: any) {
              console.warn('getUserCommunities failed, continuing without user community data:', userCommunitiesError?.message);
              // This is okay - we can still show all communities even without user-specific data
            }
          }
          
          // Safely extract communities with defensive checks and tags processing
          let allCommunities = [];
          
          // Handle different response formats
          if (allCommunitiesResponse?.communities && Array.isArray(allCommunitiesResponse.communities)) {
            allCommunities = allCommunitiesResponse.communities;
          } else if (allCommunitiesResponse && Array.isArray(allCommunitiesResponse)) {
            allCommunities = allCommunitiesResponse;
          } else {
            console.warn('getAllCommunities returned unexpected format:', allCommunitiesResponse);
            allCommunities = [];
          }
            
          // Ensure all communities have proper tags array format
          allCommunities = allCommunities.map(community => {
            try {
              return {
                ...community,
                id: community.id || community._id,
                // Ensure we have a usable owner id even if backend uses createdBy
                owner: (community as any).owner || (community as any).createdBy || '',
                tags: ensureTagsArray(community.tags),
                members: ensureArray(community.members),
                admins: ensureArray(community.admins),
                moderators: ensureArray(community.moderators),
                bannedUsers: ensureArray(community.bannedUsers),
                posts: Array.isArray(community.posts) ? community.posts : [],
                resources: Array.isArray(community.resources) ? community.resources : [],
                announcements: Array.isArray(community.announcements) ? community.announcements : [],
                joinRequests: Array.isArray(community.joinRequests) ? community.joinRequests : [],
                memberCount: typeof community.memberCount === 'number' ? community.memberCount : 0,
                settings: community.settings || {
                  allowMemberPosts: true,
                  allowMemberEvents: true,
                  autoApproveJoins: true,
                  allowExternalSharing: true,
                  moderationLevel: 'medium'
                }
              };
            } catch (error) {
              console.warn('Error processing community data:', error, 'for community:', community);
              return {
                ...community,
                id: community.id || community._id || `fallback-${Date.now()}`,
                name: community.name || 'Unknown Community',
                description: community.description || 'No description available',
                tags: [],
                members: [],
                admins: [],
                moderators: [],
                bannedUsers: [],
                posts: [],
                resources: [],
                announcements: [],
                joinRequests: [],
                memberCount: 0,
                isPrivate: Boolean(community.isPrivate),
                requiresApproval: Boolean(community.requiresApproval),
                lastActivity: community.lastActivity || new Date().toISOString(),
                createdAt: community.createdAt || new Date().toISOString(),
                createdBy: (community as any).createdBy || 'unknown',
                owner: (community as any).owner || (community as any).createdBy || 'unknown',
                settings: {
                  allowMemberPosts: true,
                  autoApproveJoins: true,
                  allowExternalSharing: true,
                  moderationLevel: 'medium'
                }
              };
            }
          });
            
          // Handle user communities (optional) and convert to JoinedCommunity format
          let userCommunities: JoinedCommunity[] = [];
          if (userCommunitiesResponse) {
            let rawUserCommunities = [];
            if (userCommunitiesResponse?.communities && Array.isArray(userCommunitiesResponse.communities)) {
              rawUserCommunities = userCommunitiesResponse.communities;
            } else if (userCommunitiesResponse && Array.isArray(userCommunitiesResponse)) {
              rawUserCommunities = userCommunitiesResponse;
            } else {
              console.warn('getUserCommunities returned unexpected format:', userCommunitiesResponse);
            }
            
            // Convert to JoinedCommunity format
            userCommunities = rawUserCommunities.map((community: any) => ({
              communityId: community._id || community.id,
              joinedAt: community.joinedAt || new Date().toISOString(),
              role: (community.userRole as 'member' | 'moderator' | 'admin' | 'owner') || 'member'
            }));
            
            console.log('Converted user communities to JoinedCommunity format:', userCommunities);
          }
          // If userCommunities failed, we'll just show all communities without user-specific join status
          
          console.log('initializeCommunities: Successfully loaded', allCommunities.length, 'communities and', userCommunities.length, 'user communities');
          
          if (userCommunities.length === 0 && userCommunitiesResponse === null) {
            console.log('Note: User communities data unavailable, showing all communities without join status');
          }
          
          set({
            communities: allCommunities,
            joinedCommunities: userCommunities,
            isLoading: false,
            isInitialized: true,
            error: null
          });

          // After communities are loaded, fetch posts for all communities in the background
          if (hasToken && allCommunities.length > 0) {
            console.log('initializeCommunities: Starting background post fetching for', allCommunities.length, 'communities');
            // Don't await this - let it run in the background
            get().fetchAllCommunityPosts(token!).catch(error => {
              console.warn('Background post fetching failed during initialization:', error);
              // This is non-critical, so we don't show an error to the user
            });
          }
        } catch (error) {
          console.error('Failed to initialize communities:', error);
          set({ 
            communities: [],
            joinedCommunities: [],
            error: error instanceof Error ? error.message : 'Failed to initialize communities',
            isLoading: false,
            isInitialized: true
          });
        }
      },

      // Refresh communities data
      refreshCommunities: async (token?: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const hasToken = !!(token && typeof token === 'string' && token.trim() !== '');
          // Fetch all communities (required)
          const allCommunitiesResponse = await CommunityAPI.getAllCommunities(hasToken ? token : undefined);
          
          // Try to get user communities, but don't fail if it doesn't work
          let userCommunitiesResponse = null as any;
          if (hasToken) {
            try {
              userCommunitiesResponse = await CommunityAPI.getUserCommunities(token!);
            } catch (userCommunitiesError: any) {
              console.warn('getUserCommunities failed during refresh, continuing without user community data:', userCommunitiesError?.message);
            }
          }
          
          // Safely extract communities with defensive checks and normalize shape
          let allCommunities = Array.isArray(allCommunitiesResponse?.communities) 
            ? allCommunitiesResponse.communities 
            : Array.isArray(allCommunitiesResponse) 
              ? allCommunitiesResponse 
              : [];

          // Normalize community shape to ensure safe defaults
          allCommunities = allCommunities.map((community: any) => ({
            ...community,
            id: community.id || community._id,
            owner: community.owner || community.createdBy || '',
            tags: ensureTagsArray(community.tags),
            members: ensureArray(community.members),
            admins: ensureArray(community.admins),
            moderators: ensureArray(community.moderators),
            bannedUsers: ensureArray(community.bannedUsers),
            posts: Array.isArray(community.posts) ? community.posts : [],
            resources: Array.isArray(community.resources) ? community.resources : [],
            announcements: Array.isArray(community.announcements) ? community.announcements : [],
            joinRequests: Array.isArray(community.joinRequests) ? community.joinRequests : [],
            memberCount: typeof community.memberCount === 'number' ? community.memberCount : 0,
            settings: community.settings || {
              allowMemberPosts: true,
              autoApproveJoins: true,
              allowExternalSharing: true,
              moderationLevel: 'medium'
            }
          }));
            
          // Convert user communities to JoinedCommunity format
          let userCommunities: JoinedCommunity[] = [];
          if (userCommunitiesResponse && Array.isArray(userCommunitiesResponse?.communities)) {
            userCommunities = userCommunitiesResponse.communities.map((community: any) => ({
              communityId: community._id || community.id,
              joinedAt: community.joinedAt || new Date().toISOString(),
              role: (community.userRole as 'member' | 'moderator' | 'admin' | 'owner') || 'member'
            }));
            console.log('Refresh: Converted user communities to JoinedCommunity format:', userCommunities);
          }
          
          set({
            communities: allCommunities,
            joinedCommunities: userCommunities,
            isLoading: false,
            error: null
          });

          // After communities are refreshed, also refresh posts in the background
          if (hasToken && allCommunities.length > 0) {
            console.log('refreshCommunities: Starting background post refresh for', allCommunities.length, 'communities');
            // Don't await this - let it run in the background
            get().fetchAllCommunityPosts(token!).catch(error => {
              console.warn('Background post refresh failed:', error);
              // This is non-critical, so we don't show an error to the user
            });
          }
        } catch (error) {
          console.error('Failed to refresh communities:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to refresh communities',
            isLoading: false
          });
        }
      },

      // Community actions with API integration
      createCommunity: async (token: string, communityData: CommunityAPI.CreateCommunityData) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await CommunityAPI.createCommunity(token, communityData);
          
          // Add the new community to the local state
          set(state => ({
            communities: [...state.communities, response.community],
            joinedCommunities: [...state.joinedCommunities, {
              communityId: response.community.id,
              joinedAt: new Date().toISOString(),
              role: 'owner'
            }],
            activeCommunity: response.community,
            isLoading: false
          }));
        } catch (error) {
          console.error('Failed to create community:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create community',
            isLoading: false
          });
          throw error;
        }
      },

      updateCommunity: async (token: string, id: string, communityData: Partial<CommunityAPI.CreateCommunityData>) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await CommunityAPI.updateCommunity(token, id, communityData);
          
          set(state => ({
            communities: state.communities.map(community => 
              community.id === id ? response.community : community
            ),
            activeCommunity: state.activeCommunity?.id === id 
              ? response.community 
              : state.activeCommunity,
            isLoading: false
          }));
        } catch (error) {
          console.error('Failed to update community:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update community',
            isLoading: false
          });
          throw error;
        }
      },

      deleteCommunity: async (token: string, id: string) => {
        try {
          set({ isLoading: true, error: null });
          
          await CommunityAPI.deleteCommunity(token, id);
          
          set(state => {
            const newCommunities = state.communities.filter(community => community.id !== id);
            return {
              communities: newCommunities,
              joinedCommunities: state.joinedCommunities.filter(jc => jc.communityId !== id),
              activeCommunity: state.activeCommunity?.id === id 
                ? newCommunities.length > 0 ? newCommunities[0] : null 
                : state.activeCommunity,
              isLoading: false
            };
          });
        } catch (error) {
          console.error('Failed to delete community:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete community',
            isLoading: false
          });
          throw error;
        }
      },

      joinCommunity: async (token: string, communityId: string, message?: string) => {
        console.log('📋 [CommunityStore] Starting joinCommunity process...');
        console.log('  Parameters:', {
          communityId,
          hasToken: !!token,
          tokenLength: token?.length || 0,
          message,
          timestamp: new Date().toISOString()
        });
        
        const currentState = get();
        console.log('  Current state:', {
          communitiesCount: currentState.communities.length,
          joinedCommunitiesCount: currentState.joinedCommunities.length,
          isLoading: currentState.isLoading,
          error: currentState.error
        });
        
        try {
          console.log('  🔄 Setting loading state to true...');
          set({ isLoading: true, error: null });
          
          console.log('  📡 Making API call to joinCommunity...');
          const apiCallStartTime = Date.now();
          const response = await CommunityAPI.joinCommunity(token, communityId, message);
          const apiCallEndTime = Date.now();
          
          console.log('  ✅ API call successful!');
          console.log('    API call duration:', apiCallEndTime - apiCallStartTime, 'ms');
          console.log('    Response structure:', {
            hasResponse: !!response,
            hasCommunity: !!(response && response.community),
            responseKeys: response ? Object.keys(response) : [],
            communityId: response?.community?.id,
            communityName: response?.community?.name
          });
          
          // Check if the user is already in joinedCommunities to avoid duplicates
          const currentJoinedCommunities = get().joinedCommunities;
          const alreadyJoined = currentJoinedCommunities.some(jc => jc.communityId === communityId);
          
          console.log('  📊 Updating local state...');
          console.log('    Already in joinedCommunities:', alreadyJoined);
          
          // Update local state with the updated community data
          set(state => {
            const updatedCommunities = state.communities.map(community => 
              community.id === communityId ? (response.community || community) : community
            );
            
            const updatedJoinedCommunities = alreadyJoined 
              ? state.joinedCommunities
              : [...state.joinedCommunities, {
                  communityId,
                  joinedAt: new Date().toISOString(),
                  role: 'member'
                }];
            
            console.log('    State update:', {
              communitiesUpdated: updatedCommunities.length,
              joinedCommunitiesCount: updatedJoinedCommunities.length,
              addedNewJoinedCommunity: !alreadyJoined
            });
            
            return {
              communities: updatedCommunities,
              joinedCommunities: updatedJoinedCommunities,
              isLoading: false
            };
          });
          
          console.log('  🎉 [CommunityStore] joinCommunity completed successfully!');
          
        } catch (error: any) {
          console.error('  ❌ [CommunityStore] joinCommunity failed:');
          console.error('    Error type:', typeof error);
          console.error('    Error name:', error?.name);
          console.error('    Error message:', error?.message);
          console.error('    Error stack:', error?.stack);
          console.error('    Full error:', error);
          
          const message = error?.message || String(error);
          console.log('    Checking for "Already a member" condition...');
          
          if (message.includes('Already a member')) {
            console.log('  ℹ️ User is already a member - treating as success');
            console.log('    Setting loading to false and clearing error');
            set({ isLoading: false, error: null });
            return;
          }
          
          console.log('  🚨 Setting error state and rethrowing...');
          set({ 
            error: error instanceof Error ? error.message : 'Failed to join community',
            isLoading: false
          });
          
          console.error('  📤 Rethrowing error for UI handling');
          throw error;
        }
      },

      leaveCommunity: async (token: string, communityId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await CommunityAPI.leaveCommunity(token, communityId);
          
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId ? response.community : community
            ),
            joinedCommunities: state.joinedCommunities.filter(jc => jc.communityId !== communityId),
            isLoading: false
          }));
        } catch (error) {
          console.error('Failed to leave community:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to leave community',
            isLoading: false
          });
          throw error;
        }
      },

      setActiveCommunity: (id: string) => {
        const community = get().communities.find(c => c.id === id);
        if (community) {
          set({ activeCommunity: community });
        }
      },

      loadCommunityDetails: async (token: string, communityId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await CommunityAPI.getCommunityById(token, communityId);
          
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId ? response.community : community
            ),
            activeCommunity: state.activeCommunity?.id === communityId 
              ? response.community 
              : state.activeCommunity,
            isLoading: false
          }));

          // Also fetch posts for this community
          try {
            await get().fetchCommunityPosts(token, communityId);
          } catch (postsError) {
            console.warn('Failed to fetch community posts, but community details loaded:', postsError);
          }
        } catch (error) {
          console.error('Failed to load community details:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load community details',
            isLoading: false
          });
          throw error;
        }
      },

      fetchCommunityPosts: async (token: string, communityId: string, filters?: { sortBy?: 'best' | 'new' | 'top' }) => {
        try {
          console.log('Fetching posts for community:', communityId);
          const response = await CommunityAPI.getCommunityPosts(token, communityId, filters);
          
          // Extract posts from API response
          let posts: any[] = [];
          if (response?.success === false) {
            console.warn(`Community API returned error for ${communityId}:`, response?.message || response?.error);
            // For schema errors or backend issues, return empty posts array instead of failing
            if (response?.error?.includes('strictPopulate') || response?.error?.includes('schema')) {
              console.log(`Skipping posts for community ${communityId} due to backend schema issue`);
              posts = [];
            } else {
              throw new Error(response?.message || response?.error || 'Unknown API error');
            }
          } else if (response?.posts && Array.isArray(response.posts)) {
            posts = response.posts;
          } else if (response && Array.isArray(response)) {
            posts = response;
          } else {
            console.warn('getCommunityPosts returned unexpected format:', response);
            posts = []; // Fallback to empty array
          }

          const currentUserId = useAuthStore.getState().user?.id;
          const normalizeLikes = (likesRaw: any) => {
            try {
              let likesArray: string[] = [];
              let count: number | undefined = undefined;

              if (Array.isArray(likesRaw)) {
                if (likesRaw.length > 0) {
                  if (typeof likesRaw[0] === 'string') {
                    likesArray = likesRaw.filter(Boolean);
                  } else if (typeof likesRaw[0] === 'object') {
                    likesArray = likesRaw
                      .map((l: any) => l?.userId || l?.user?.id || l?.id || l?._id)
                      .filter(Boolean);
                  }
                }
                count = likesArray.length;
              } else if (typeof likesRaw === 'number') {
                // We only know the count, not who liked
                count = likesRaw;
                likesArray = [];
              } else if (likesRaw && typeof likesRaw === 'object') {
                // Possible shapes: { count, users: [] } or { likers: [] }
                const users = Array.isArray((likesRaw as any).users)
                  ? (likesRaw as any).users
                  : Array.isArray((likesRaw as any).likers)
                    ? (likesRaw as any).likers
                    : [];
                if (users.length > 0) {
                  if (typeof users[0] === 'string') {
                    likesArray = users.filter(Boolean);
                  } else {
                    likesArray = users
                      .map((u: any) => u?.userId || u?.user?.id || u?.id || u?._id)
                      .filter(Boolean);
                  }
                }
                count = (likesRaw as any).count ?? likesArray.length;
              } else {
                likesArray = [];
                count = 0;
              }

              const liked = !!(currentUserId && likesArray.includes(currentUserId));
              return { likesArray, count: count ?? likesArray.length, liked };
            } catch (e) {
              console.warn('normalizeLikes error:', e);
              return { likesArray: [], count: 0, liked: false };
            }
          };

          // Normalize posts: IDs, comments, and likes
          const prevCommunity = get().communities.find(c => c.id === communityId);
          const normalizedPosts = posts.map((p: any) => {
            console.log('📝 Raw community post from API:', JSON.stringify({ id: p?._id, discription: p?.discription, content: p?.content }, null, 2));
            
            const { likesArray, count, liked } = normalizeLikes(p?.likes);
            const pid = p?.id || p?._id;
            const pidStr = String(pid);
            const prevPost = prevCommunity?.posts?.find(pp => String(pp.id) === pidStr);
            const prevLiked = !!(prevPost && ((prevPost as any).likedByCurrentUser || (Array.isArray(prevPost.likes) && currentUserId && prevPost.likes.includes(currentUserId))));
            // Overlay persisted like state to avoid flip after refresh
            let overlayLiked = false;
            try {
              const { useLikeStore } = require('./like-store');
              overlayLiked = useLikeStore.getState().isLiked(pidStr);
            } catch {}

            return {
              ...p,
              id: pidStr,
              communityId: p?.communityId || communityId,
              // Ensure content is mapped from discription if needed
              content: p?.discription || p?.content || '',
              discription: p?.discription || p?.content || '',
              likes: likesArray,
              likesCount: count,
              likedByCurrentUser: overlayLiked || liked || prevLiked,
              comments: Array.isArray(p?.comments)
                ? p.comments.map((c: any) => ({
                    ...c,
                    id: c?.id || c?._id,
                    postId: c?.postId || pid,
                  }))
                : [],
            } as any;
          });

          // Update the community with fetched posts
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId 
                ? { ...community, posts: normalizedPosts }
                : community
            ),
            activeCommunity: state.activeCommunity?.id === communityId 
              ? { ...state.activeCommunity, posts: normalizedPosts }
              : state.activeCommunity,
          }));

          console.log('Successfully fetched', posts.length, 'posts for community', communityId);
        } catch (error) {
          console.error('Failed to fetch community posts:', error);
          // Don't throw here - we want community to still load even if posts fail
        }
      },

      fetchAllCommunityPosts: async (token: string, communityIds?: string[]) => {
        try {
          const { communities } = get();
          const targetCommunities = communityIds ? 
            communities.filter(c => communityIds.includes(c.id)) : 
            communities;

          console.log('Fetching posts for', targetCommunities.length, 'communities');

          // Fetch posts for multiple communities concurrently, but limit concurrency
          const batchSize = 3; // Fetch 3 communities at a time to avoid overwhelming the server
          
          for (let i = 0; i < targetCommunities.length; i += batchSize) {
            const batch = targetCommunities.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (community) => {
              try {
                await get().fetchCommunityPosts(token, community.id, { sortBy: 'new' });
              } catch (error: any) {
                const errorMessage = error?.message || String(error);
                if (errorMessage.includes('schema') || errorMessage.includes('strictPopulate')) {
                  console.warn(`🔴 Community ${community.name} (${community.id}) has backend schema issues - skipping posts`);
                } else {
                  console.warn(`⚠️ Failed to fetch posts for community ${community.name} (${community.id}):`, errorMessage);
                }
                // Don't fail the entire batch if one community fails
              }
            });

            // Wait for this batch to complete before moving to the next
            await Promise.all(batchPromises);
          }

          console.log('Completed fetching posts for all communities');
        } catch (error) {
          console.error('Failed to fetch posts for all communities:', error);
          // Don't throw here - we want the communities list to still work
        }
      },
      
      // Community event actions with API integration
      createCommunityEvent: async (token: string, communityId: string, eventData: any) => {
        try {
          set({ isLoading: true, error: null });
          
          const { createCommunityEvent } = require('../api/event');
          const response = await createCommunityEvent(token, communityId, eventData);
          
          // Update local state - add event to community
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId 
                ? { 
                    ...community, 
                    lastActivity: new Date().toISOString()
                  }
                : community
            ),
            isLoading: false
          }));
          
          console.log('✅ Community event created successfully:', response);
        } catch (error) {
          console.error('Failed to create community event:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create community event',
            isLoading: false
          });
          throw error;
        }
      },
      
      fetchCommunityEvents: async (token: string, communityId: string) => {
        try {
          const { fetchCommunityEvents } = require('../api/event');
          const events = await fetchCommunityEvents(token, communityId);
          
          // Note: Events might be stored in a separate store, so this is just for tracking
          console.log(`Fetched ${events.length} events for community ${communityId}`);
          
          return events;
        } catch (error) {
          console.error('Failed to fetch community events:', error);
          // Don't throw here - we want community to still load even if events fail
          return [];
        }
      },
      
      canCreateEvent: (communityId: string, userId: string) => {
        const { communities } = get();
        const community = communities.find(c => c.id === communityId);
        if (!community) return false;
        
        // Check if user has permission to create events
        const isOwner = community.owner === userId;
        const isAdmin = Array.isArray(community.admins) && community.admins.includes(userId);
        const isModerator = Array.isArray(community.moderators) && community.moderators.includes(userId);
        const isMember = Array.isArray(community.members) && community.members.includes(userId);
        
        // Owners and admins can always create events
        if (isOwner || isAdmin) return true;
        
        // Moderators can create events if the community allows it
        if (isModerator) return true;
        
        // Members can create events only if the community setting allows it
        if (isMember && community.settings?.allowMemberEvents) return true;
        
        return false;
      },

      // Community post actions with API integration
      createPost: async (token: string, communityId: string, postData: CommunityAPI.CreatePostData & { imageUris?: string[] }) => {
        try {
          set({ isLoading: true, error: null });
          
          // Use the new image-handling function if we have image URIs
          const response = postData.imageUris && postData.imageUris.length > 0
            ? await CommunityAPI.createCommunityPostWithFiles(token, communityId, postData)
            : await CommunityAPI.createCommunityPost(token, communityId, postData);

          // Normalize created post likes/comments to keep UI consistent
          const currentUserId = useAuthStore.getState().user?.id;
          const normalizeLikes = (likesRaw: any) => {
            let likesArray: string[] = [];
            let count: number | undefined = undefined;
            if (Array.isArray(likesRaw)) {
              if (likesRaw.length > 0) {
                if (typeof likesRaw[0] === 'string') likesArray = likesRaw.filter(Boolean);
                else likesArray = likesRaw.map((l: any) => l?.userId || l?.user?.id || l?.id || l?._id).filter(Boolean);
              }
              count = likesArray.length;
            } else if (typeof likesRaw === 'number') {
              count = likesRaw; likesArray = [];
            } else if (likesRaw && typeof likesRaw === 'object') {
              const users = Array.isArray(likesRaw.users) ? likesRaw.users : Array.isArray((likesRaw as any).likers) ? (likesRaw as any).likers : [];
              likesArray = users.map((u: any) => u?.userId || u?.user?.id || u?.id || u?._id).filter(Boolean);
              count = (likesRaw as any).count ?? likesArray.length;
            } else { likesArray = []; count = 0; }
            const liked = !!(currentUserId && likesArray.includes(currentUserId));
            return { likesArray, count: count ?? likesArray.length, liked };
          };

          const created = response?.post || response?.body || response;
          console.log('📝 Raw post data from backend:', JSON.stringify(created, null, 2));
          
          const { likesArray, count, liked } = normalizeLikes(created?.likes);
          const normalizedCreated = {
            ...created,
            id: created?.id || created?._id,
            communityId,
            likes: likesArray,
            likesCount: count,
            likedByCurrentUser: liked,
            comments: Array.isArray(created?.comments)
              ? created.comments.map((c: any) => ({
                  ...c,
                  id: c?.id || c?._id,
                  postId: c?.postId || (created?.id || created?._id),
                }))
              : [],
          } as any;
          
          console.log('🔍 [CommunityStore] Normalized post images:', {
            originalImages: created?.images,
            originalMedia: created?.media,
            normalizedImages: normalizedCreated.images,
            normalizedMedia: normalizedCreated.media,
            allKeys: Object.keys(normalizedCreated || {})
          });
          
          // Update local state with the new post
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId 
                ? { 
                    ...community, 
                    posts: [...community.posts, normalizedCreated],
                    lastActivity: new Date().toISOString()
                  }
                : community
            ),
            isLoading: false
          }));
          
          // Sync the new post to the post store (home feed) immediately
          try {
            const { usePostStore } = require('./post-store');
            const community = get().communities.find(c => c.id === communityId);
            
            if (community) {
              console.log('🏠 Syncing new community post to home feed...');
              
              // Map the community post to the home feed format
              const finalImages = normalizedCreated.images || normalizedCreated.media || normalizedCreated.imageUrls || [];
              console.log('🏠 [HomeFeedSync] Mapping images:', {
                fromImages: normalizedCreated.images,
                fromMedia: normalizedCreated.media,
                fromImageUrls: normalizedCreated.imageUrls,
                finalImages,
                finalImagesLength: Array.isArray(finalImages) ? finalImages.length : 'not array'
              });
              
              const mappedPost = {
                id: normalizedCreated.id,
                author: {
                  id: normalizedCreated.userId || normalizedCreated.UserId || currentUserId || '',
                  _id: normalizedCreated.userId || normalizedCreated.UserId || currentUserId || '',
                  name: normalizedCreated.authorName || useAuthStore.getState().user?.name || 'Unknown',
                  username: (normalizedCreated.authorName || useAuthStore.getState().user?.name || 'user').toLowerCase().replace(/\s+/g, ''),
                  email: '',
                  profileImage: normalizedCreated.authorAvatar || useAuthStore.getState().user?.avatar || '',
                  avatar: normalizedCreated.authorAvatar || useAuthStore.getState().user?.avatar || '',
                },
                content: normalizedCreated.discription || normalizedCreated.content || '',
                images: finalImages,
                createdAt: normalizedCreated.createdAt || new Date().toISOString(),
                likes: normalizedCreated.likesCount || 0,
                comments: Array.isArray(normalizedCreated.comments) ? normalizedCreated.comments.length : 0,
                reposts: 0,
                isLiked: normalizedCreated.likedByCurrentUser || false,
                isBookmarked: false,
                isReposted: false,
                commentsList: normalizedCreated.comments || [],
                community: {
                  id: community.id,
                  name: community.name,
                  logo: community.logo,
                  isPrivate: community.isPrivate,
                },
          type: normalizedCreated.type === 'question' ? 'question' as const : 'community' as const,
                pollOptions: normalizedCreated.pollOptions,
                totalVotes: normalizedCreated.totalVotes || 0,
                hasVoted: false,
                userVote: undefined,
              };
              
              // Add the post to the beginning of the home feed
              usePostStore.setState(state => ({
                posts: [mappedPost, ...state.posts]
              }));
              
              console.log('✅ Successfully synced community post to home feed');
            }
          } catch (syncError) {
            console.warn('⚠️ Failed to sync community post to home feed:', syncError);
            // Don't throw error here as the post was successfully created in community
          }
        } catch (error) {
          console.error('Failed to create community post:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create post',
            isLoading: false
          });
          throw error;
        }
      },

      likePost: async (token: string, postId: string) => {
        // Optimistic like: add current user to likes/count if not already present
        const currentUserId = useAuthStore.getState().user?.id;
        let didOptimistic = false;
        if (currentUserId) {
          set(state => ({
            communities: state.communities.map(community => ({
              ...community,
              posts: community.posts.map(post => {
                if (post.id !== postId) return post;
                const hasLiked = (Array.isArray(post.likes) && post.likes.includes(currentUserId)) || post.likedByCurrentUser;
                if (hasLiked) return post; // only once
                didOptimistic = true;
                const baseCount = typeof post.likesCount === 'number' ? post.likesCount : (post.likes?.length || 0);
                return { 
                  ...post, 
                  likes: [...(post.likes || []), currentUserId],
                  likesCount: baseCount + 1,
                  likedByCurrentUser: true,
                } as any;
              })
            }))
          }));
        }

        try {
          console.log('🎯 Making like API call for post:', postId);
          // Persist liked state
          try {
            const { useLikeStore } = require('./like-store');
            useLikeStore.getState().setLiked(String(postId), true);
          } catch {}
          
          
          // For debugging: test all endpoints if needed
          if (process.env.NODE_ENV === 'development') {
            try {
              const { testLikeEndpoints } = require('../utils/testLikeEndpoints');
              const workingEndpoint = await testLikeEndpoints(token, postId);
              if (workingEndpoint) {
                console.log('💡 Using working endpoint from test results');
              }
            } catch (testError) {
              console.log('🔍 Endpoint testing failed, continuing with fallback logic:', testError);
            }
          }
          
          // Try multiple possible endpoints for liking community posts
          let response: any;
          let lastError: Error | null = null;
          
          const endpoints = [
            // Try the general post like endpoint first (most likely to work)
            () => fetch(`${API_BASE_URL}/post/like`, {
              method: 'POST',
              headers: { 'token': token, 'Content-Type': 'application/json' },
              body: JSON.stringify({ postId })
            }).then(async r => {
              const text = await r.text();
              const data = text ? JSON.parse(text) : {};
              if (!r.ok) throw new Error(data?.message || 'Failed to like post');
              return data;
            }),
            // Community-specific endpoint (original)
            () => CommunityAPI.likeCommunityPost(token, postId),
            // Alternative community endpoints
            () => fetch(`${API_BASE_URL}/community/post/${postId}/like`, {
              method: 'POST',
              headers: { 'token': token, 'Content-Type': 'application/json' }
            }).then(async r => {
              const text = await r.text();
              const data = text ? JSON.parse(text) : { success: true };
              if (!r.ok) throw new Error(data?.message || 'Failed to like post');
              return data;
            })
          ];
          
          for (let i = 0; i < endpoints.length; i++) {
            try {
              console.log(`  Trying endpoint ${i + 1}/${endpoints.length}...`);
              response = await endpoints[i]();
              console.log(`  ✅ Endpoint ${i + 1} succeeded:`, response);
              break;
            } catch (endpointError: any) {
              console.log(`  ❌ Endpoint ${i + 1} failed:`, endpointError?.message);
              lastError = endpointError;
              if (i === endpoints.length - 1) {
                throw lastError;
              }
            }
          }
          
          console.log('✅ Like API response:', response);

          // If API call succeeds but no specific post data is returned, keep optimistic update
          if (response && (response.success || response.success === undefined)) {
            console.log('📝 Like API succeeded, keeping optimistic update');
            
            // Update the current state with the optimistic values + ensure sync to post store
            const currentUserId2 = useAuthStore.getState().user?.id;
            const currentPost = get().communities
              .flatMap(c => c.posts)
              .find(p => p.id === postId);
            
            if (currentPost) {
              const finalLikesCount = typeof currentPost.likesCount === 'number' ? currentPost.likesCount : (currentPost.likes?.length || 0);
              const finalIsLiked = currentPost.likedByCurrentUser || false;
              
              // Sync back to post store with the final state
              try {
                const { usePostStore } = require('./post-store');
                
                console.log('🔄 Syncing to post store - likes:', finalLikesCount, 'isLiked:', finalIsLiked);
                usePostStore.setState(state => ({
                  posts: state.posts.map(post =>
                    post.id === postId
                      ? {
                          ...post,
                          likes: finalLikesCount,
                          isLiked: finalIsLiked
                        }
                      : post
                  )
                }));
                console.log('✅ Successfully synced to post store');
            } catch (syncError) {
                console.warn('⚠️ Failed to sync like state to post store:', syncError);
              }
              // Persist liked state
              try {
                const { useLikeStore } = require('./like-store');
                useLikeStore.getState().setLiked(postId, true);
              } catch {}
              
            }
          }
          
          // Handle case where server returns updated post data
          const serverPost = (response && (response.post || response.body || response.updatedPost)) as any;
          if (serverPost) {
            console.log('📄 Server returned updated post data:', serverPost);
            const currentUserId2 = useAuthStore.getState().user?.id;
            // Normalize likes from server
            const normalizeLikes = (likesRaw: any) => {
              let likesArray: string[] = [];
              let count: number | undefined = undefined;
              if (Array.isArray(likesRaw)) {
                if (likesRaw.length > 0) {
                  if (typeof likesRaw[0] === 'string') likesArray = likesRaw.filter(Boolean);
                  else likesArray = likesRaw.map((l: any) => l?.userId || l?.user?.id || l?.id || l?._id).filter(Boolean);
                }
                count = likesArray.length;
              } else if (typeof likesRaw === 'number') {
                count = likesRaw; likesArray = [];
              } else if (likesRaw && typeof likesRaw === 'object') {
                const users = Array.isArray(likesRaw.users) ? likesRaw.users : Array.isArray((likesRaw as any).likers) ? (likesRaw as any).likers : [];
                likesArray = users.map((u: any) => u?.userId || u?.user?.id || u?.id || u?._id).filter(Boolean);
                count = (likesRaw as any).count ?? likesArray.length;
              } else { likesArray = []; count = undefined; }
              const liked = !!(currentUserId2 && likesArray.includes(currentUserId2));
              return { likesArray, count: count ?? likesArray.length, liked };
            };

            const { likesArray, count, liked } = normalizeLikes(serverPost?.likes);
            const normalizedPost = {
              ...serverPost,
              id: serverPost.id || serverPost._id,
              likes: likesArray,
              likesCount: typeof count === 'number' ? count : (Array.isArray(serverPost?.likes) ? serverPost.likes.length : undefined),
              likedByCurrentUser: liked || didOptimistic || false,
              comments: Array.isArray(serverPost.comments)
                ? serverPost.comments.map((c: any) => ({
                    ...c,
                    id: c?.id || c?._id,
                    postId: c?.postId || (serverPost.id || serverPost._id),
                  }))
                : [],
            } as any;

            set(state => ({
              communities: state.communities.map(community => ({
                ...community,
                posts: community.posts.map(post => (post.id === postId ? normalizedPost : post)),
              }))
            }));
            
            // Sync back to post store with server data
            try {
              const { usePostStore } = require('./post-store');
              
              console.log('🔄 Syncing server data to post store - likes:', count, 'isLiked:', liked);
              usePostStore.setState(state => ({
                posts: state.posts.map(post =>
                  post.id === postId
                    ? {
                        ...post,
                        likes: count || post.likes,
                        isLiked: liked
                      }
                    : post
                )
              }));
              console.log('✅ Successfully synced server data to post store');
            } catch (syncError) {
              console.warn('⚠️ Failed to sync server data to post store:', syncError);
            }
          }
        } catch (error) {
          // Rollback optimistic like on error
          if (didOptimistic && currentUserId) {
            set(state => ({
              communities: state.communities.map(community => ({
                ...community,
                posts: community.posts.map(post => {
                  if (post.id !== postId) return post;
                  const baseCount = typeof post.likesCount === 'number' ? post.likesCount : (post.likes?.length || 0);
                  return { 
                    ...post, 
                    likes: (post.likes || []).filter((id) => id !== currentUserId),
                    likesCount: Math.max(0, baseCount - 1),
                    likedByCurrentUser: false,
                  } as any;
                })
              }))
            }));
          }
          console.error('Failed to like community post:', error);
          // Persist rollback
          try {
            const { useLikeStore } = require('./like-store');
            useLikeStore.getState().setLiked(String(postId), false);
          } catch {}
          
          set({ error: error instanceof Error ? error.message : 'Failed to like post' });
          throw error;
        }
      },

      addComment: async (token: string, postId: string, content: string) => {
        try {
          const response = await CommunityAPI.addCommentToCommunityPost(token, postId, content);
          
          // Update local state with the new comment (normalize id field)
          set(state => ({
            communities: state.communities.map(community => ({
              ...community,
              posts: community.posts.map(post => {
                if (post.id !== postId) return post;
                const newComment = response?.comment ? { ...response.comment } : null;
                const normalizedComment = newComment
                  ? {
                      ...newComment,
                      id: newComment.id || newComment._id,
                      postId: newComment.postId || postId,
                    }
                  : null;
                return {
                  ...post,
                  comments: normalizedComment ? [...post.comments, normalizedComment] : post.comments,
                };
              })
            }))
          }));
        } catch (error) {
          console.error('Failed to add comment:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to add comment' });
          throw error;
        }
      },

      // Moderation actions with API integration
      pinPost: async (token: string, communityId: string, postId: string) => {
        try {
          const response = await CommunityAPI.pinCommunityPost(token, postId, true);
          
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId 
                ? {
                    ...community,
                    posts: community.posts.map(post => 
                      post.id === postId ? response.post : post
                    )
                  }
                : community
            )
          }));
        } catch (error) {
          console.error('Failed to pin post:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to pin post' });
          throw error;
        }
      },

      unpinPost: async (token: string, communityId: string, postId: string) => {
        try {
          const response = await CommunityAPI.pinCommunityPost(token, postId, false);
          
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId 
                ? {
                    ...community,
                    posts: community.posts.map(post => 
                      post.id === postId ? response.post : post
                    )
                  }
                : community
            )
          }));
        } catch (error) {
          console.error('Failed to unpin post:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to unpin post' });
          throw error;
        }
      },

      deletePost: async (token: string, communityId: string, postId: string) => {
        try {
          await CommunityAPI.deleteCommunityPost(token, postId, communityId);
          
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId 
                ? { 
                    ...community, 
                    posts: community.posts.filter(p => p.id !== postId)
                  }
                : community
            ),
            activeCommunity: state.activeCommunity?.id === communityId
              ? {
                  ...state.activeCommunity,
                  posts: state.activeCommunity.posts.filter(p => p.id !== postId)
                }
              : state.activeCommunity
          }));
        } catch (error) {
          console.error('Failed to delete post:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete post' });
          throw error;
        }
      },

      // Member management with API integration
      assignRole: async (token: string, communityId: string, memberId: string, role: 'admin' | 'moderator') => {
        try {
          const response = await CommunityAPI.assignRole(token, communityId, memberId, role);
          
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId ? response.community : community
            ),
            joinedCommunities: state.joinedCommunities.map(jc => 
              jc.communityId === communityId && response.community.members.includes(memberId)
                ? { ...jc, role: role }
                : jc
            )
          }));
        } catch (error) {
          console.error('Failed to assign role:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to assign role' });
          throw error;
        }
      },

      removeMember: async (token: string, communityId: string, memberId: string) => {
        try {
          const response = await CommunityAPI.removeMember(token, communityId, memberId);
          
          set(state => ({
            communities: state.communities.map(community => 
              community.id === communityId ? response.community : community
            ),
            joinedCommunities: state.joinedCommunities.filter(jc => 
              !(jc.communityId === communityId && !response.community.members.includes(memberId))
            )
          }));
        } catch (error) {
          console.error('Failed to remove member:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to remove member' });
          throw error;
        }
      },

      // Join request management with API integration
      approveJoinRequest: async (token: string, requestId: string) => {
        try {
          const response = await CommunityAPI.handleJoinRequest(token, requestId, 'approve');
          
          // Update the community with approved member
          set(state => ({
            communities: state.communities.map(community => 
              community.id === response.community?.id ? response.community : community
            )
          }));
        } catch (error) {
          console.error('Failed to approve join request:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to approve join request' });
          throw error;
        }
      },

      rejectJoinRequest: async (token: string, requestId: string) => {
        try {
          const response = await CommunityAPI.handleJoinRequest(token, requestId, 'reject');
          
          // Update the community with rejected request
          set(state => ({
            communities: state.communities.map(community => 
              community.id === response.community?.id ? response.community : community
            )
          }));
        } catch (error) {
          console.error('Failed to reject join request:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to reject join request' });
          throw error;
        }
      },


      // Keep the helper methods for backward compatibility
      getUserRole: (communityId, userId) => {
        const { communities } = get();
        const community = communities.find(c => c.id === communityId);
        if (!community) return null;
        
        if (community.owner === userId) return 'owner';
        if (Array.isArray(community.admins) && community.admins.includes(userId)) return 'admin';
        if (Array.isArray(community.moderators) && community.moderators.includes(userId)) return 'moderator';
        if (Array.isArray(community.members) && community.members.includes(userId)) return 'member';
        return null;
      },

      isOwner: (communityId, userId) => {
        const { communities } = get();
        const community = communities.find(c => c.id === communityId);
        return community?.owner === userId || false;
      },

      isAdmin: (communityId, userId) => {
        const { communities } = get();
        const community = communities.find(c => c.id === communityId);
        return community && community.admins && community.admins.includes(userId) || false;
      },

      isModerator: (communityId, userId) => {
        const { communities } = get();
        const community = communities.find(c => c.id === communityId);
        return community && community.moderators && community.moderators.includes(userId) || false;
      },

      // Legacy local methods (will be phased out for API methods)
      requestToJoin: (communityId, userId, userName, userAvatar, message) => {
        console.warn('requestToJoin: Use joinCommunity API method instead');
      },
      
      removeRole: (communityId, userId, removedBy) => {
        console.warn('removeRole: Use removeMember API method instead');
      },
      
      banMember: (communityId, userId, bannedBy) => {
        console.warn('banMember: Use API method instead');
      },
      
      unbanMember: (communityId, userId, unbannedBy) => {
        console.warn('unbanMember: Use API method instead');
      },
      
      transferOwnership: (communityId, newOwnerId, currentOwnerId) => {
        console.warn('transferOwnership: Use API method instead');
      },
      
      deleteComment: (communityId, postId, commentId, deletedBy) => {
        console.warn('deleteComment: Use API method instead');
      },
      
      updateCommunitySettings: (communityId, settings, updatedBy) => {
        console.warn('updateCommunitySettings: Use updateCommunity API method instead');
      },
      
      likeComment: (commentId, userId) => {
        console.warn('likeComment: Use API method instead');
      },
      
      
      addResource: (communityId, resourceData) => {
        console.warn('addResource: Use API method instead');
      },
      
      createAnnouncement: (communityId, announcementData) => {
        console.warn('createAnnouncement: Use API method instead');
      },

      // Analytics for owners
      getCommunityAnalytics: (communityId) => {
        const { communities } = get();
        const community = communities.find(c => c.id === communityId);
        
        if (!community) {
          return {
            totalMembers: 0,
            totalPosts: 0,
            totalComments: 0,
            totalLikes: 0,
            totalResources: 0,
            recentJoins: 0,
            engagementRate: 0
          };
        }

        const totalComments = community.posts.reduce((total, post) => total + post.comments.length, 0);
        const totalLikes = community.posts.reduce((total, post) => total + post.likes.length, 0);
        
        // Calculate recent joins (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentJoins = community.members.length; // Simplified - in real app would check join dates
        
        // Simple engagement rate calculation
        const engagementRate = community.memberCount > 0 
          ? ((totalLikes + totalComments) / community.memberCount) * 100 
          : 0;

        return {
          totalMembers: community.memberCount,
          totalPosts: community.posts.length,
          totalComments,
          totalLikes,
          totalResources: community.resources.length,
          recentJoins,
          engagementRate: Math.round(engagementRate * 100) / 100
        };
      },

      // Search and filter
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setFilterType: (filter) => {
        set({ filterType: filter });
      },

      getFilteredCommunities: () => {
        const { communities, joinedCommunities, searchQuery, filterType } = get();
        // Start with a null-safe, well-formed list of communities only
        let filtered = Array.isArray(communities)
          ? communities.filter((community: any) => community && typeof community === 'object' && community.id)
          : [];

        // Apply search filter
        if (searchQuery) {
          filtered = filtered.filter(community => 
            community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            community.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            community.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          );
        }

        // Apply type filter
        switch (filterType) {
          case 'joined':
            const joinedIds = joinedCommunities.map(jc => jc.communityId);
            filtered = filtered.filter(community => joinedIds.includes(community.id));
            break;
          case 'trending':
            filtered = filtered.sort((a, b) => {
              const aActivity = new Date(a.lastActivity).getTime();
              const bActivity = new Date(b.lastActivity).getTime();
              return bActivity - aActivity;
            });
            break;
          case 'nearby':
            // For demo, just sort by location presence
            filtered = filtered.filter(community => community.location);
            break;
          default:
            // 'all' - no additional filtering
            break;
        }

        return filtered;
      },
    }),
    {
      name: 'community-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist essential data, not loading states or errors
        communities: state.communities,
        joinedCommunities: state.joinedCommunities,
        activeCommunity: state.activeCommunity,
        searchQuery: state.searchQuery,
        filterType: state.filterType,
        // Don't persist loading, error, or isInitialized states
      }),
      version: 2, // Increment this when making breaking changes to the schema
      migrate: (persistedState: any, version: number) => {
        // Handle migration for different versions if needed
        if (version === 0) {
          // Migration from version 0 to 1 - clear all data to force refresh
          return {
            communities: [],
            joinedCommunities: [],
            activeCommunity: null,
            searchQuery: '',
            filterType: 'all',
            isLoading: false,
            error: null,
            isInitialized: false,
          };
        }
        return persistedState;
      },
    }
  )
);

// Helper function to clear community cache (useful for logout or data refresh)
export const clearCommunityCache = () => {
  useCommunityStore.setState({
    communities: [],
    joinedCommunities: [],
    activeCommunity: null,
    isLoading: false,
    error: null,
    isInitialized: false,
  });
};

// Helper function to check if communities need refresh (e.g., after app comes to foreground)
export const shouldRefreshCommunities = (lastRefreshTime?: number) => {
  if (!lastRefreshTime) return true;
  
  const now = Date.now();
  const refreshInterval = 5 * 60 * 1000; // 5 minutes
  return (now - lastRefreshTime) > refreshInterval;
};
