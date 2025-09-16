// components/messages/SharedPostCard.tsx

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Animated,
  Pressable 
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageSquare, Clock, Repeat2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Avatar from '@/components/ui/Avatar';
import { SharedCardStyles, AnimationValues, CardGradients } from './shared-card-styles';

// --- SOLUTION: Define interfaces for the component's props ---
interface PostData {
  _id: string;
  discription: string;
  media?: string[];
  // Repost fields
  isReposted?: boolean;
  originalPost?: {
    _id: string;
    discription: string;
    media?: string[];
    author: {
      _id: string;
      name: string;
      profileImage?: string | null;
    };
    createdAt: string;
  };
}

interface AuthorData {
  _id: string;
  name: string;
  profileImage?: string | null;
}

interface SharedPostCardProps {
  post: PostData;
  author: AuthorData | null; // Author can be null
}

const SharedPostCard: React.FC<SharedPostCardProps> = ({ post, author }) => {
  const router = useRouter();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // If there's no post data, render nothing.
  if (!post) {
    return null;
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: AnimationValues.pressScale,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePress = () => {
    router.push(`/post/${post._id}`);
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now.getTime() - postDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={SharedCardStyles.modernCardContainer}
      >
        {/* Show main post image only if it's not a repost or if repost has its own images */}
        {post.media && post.media.length > 0 && !post.isReposted && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: post.media[0] }} style={SharedCardStyles.modernImage} resizeMode="cover" />
            <LinearGradient
              colors={CardGradients.overlay}
              style={styles.imageGradient}
            />
          </View>
        )}
        
        <View style={SharedCardStyles.modernContent}>
          {/* Author Info with Enhanced Design */}
          {author && (
            <View style={SharedCardStyles.modernHeader}>
              <View style={SharedCardStyles.modernAvatar}>
                <Avatar source={author.profileImage || undefined} size={32} name={author.name} />
              </View>
              <View style={styles.authorDetails}>
                <Text style={styles.authorName}>{author.name}</Text>
                <View style={styles.metaInfo}>
                  <Clock size={10} color={Colors.dark.subtext} />
                  <Text style={SharedCardStyles.metaText}>
                    {formatTime(new Date().toISOString())}
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Show repost comment if it's a repost */}
          {post.isReposted && post.discription && post.discription.trim() && (
            <Text style={SharedCardStyles.primaryText} numberOfLines={2}>
              {post.discription}
            </Text>
          )}
          
          {/* Original Post Content for Repost */}
          {post.isReposted && post.originalPost ? (
            <View style={styles.originalPostContainer}>
              {/* Repost indicator */}
              <View style={styles.repostIndicator}>
                <Repeat2 size={14} color={Colors.dark.primary} />
                <Text style={styles.repostIndicatorText}>Reposted</Text>
              </View>
              
              {/* Original post header */}
              <View style={styles.originalPostHeader}>
                <Avatar 
                  source={post.originalPost.author.profileImage || undefined} 
                  size={28} 
                  name={post.originalPost.author.name} 
                />
                <View style={styles.originalPostInfo}>
                  <Text style={styles.originalPostAuthor}>{post.originalPost.author.name}</Text>
                  <Text style={styles.originalPostTime}>
                    {formatTime(post.originalPost.createdAt)}
                  </Text>
                </View>
              </View>
              
              {/* Original post content */}
              <Text style={styles.originalPostContent} numberOfLines={3}>
                {post.originalPost.discription}
              </Text>
              
              {/* Original post image */}
              {post.originalPost.media && post.originalPost.media.length > 0 && (
                <View style={styles.originalPostImageContainer}>
                  <Image 
                    source={{ uri: post.originalPost.media[0] }} 
                    style={styles.originalPostImage} 
                    resizeMode="cover" 
                  />
                </View>
              )}
            </View>
          ) : (
            /* Regular Post Content (not a repost) */
            !post.isReposted && (
              <Text style={SharedCardStyles.primaryText} numberOfLines={3}>
                {post.discription}
              </Text>
            )
          )}
          
          {/* Modern Footer with CTA */}
          <View style={styles.cardFooter}>
            <View style={styles.postTypeIndicator}>
              <MessageSquare size={12} color={Colors.dark.primary} />
              <Text style={SharedCardStyles.badgeText}>
                {post.isReposted ? 'Repost' : 'Post'}
              </Text>
            </View>
            <Text style={SharedCardStyles.ctaText}>View Post →</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  postTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.primary}15`,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  // Repost specific styles
  originalPostContainer: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: `${Colors.dark.card}80`,
  },
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  repostIndicatorText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  originalPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  originalPostInfo: {
    flex: 1,
  },
  originalPostAuthor: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600',
  },
  originalPostTime: {
    color: Colors.dark.subtext,
    fontSize: 11,
    marginTop: 1,
  },
  originalPostContent: {
    color: Colors.dark.text,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  originalPostImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  originalPostImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
});

export default SharedPostCard;
