import React, { memo, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { StoryCircle } from '@/components/ui/StoryCircle';
import { Story } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import MainStoryFlow from '../ui/MainStoryFlow';

const DEBUG = (typeof __DEV__ !== 'undefined' && __DEV__) && (typeof process !== 'undefined' && process.env?.LOG_LEVEL === 'verbose');

interface StoriesSectionProps {
  stories: Story[];
  onStoryPress: (storyId: string, userStoriesGroup?: Story[], storyIndex?: number) => void;
  onAddStory: () => void;
  userStories: Story[];
  fetchedStories?: any[]; // Real following users' stories
}

export const StoriesSection: React.FC<StoriesSectionProps> = ({
  stories,
  onStoryPress,
  onAddStory,
  userStories,
  fetchedStories = [],
}) => {
  const [showStoryFlow, setShowStoryFlow] = useState(false);
  const user = useAuthStore(state => state.user);

  const safeUserStories = useMemo(() => (Array.isArray(userStories) ? userStories : []), [userStories]);
  const safeFetchedStories = useMemo(() => (Array.isArray(fetchedStories) ? fetchedStories : []), [fetchedStories]);
  
  // Use real following users' stories from fetchedStories instead of mock stories
  // Filter out current user's own stories from following stories
  const groupedStories = useMemo(() => {
    const out = (safeFetchedStories as any[]).reduce((acc, storyGroup: any) => {
      if (!storyGroup?.user?.id || !storyGroup?.stories) return acc;
      
      const userId = storyGroup.user.id;
      
      // Skip if this is the current user's story group
      if (user?.id && userId === user.id) {
        return acc;
      }
      
      // Convert the fetched story format to the expected Story format
      const mappedUserStories = storyGroup.stories.map((story: any) => ({
        id: story.id,
        user: storyGroup.user,
        url: story.url || story.image,
        type: story.type || 'image',
        viewed: story.viewed || false,
        createdAt: story.createdAt,
        overlayData: story.overlayData
      }));
      
      acc[userId] = mappedUserStories;
      return acc;
    }, {} as Record<string, Story[]>);

    return out;
  }, [safeFetchedStories, user?.id]);
  
  // Debug logging (verbose only)
  if (DEBUG) {
    console.log('📱 StoriesSection Debug:');
    console.log('📊 Mock stories count:', stories?.length || 0);
    console.log('👤 User stories count:', safeUserStories.length);
    console.log('👥 Fetched following stories count (raw):', safeFetchedStories.length);
    console.log('🚫 Following stories count (after filtering out own):', Object.keys(groupedStories).length);
    console.log('📝 Current user ID:', user?.id);
    console.log('🗂 Sample fetched story group:', (safeFetchedStories as any[]).slice(0, 1));
  }

  // New function to handle pressing the user's own story circle
  const handleViewUserStories = () => {
    // Check if the user has any stories to view
    if (safeUserStories.length > 0) {
      // Find the latest story to use as a starting point
      const latestStory = safeUserStories[0];
      if (latestStory) {
        onStoryPress(latestStory.id, safeUserStories, 0); // Open the story viewer
      }
    } else {
      // If there are no stories, open the add story flow
      setShowStoryFlow(true);
    }
  };

  const handleAddNewStory = () => {
    setShowStoryFlow(true);
  };

  const handleOtherUserStoryPress = (story: Story) => {
    const userId = story.user?.id;
    if (!userId) return;

    const userStoriesGroup = groupedStories[userId] || [story];
    const storyIndex = userStoriesGroup.findIndex(s => s.id === story.id);

    onStoryPress(story.id, userStoriesGroup, Math.max(0, storyIndex));
  };

  const handleCloseStoryFlow = () => {
    setShowStoryFlow(false);
  };

  if (showStoryFlow) {
    return <MainStoryFlow onClose={handleCloseStoryFlow} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={80}
        snapToAlignment="start"
        removeClippedSubviews={true}
        directionalLockEnabled
      >
        {user && (
          <View style={styles.userStoryWrapper}>
            <StoryCircle
              imageUrl={user.avatar}
              name="Your Story"
              viewed={safeUserStories.every(s => s.viewed)}
              hasStories={safeUserStories.length > 0}
              onPress={handleViewUserStories}
              onAddStory={handleAddNewStory}
              streak={user.streak}
              storyCount={safeUserStories.length} // Pass the user's story count
            />

            {/* Always show + button to add story */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddNewStory}
              activeOpacity={0.7}
            >
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {Object.entries(groupedStories).map(([userId, userStoryGroup]) => {
          const latestStory = userStoryGroup[0];
          if (!latestStory?.user) return null;

          const allStoriesViewed = userStoryGroup.every(story => story.viewed);

          return (
            <View key={userId} style={styles.otherStoryContainer}>
              <StoryCircle
                imageUrl={latestStory.user.avatar}
                name={(() => {
                  const fullName = latestStory.user.name;
                  if (!fullName) return 'User';
                  const spaceIndex = fullName.indexOf(' ');
                  return spaceIndex > -1 ? fullName.substring(0, spaceIndex) : fullName;
                })()}
                viewed={allStoriesViewed}
                hasStories={true}
                onPress={() => handleOtherUserStoryPress(latestStory)}
                streak={latestStory.user.streak}
                storyCount={userStoryGroup.length} // Pass the other user's story count
              />
            </View>
          );
        })}

        {Object.keys(groupedStories).length === 0 && safeUserStories.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              {safeFetchedStories.length === 0 
                ? "Follow someone to see their stories!"
                : "Be the first to share a story!"
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  userStoryWrapper: {
    marginRight: 12,
    alignItems: 'center',
    position: 'relative',
  },
  addButton: {
    position: 'absolute',
    bottom: 22,
    right: 0,
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
    padding: 3,
    borderWidth: 2,
    borderColor: Colors.dark.background,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherStoryContainer: {
    marginHorizontal: 6,
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginLeft: 20,
  },
  emptyStateText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// Memoize to prevent unnecessary re-renders
const areEqual = (prev: StoriesSectionProps, next: StoriesSectionProps) => {
  // Compare user stories by length and last ID
  const prevUser = Array.isArray(prev.userStories) ? prev.userStories : [];
  const nextUser = Array.isArray(next.userStories) ? next.userStories : [];
  if (prevUser.length !== nextUser.length) return false;
  const prevUserLast = prevUser.length ? prevUser[prevUser.length - 1].id : undefined;
  const nextUserLast = nextUser.length ? nextUser[nextUser.length - 1].id : undefined;
  if (prevUserLast !== nextUserLast) return false;

  // Compare fetched groups by length and simple signature
  const prevGroups = Array.isArray(prev.fetchedStories) ? prev.fetchedStories : [];
  const nextGroups = Array.isArray(next.fetchedStories) ? next.fetchedStories : [];
  if (prevGroups.length !== nextGroups.length) return false;
  for (let i = 0; i < prevGroups.length; i++) {
    const p = prevGroups[i] as any;
    const n = nextGroups[i] as any;
    const pLen = Array.isArray(p?.stories) ? p.stories.length : 0;
    const nLen = Array.isArray(n?.stories) ? n.stories.length : 0;
    if ((p?.user?.id) !== (n?.user?.id)) return false;
    if (pLen !== nLen) return false;
    const pLast = pLen ? p.stories[pLen - 1]?.id : undefined;
    const nLast = nLen ? n.stories[nLen - 1]?.id : undefined;
    if (pLast !== nLast) return false;
  }

  // Functions should be memoized by parent
  if (prev.onAddStory !== next.onAddStory) return false;
  if (prev.onStoryPress !== next.onStoryPress) return false;

  // We ignore the 'stories' prop as long as the parent passes a stable reference
  return true;
};

export default memo(StoriesSection, areEqual);
