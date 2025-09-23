import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { StoryCircle } from '@/components/ui/StoryCircle';
import { Story } from '@/types';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import MainStoryFlow from '../ui/MainStoryFlow';

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
  const { user } = useAuthStore();

  const safeUserStories = Array.isArray(userStories) ? userStories : [];
  const safeFetchedStories = Array.isArray(fetchedStories) ? fetchedStories : [];
  
  // Use real following users' stories from fetchedStories instead of mock stories
  // Filter out current user's own stories from following stories
  const groupedStories = safeFetchedStories.reduce((acc, storyGroup) => {
    if (!storyGroup?.user?.id || !storyGroup?.stories) return acc;
    
    const userId = storyGroup.user.id;
    
    // Skip if this is the current user's story group
    if (user?.id && userId === user.id) {
      console.log('🚫 Filtering out current user\'s story from following stories:', storyGroup.user.name);
      return acc;
    }
    
    // Convert the fetched story format to the expected Story format
    const userStories = storyGroup.stories.map((story: any) => ({
      id: story.id,
      user: storyGroup.user,
      url: story.url || story.image,
      type: story.type || 'image',
      viewed: story.viewed || false,
      createdAt: story.createdAt,
      overlayData: story.overlayData
    }));
    
    acc[userId] = userStories;
    return acc;
  }, {} as Record<string, Story[]>);
  
  // Debug logging (after groupedStories is created)
  console.log('📱 StoriesSection Debug:');
  console.log('📊 Mock stories count:', stories?.length || 0);
  console.log('👤 User stories count:', safeUserStories.length);
  console.log('👥 Fetched following stories count (raw):', safeFetchedStories.length);
  console.log('🚫 Following stories count (after filtering out own):', Object.keys(groupedStories).length);
  console.log('📝 Current user ID:', user?.id);
  console.log('🗂 Sample fetched story group:', safeFetchedStories.slice(0, 1));

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

export default StoriesSection;