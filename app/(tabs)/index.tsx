// app/(tabs)/index.tsx

import React, { useEffect, useState, useCallback, memo } from 'react';
import { 
  View, 
  Text,
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Platform } from 'react-native';
import { Plus } from 'lucide-react-native';
import AppHeader from '@/components/layout/AppHeader';
import PostCard from '@/components/home/PostCard';
import CommunityCard from '@/components/home/CommunityCard';
import StoriesSection from '@/components/home/StoriesSection';
import TabBar from '@/components/ui/TabBar';
import { StoryViewer } from '@/components/ui/StoryViewer';
import { usePostStore } from '@/store/post-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { getUser, followingUserStory, saveCommentToStory } from '@/api/user';
import { mapUserFromApi } from '@/utils/mapUserFromApi';
import { Story } from '@/types';
import { PostCardSkeleton, StoriesSectionSkeleton } from '@/components/ui/SkeletonLoader';
import ErrorBoundary, { ErrorFallback } from '@/components/ui/ErrorBoundary';
import LoadMoreButton from '@/components/ui/LoadMoreButton';
import { enrichCommunityPosts } from '@/utils/enrichCommunityPosts';
import { useCommunityStore } from '@/store/community-store';

const HomeScreen = memo(() => {
  const router = useRouter();
  const { 
    posts, 
    stories, 
    fetchPosts, 
    fetchStories, 
    loadMorePosts,
    refreshPosts,
    refreshPostsWithCommunities,
    isLoading, 
    isLoadingMore,
    hasNextPage,
    error: postsError,
    addStory 
  } = usePostStore();
  const { user, updateUser, token } = useAuthStore();
  const { initializeCommunities, communities } = useCommunityStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('latest');
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStories, setCurrentStories] = useState<Story[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [fetchedStories, setFetchedStories] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [lastPostCreatedAt, setLastPostCreatedAt] = useState<number | null>(null);
  const [communityRefreshTrigger, setCommunityRefreshTrigger] = useState(0);
  const insets = useSafeAreaInsets();

  // Calculate tab bar height to prevent content overlap
  const tabBarHeight = Platform.OS === 'ios' 
    ? 84 + insets.bottom 
    : 60 + insets.bottom;

  // Fixed initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      if (token) {
        try {
          setDataLoading(true);
          // Step 1: Fetch user data first
          const userResponse = await getUser(token);
          
          // Handle both response formats
          if (userResponse && userResponse.success && userResponse.body) {
            // Standard API response format
            const mappedUser = mapUserFromApi(userResponse.body);
            updateUser(mappedUser);
          } else if (userResponse && userResponse._id) {
            // Direct user object (fallback)
            const mappedUser = mapUserFromApi(userResponse);
            updateUser(mappedUser);
          } else {
            throw new Error('Invalid user response format');
          }
          
          // Step 2: Initialize communities first, then fetch posts and stories
          console.log('🏘️ Initializing communities...');
          await initializeCommunities(token);
          
          // Step 3: Fetch posts with community enrichment and stories in parallel (communities now loaded)
          await Promise.all([
            refreshPostsWithCommunities(activeTab as 'latest' | 'trending'),
            fetchStories(),
            fetchFollowingStories()
          ]);
          
        } catch (err) {
          console.error('Error fetching initial data:', err);
        } finally {
          setDataLoading(false);
        }
      } else {
        console.log('No token available');
      }
    };

    fetchInitialData();
  }, [token]); // Only depend on token to prevent infinite loops
  
  // Force re-render when communities are loaded to update any fallback community names
  useEffect(() => {
    if (communities.length > 0) {
      console.log('🏘️ Communities loaded, refreshing posts with community enrichment');
      // Call refreshPostsWithCommunities to update posts with real community names
      refreshPostsWithCommunities(activeTab as 'latest' | 'trending').catch((error) => {
        console.warn('Failed to refresh posts with communities:', error);
      });
      setCommunityRefreshTrigger(Date.now());
    }
  }, [communities.length, activeTab, refreshPostsWithCommunities]);

  // Refresh posts when screen comes into focus (disabled to prevent auto-refresh after post creation)
  // Posts are automatically added to the feed when created via post store
  // Manual refresh is still available via pull-to-refresh
  /*
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we have a token and posts have been loaded before
      if (token && posts.length > 0) {
        const now = Date.now();
        const timeSinceLastPost = lastPostCreatedAt ? now - lastPostCreatedAt : null;
        
        // Skip refresh if we just created a post in the last 10 seconds
        // This prevents unnecessary refreshes when returning from post creation
        if (timeSinceLastPost && timeSinceLastPost < 10000) {
          console.log('⏭️ Skipping refresh - recently created a post');
          return;
        }
        
        console.log('🔄 Home screen focused, refreshing posts...');
        refreshPosts(activeTab as 'latest' | 'trending');
      }
    }, [token, activeTab, refreshPosts, posts.length, lastPostCreatedAt])
  );
  */

  const fetchFollowingStories = async () => {
    try {
      console.log('🚀 Fetching following users stories...');
      const response = await followingUserStory(token);
      const rawStories = response || [];
      console.log('📊 Raw stories from API:', rawStories.length);

      // Group stories by user (exclude current user's own stories)
      const groupedStories = rawStories.reduce((acc: any, story: any) => {
        const userId = story.userId._id;
        const userName = story.userId.name;
        const userAvatar = story.userId.profileImage || '';
        const userStreak = story.userId.streak || 0;
        
        // Skip current user's own stories
        if (user?.id && userId === user.id) {
          console.log('🚫 Filtering out current user\'s story from API response:', userName);
          return acc;
        }

        // Map the single story object to the desired format
        const mappedStory = {
          id: story._id,
          url: story.url,
          type: story.type,
          viewed: false,
          createdAt: story.createdAt,
          overlayData: story.overlayData || null, // Include overlay data
          user: {
            id: userId,
            name: userName,
            avatar: userAvatar,
            streak: userStreak,
          },
        };

        // If the user already exists in the accumulator, add the new story to their group
        if (acc[userId]) {
          acc[userId].stories.push(mappedStory);
        } else {
          // Otherwise, create a new user group with the first story
          acc[userId] = {
            user: mappedStory.user,
            stories: [mappedStory],
          };
        }
        return acc;
      }, {});

      // Convert the grouped object back into an array of story groups
      const storyGroups = Object.values(groupedStories);
      
      console.log('📝 Story groups created:', storyGroups.length);
      console.log('🗂 Sample story group:', storyGroups[0]);

      setFetchedStories(storyGroups);
    } catch (err) {
      console.error('Error fetching following stories:', err);
      setFetchedStories([]); // Set empty array on error
    }
  };

  const loadData = async () => {
    await Promise.all([
      fetchPosts(activeTab as 'latest' | 'trending'),
      fetchStories(),
      fetchFollowingStories()
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    if (token) {
      try {
        const userResponse = await getUser(token);
        
        if (userResponse && userResponse.body) {
          const mappedUser = mapUserFromApi(userResponse.body);
          updateUser(mappedUser);
          
          await Promise.all([
            refreshPostsWithCommunities(activeTab as 'latest' | 'trending'),
            fetchStories(),
            fetchFollowingStories(),
          ]);
          
          // Community posts are automatically integrated in the post store
        }
      } catch (err) {
        console.error('Error refreshing data:', err);
      }
    } 
    
    setRefreshing(false);
  };

  const handleTabChange = useCallback(async (tabId: string) => {
    setActiveTab(tabId);
    await refreshPostsWithCommunities(tabId as 'latest' | 'trending');
  }, [refreshPostsWithCommunities]);

  const handleStoryPress = useCallback((storyId: string, userStories: Story[], storyIndex: number) => {
    if (userStories && userStories.length > 0) {
      setCurrentStories(userStories);
      setCurrentStoryIndex(Math.max(0, storyIndex)); // Ensure index is not negative
      setShowStoryViewer(true);
    } else {
      console.error('No stories found for user');
    }
  }, []);

  const handleAddStory = useCallback(async () => {
    // This will be handled by the StoryUploadModal in StoriesSection
    // The modal will handle image selection and upload
    // After upload, refresh stories
    await Promise.all([
      fetchStories(),
      fetchFollowingStories()
    ]);
  }, []);

  const handleStoryViewerClose = useCallback(() => {
    setShowStoryViewer(false);
  }, []);

  const handleStoryComplete = useCallback((storyId: string) => {
    // Mark story as viewed in the store
    // TODO: Implement API call to mark story as viewed
    console.log('Story completed:', storyId);
  }, []);

  const handleLikeStory = useCallback((storyId: string) => {
    // Handle story like
    // TODO: Implement API call to like story
    console.log('Story liked:', storyId);
  }, []);

  const handleReplyToStory = useCallback(async (storyId: string, message: string) => {
    // Handle story reply
    console.log('Reply to story:', storyId, message);
    await saveCommentToStory(storyId, message, token);
  }, [token]);

  const handleCreatePost = useCallback(() => {
    // Track when we're creating a post to prevent unnecessary refresh on return
    setLastPostCreatedAt(Date.now());
    router.push('/post/create');
  }, [router]);

  const handleLoadMore = useCallback(() => {
    console.log(`🔄 handleLoadMore called: hasNext=${hasNextPage}, isLoading=${isLoadingMore}, tab=${activeTab}`);
    if (hasNextPage && !isLoadingMore) {
      console.log(`🚀 Triggering loadMorePosts for ${activeTab}`);
      loadMorePosts(activeTab as 'latest' | 'trending');
    } else {
      console.log(`⏸️ LoadMore blocked: hasNext=${hasNextPage}, isLoading=${isLoadingMore}`);
    }
  }, [hasNextPage, isLoadingMore, activeTab, loadMorePosts]);

  const handleEndReached = useCallback(() => {
    console.log('🎯 onEndReached triggered');
    // Add a small delay to throttle rapid end reached calls
    setTimeout(() => {
      handleLoadMore();
    }, 100);
  }, [handleLoadMore]);

  // Ensure stories is always an array
  const safeStories = Array.isArray(stories) ? stories : [];
  
  // Filter stories to get only the current user's stories
  const userStories = user ? safeStories.filter(story => 
    story?.user?.id && user?.id && story.user.id === user.id
  ) : [];

  const renderHeader = () => (
    <>
      {/* Stories section hidden from UI but logic retained */}
      {false && (
        dataLoading ? (
          <StoriesSectionSkeleton />
        ) : (
          <StoriesSection
            stories={safeStories}
            userStories={userStories}
            fetchedStories={fetchedStories}
            onStoryPress={handleStoryPress}
            onAddStory={handleAddStory}
          />
        )
      )}
      <TabBar
        tabs={[
          { id: 'latest', label: 'Latest' },
          { id: 'trending', label: 'Trending' },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        style={styles.tabBar}
      />
    </>
  );

  const renderPost = useCallback(({ item }: { item: any }) => {
    // Enrich community posts with complete community data before rendering
    const enrichedPost = item.type === 'community' ? enrichCommunityPosts([item])[0] : item;
    
    // AGGRESSIVE TYPE DETECTION: If post has community data, it should be a community post
    const shouldUseCommunityCard = enrichedPost.type === 'community' || 
                                  (enrichedPost.community && (enrichedPost.community.id || enrichedPost.community.name));
    
    // Override type if we detect community data but type is wrong
    if (shouldUseCommunityCard && enrichedPost.type !== 'community') {
      enrichedPost.type = 'community';
      console.log(`🔄 [HomeScreen] Corrected post type to 'community' for post ${item.id}`);
    }
    
    // Debug logging for component selection
    console.log(`🔄 [HomeScreen] Rendering post ${item.id}:`, {
      originalType: item.type,
      enrichedType: enrichedPost.type,
      shouldUseCommunityCard,
      hasCommunityData: !!(enrichedPost.community && (enrichedPost.community.id || enrichedPost.community.name)),
      communityId: enrichedPost.community?.id,
      communityName: enrichedPost.community?.name,
      authorName: enrichedPost.author?.name
    });
    
    return (
      <ErrorBoundary
        fallback={
          <ErrorFallback 
            title="Error loading post"
            message="This post couldn't be loaded. Please try refreshing."
          />
        }
      >
        {shouldUseCommunityCard ? (
          <CommunityCard post={enrichedPost} key={`community-${item.id || item._id}-${communityRefreshTrigger}`} />
        ) : (
          <PostCard post={enrichedPost} />
        )}
      </ErrorBoundary>
    );
  }, [communityRefreshTrigger]);

  const renderSkeletonPosts = () => {
    return Array.from({ length: 3 }).map((_, index) => (
      <PostCardSkeleton key={`skeleton-${index}`} showImages={index % 2 === 0} />
    ));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <AppHeader 
          title="Home"
        />
        
        {(dataLoading || isLoading) && (!posts || posts.length === 0) ? (
          <View style={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}>
            {renderHeader()}
            {renderSkeletonPosts()}
          </View>
        ) : (
          <FlatList
            data={Array.isArray(posts) ? posts : []}
            keyExtractor={(item, index) => {
              // Use stable keys based on post ID to prevent unnecessary re-renders
              const id = item?.id || item?._id;
              return id ? `post_${id}` : `post_index_${index}`;
            }}
            renderItem={renderPost}
            contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 16 }]}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={() => {
              // Show error message if there's an error and posts exist
              if (postsError && posts.length > 0) {
                return (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{postsError}</Text>
                    <TouchableOpacity 
                      style={styles.retryButton} 
                      onPress={() => handleLoadMore()}
                    >
                      <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              
              // Show loading skeleton when loading more
              if (isLoadingMore && hasNextPage) {
                return (
                  <View style={styles.loadingMoreContainer}>
                    <PostCardSkeleton showImages={false} />
                  </View>
                );
              }
              
              // Show Load More button or end message
              return (
                <LoadMoreButton
                  onPress={handleLoadMore}
                  isLoading={isLoadingMore}
                  hasMore={hasNextPage}
                  disabled={!hasNextPage}
                />
              );
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.dark.primary}
                colors={[Colors.dark.primary]}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={false}
            maxToRenderPerBatch={10}
            initialNumToRender={5}
            windowSize={10}
            updateCellsBatchingPeriod={50}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
            scrollEventThrottle={16}
            getItemLayout={undefined} // Let FlatList calculate item layout dynamically
          />
        )}
        
        <TouchableOpacity 
          style={[styles.fab, { 
            bottom: (Platform.OS === 'ios' ? 100 : 76) + insets.bottom 
          }]}
          onPress={handleCreatePost}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Story Viewer hidden from UI but logic retained */}
      {false && (
        <StoryViewer
          visible={showStoryViewer}
          stories={currentStories}
          initialStoryIndex={currentStoryIndex}
          onClose={handleStoryViewerClose}
          onStoryComplete={handleStoryComplete}
          onLikeStory={handleLikeStory}
          onReplyToStory={handleReplyToStory}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  tabBar: {
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingMoreContainer: {
    paddingVertical: 16,
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfListText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    opacity: 0.7,
  },
  errorContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: Colors.dark.cardBackground,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;