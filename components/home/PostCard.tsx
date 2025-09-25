// components/home/PostCard.tsx

import React, { useState, memo, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Repeat2,
  Edit3,
  Trash2,
  X,
  Users,
  Globe,
  Lock,
} from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ThreadsImageGallery from '@/components/ui/ThreadsImageGallery';
import FullScreenImageViewer from '@/components/ui/FullScreenImageViewer';
import { Post } from '@/types';
import { usePostStore } from '@/store/post-store';
import { useAuthStore } from '@/store/auth-store';
import { useLikeStore } from '@/store/like-store';
import Colors from '@/constants/colors';
import { ShareBottomSheet } from '@/components/ui/ShareBottomSheet'; // --- SOLUTION 1: Import the ShareBottomSheet

const { width } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onPress?: () => void;
  variant?: 'default' | 'communityDetail';
}

const MAX_CONTENT_LENGTH = 150;
const CONTAINER_PADDING = 16;

// Repost content component with truncation
interface RepostContentProps {
  content: string;
  hasImages: boolean;
  styles: any;
}

const RepostContent: React.FC<RepostContentProps> = ({ content, hasImages, styles }) => {
  const [expanded, setExpanded] = useState(false);
  
  const maxLines = hasImages ? 3 : 5;
  const estimatedCharsPerLine = 40;
  const maxLength = maxLines * estimatedCharsPerLine;
  
  const shouldTruncate = content.length > maxLength;
  const displayContent = shouldTruncate && !expanded 
    ? content.substring(0, maxLength).trim() + '...'
    : content;

  return (
    <>
      <Text style={styles.repostContent}>{displayContent}</Text>
      {shouldTruncate && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={styles.showMoreText}>
            {expanded ? 'show less' : 'show more'}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const PostCard: React.FC<PostCardProps> = memo(({ post, onPress, variant = 'default' }) => {
  const router = useRouter();
  const { likePost, bookmarkPost, unlikePost, editPost, deletePost, repostPost, unrepostPost, votePoll } = usePostStore();
  const { user } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState(false);

  // --- SOLUTION 2: Add state for the share bottom sheet ---
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [contentToShare, setContentToShare] = useState<{ id: string; type: 'post' | 'news' } | null>(null);

  const isOwnPost = useMemo(() => user && post.author && user.id === post.author.id, [user?.id, post.author?.id]);
  const shouldTruncate = useMemo(() => post.content?.length > MAX_CONTENT_LENGTH, [post.content?.length]);
  const displayContent = useMemo(() => shouldTruncate && !expanded ? `${post.content.substring(0, MAX_CONTENT_LENGTH)}...` : post.content, [post.content, shouldTruncate, expanded]);
  const formattedDate = useMemo(() => new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), [post.createdAt]);

  const persistedLiked = useLikeStore(s => s.isLiked(post.id));
  const setPersistedLiked = useLikeStore(s => s.setLiked);
  const hasHydrated = (useLikeStore as any)?.persist?.hasHydrated?.() ?? false;
  const effectiveIsLiked = hasHydrated ? (persistedLiked || post.isLiked) : post.isLiked;

  // If server says liked but persisted store doesn't have it yet (e.g., first run after feature added),
  // promote server truth into persistence to avoid flipping after hydration
  useEffect(() => {
    if (hasHydrated && post.isLiked && !persistedLiked) {
      try { setPersistedLiked(post.id, true); } catch {}
    }
  }, [hasHydrated, persistedLiked, post.id, post.isLiked, setPersistedLiked]);

  const handleLike = useCallback(() => {
    (effectiveIsLiked ? unlikePost : likePost)(post.id);
  }, [post.id, effectiveIsLiked, unlikePost, likePost]);

  const handleBookmark = useCallback(() => {
    bookmarkPost(post.id);
  }, [post.id, bookmarkPost]);
  
  const handleComment = useCallback(() => {
    // Pass post data to avoid loading screen (similar to notifications)
    console.log('✅ [PostCard] Navigating to post with data to avoid loading');
    router.push({
      pathname: `/post/${post.id}` as any,
      params: {
        postData: JSON.stringify({
          ...post,
          _fromPostCard: true // Add metadata to indicate source
        })
      }
    });
  }, [router, post]);
  
  // --- SOLUTION 3: Update handleShare to open the bottom sheet ---
  const handleShare = useCallback(() => {
    setContentToShare({ id: post.id, type: 'post' });
    setIsShareVisible(true);
  }, [post.id]);

  const handleCloseShareSheet = () => {
    setIsShareVisible(false);
    setContentToShare(null);
  };
  
  const handleRepostPress = () => {
    if (post.isReposted) {
      // Unrepost
      unrepostPost(post.id);
    } else {
      // Navigate to create post page for repost with comment
      router.push({
        pathname: '/post/create',
        params: { repostId: post.id }
      });
    }
  };

  
  const handleViewProfile = () => {
    // Pass user data to avoid loading screen
    router.push({
      pathname: `/profile/${post.author.id}`,
      params: { userData: JSON.stringify({ id: post.author.id, name: post.author.name, avatar: post.author.avatar, bio: post.author.bio || post.author.headline }) }
    });
  };

  const handleViewPost = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      // Pass post data to avoid loading screen (similar to notifications)
      console.log('✅ [PostCard] Navigating to post with data to avoid loading');
      router.push({
        pathname: `/post/${post.id}` as any,
        params: {
          postData: JSON.stringify({
            ...post,
            _fromPostCard: true // Add metadata to indicate source
          })
        }
      });
    }
  }, [onPress, router, post]);
  const handleImagePress = (imageUri: string, index: number) => {
    setSelectedImageIndex(index);
    setFullScreenVisible(true);
  };
  const handleCloseFullScreen = () => setFullScreenVisible(false);
  const handleMoreMenu = () => setMenuVisible(true);

  const handleEditPost = () => {
    setMenuVisible(false);
    // Navigate to edit post screen with post ID
    router.push({
      pathname: '/post/edit',
      params: { id: post.id }
    });
  };

  const handleDeletePost = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePost(post.id) }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (variant === 'communityDetail') {
            // Community detail page: header shows user -> go to user profile
            handleViewProfile();
          } else if (post.community) {
            // Home page: header shows community -> go to community page
            router.push(`/community/${post.community?.id}`);
          } else {
            // No community: go to user profile
            handleViewProfile();
          }
        }} style={styles.authorContainer}>
          {variant === 'communityDetail' ? (
            // Community detail page: Show user avatar in header
            <Avatar source={post?.author.avatar} size={40} />
          ) : post.community ? (
            // Home page: Show community logo in header
            post.community.logo ? (
              <Avatar source={post.community.logo} size={40} />
            ) : (
              <View style={[styles.communityIconFallback, { width: 40, height: 40, borderRadius: 20, backgroundColor: post.community.isPrivate ? Colors.dark.warning : Colors.dark.tint }]}>
                <Users size={20} color={Colors.dark.background} />
              </View>
            )
          ) : (
            // No community: Show user avatar
            <Avatar source={post?.author.avatar} size={40} />
          )}
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>
                {variant === 'communityDetail'
                  ? post?.author.name
                  : (post.community ? `r/${post.community.name}` : post?.author.name)}
              </Text>
              {post.type === 'question' && (
                <Badge 
                  label="Q&A" 
                  variant="secondary" 
                  size="small" 
                  style={styles.questionBadge}
                />
              )}
            </View>
            <Text style={styles.timestamp}>{formattedDate}</Text>
          </View>
        </TouchableOpacity>
        {isOwnPost && (
          <TouchableOpacity style={styles.moreButton} onPress={handleMoreMenu}>
            <MoreHorizontal size={20} color={Colors.dark.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Community Context */}
      {post.community && variant !== 'communityDetail' && (
        <TouchableOpacity 
          style={styles.communityContainer}
          onPress={() => {
            if (variant === 'communityDetail') {
              // Community detail page: context shows community -> go to community
              router.push(`/community/${post.community?.id}`);
            } else {
              // Home page: context shows user -> go to user profile
              handleViewProfile();
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.communityInfo}>
            <View style={styles.communityIconContainer}>
              {variant === 'communityDetail' ? (
                // Community detail page: Show community logo in context
                post.community.logo ? (
                  <Avatar source={post.community.logo} size={20} />
                ) : (
                  <View style={[styles.communityIconFallback, { backgroundColor: post.community.isPrivate ? Colors.dark.warning : Colors.dark.tint }]}>
                    <Users size={10} color={Colors.dark.background} />
                  </View>
                )
              ) : (
                // Home page: Show user avatar in context
                post?.author.avatar ? (
                  <Avatar source={post.author.avatar} size={20} />
                ) : (
                  <View style={[styles.communityIconFallback, { backgroundColor: Colors.dark.tint }]}>
                    <Users size={10} color={Colors.dark.background} />
                  </View>
                )
              )}
            </View>
            <Text style={styles.communityName}>
              {variant === 'communityDetail' ? `r/${post.community.name}` : post?.author.name}
            </Text>
            <View style={styles.communityPrivacyIndicator}>
              {post.community.isPrivate ? (
                <Lock size={12} color={Colors.dark.subtext} />
              ) : (
                <Globe size={12} color={Colors.dark.subtext} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Content */}
      {!post.isReposted && (
        <TouchableOpacity onPress={handleViewPost} activeOpacity={0.9}>
          <Text style={styles.content}>{displayContent}</Text>
          {shouldTruncate && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={styles.showMoreText}>{expanded ? 'show less' : '...show more'}</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
      {post.isReposted && post.content && (
        <TouchableOpacity onPress={handleViewPost} activeOpacity={0.9}>
          <Text style={styles.content}>{displayContent}</Text>
          {shouldTruncate && (
             <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={styles.showMoreText}>{expanded ? 'show less' : '...show more'}</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {/* Poll */}
      {post.type === 'poll' && post.pollOptions && (
        <View style={styles.pollContainer}>
          {post.pollOptions.map((option, index) => {
            const percentage = post.totalVotes && post.totalVotes > 0 
              ? Math.round((option.votes / post.totalVotes) * 100) 
              : 0;
            const isSelected = post.userVote === option.id;
            const isVotingDisabled = post.hasVoted;
            
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.pollOption,
                  isSelected && styles.pollOptionSelected,
                  isVotingDisabled && styles.pollOptionDisabled
                ]}
                onPress={() => {
                  if (!isVotingDisabled) {
                    votePoll(post.id, option.id);
                  }
                }}
                disabled={isVotingDisabled}
              >
                <View style={styles.pollOptionContent}>
                  <Text style={[
                    styles.pollOptionText,
                    isSelected && styles.pollOptionTextSelected
                  ]}>
                    {option.text}
                  </Text>
                  {isVotingDisabled && (
                    <Text style={styles.pollOptionPercentage}>{percentage}%</Text>
                  )}
                </View>
                {isVotingDisabled && (
                  <View style={[
                    styles.pollOptionBar,
                    { width: `${percentage}%` },
                    isSelected && styles.pollOptionBarSelected
                  ]} />
                )}
              </TouchableOpacity>
            );
          })}
          {post.totalVotes !== undefined && (
            <Text style={styles.pollVoteCount}>
              {post.totalVotes} {post.totalVotes === 1 ? 'vote' : 'votes'}
            </Text>
          )}
        </View>
      )}

      {/* Image Gallery */}
      {Array.isArray(post.images) && post.images?.length > 0 && (
        <ThreadsImageGallery
          images={post.images}
          onImagePress={handleImagePress}
          containerPadding={CONTAINER_PADDING}
        />
      )}

      {/* Original Post for Repost */}
      {post.isReposted && post.originalPost && (
        <TouchableOpacity 
          style={styles.repostContainer}
          onPress={() => {
            // Pass original post data to avoid loading screen
            console.log('✅ [PostCard] Navigating to original post with data');
            router.push({
              pathname: `/post/${post.originalPost.id}` as any,
              params: {
                postData: JSON.stringify({
                  ...post.originalPost,
                  _fromPostCard: true,
                  _fromRepost: true // Additional metadata for reposts
                })
              }
            });
          }}
          activeOpacity={0.8}
        >
          {/* Repost indicator inside the repost container */}
          <View style={styles.repostIndicator}>
            <Repeat2 size={16} color={Colors.dark.text} />
            <Text style={styles.repostIndicatorText}>Reposted</Text>
          </View>
          
          <View style={styles.originalPostHeader}>
            <Avatar source={post.originalPost.author.avatar} size={32} />
            <View style={styles.originalPostInfo}>
              <Text style={styles.originalPostAuthor}>{post.originalPost.author.name}</Text>
              <Text style={styles.originalPostTime}>{new Date(post.originalPost.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
            </View>
          </View>
          <RepostContent 
            content={post.originalPost.content}
            hasImages={Array.isArray(post.originalPost.images) && post.originalPost.images?.length > 0}
            styles={styles}
          />
          {Array.isArray(post.originalPost.images) && post.originalPost.images?.length > 0 && (
            <ThreadsImageGallery
              images={post.originalPost.images}
              onImagePress={handleImagePress}
              containerPadding={0}
              maxImageHeight={200}
              maxWidth={width - (CONTAINER_PADDING * 2) - (12 * 2)}
            />
          )}
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart size={22} color={effectiveIsLiked ? Colors.dark.error : Colors.dark.text} fill={effectiveIsLiked ? Colors.dark.error : 'transparent'} />
          <Text style={styles.actionText}>{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <MessageCircle size={22} color={Colors.dark.text} />
          <Text style={styles.actionText}>{post?.comments || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleRepostPress}>
          <Repeat2 size={22} color={Colors.dark.text} />
          {(post.reposts || 0) > 0 && (<Text style={styles.actionText}>{post.reposts}</Text>)}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share2 size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.spacer} />
        <TouchableOpacity onPress={handleBookmark}>
          <Bookmark size={22} color={Colors.dark.text} fill={post?.isBookmarked ? Colors.dark.text : 'transparent'} />
        </TouchableOpacity>
      </View>

      {/* Modals and Viewers */}
      {Array.isArray(post.images) && post.images?.length > 0 && (
          <FullScreenImageViewer
          visible={fullScreenVisible}
          images={post.images}
          initialIndex={selectedImageIndex}
          postId={post.id}
          likes={post.likes}
          comments={post.comments}
          isLiked={effectiveIsLiked}
          onClose={handleCloseFullScreen}
          onLike={handleLike}
          onComment={handleComment}
          onShare={handleShare}
          onRepost={handleRepostPress}
        />
      )}
      

      {/* Action Sheet Modal for Edit/Delete */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHeader}>
              <View style={styles.actionSheetHandle} />
            </View>
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={handleEditPost}
            >
              <Edit3 size={20} color={Colors.dark.text} />
              <Text style={styles.actionText}>Edit Post</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionItem, styles.deleteAction]}
              onPress={handleDeletePost}
            >
              <Trash2 size={20} color={Colors.dark.error} />
              <Text style={[styles.actionText, styles.deleteText]}>Delete Post</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionItem, styles.cancelAction]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- SOLUTION 4: Render the bottom sheet --- */}
      <ShareBottomSheet
        visible={isShareVisible}
        onClose={handleCloseShareSheet}
        contentId={contentToShare?.id || null}
        contentType={contentToShare?.type || null}
      />
    </View>
  );
});

// Memoization comparison function for better performance
const areEqual = (prevProps: PostCardProps, nextProps: PostCardProps) => {
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.comments === nextProps.post.comments &&
    prevProps.post.isLiked === nextProps.post.isLiked &&
    prevProps.post.isBookmarked === nextProps.post.isBookmarked &&
    prevProps.post.isReposted === nextProps.post.isReposted
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: CONTAINER_PADDING,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    color: Colors.dark.text,
    fontWeight: '600',
    fontSize: 16,
  },
  questionBadge: {
    marginTop: 0,
  },
  timestamp: {
    color: Colors.dark.subtext,
    fontSize: 12,
  },
  moreButton: {
    padding: 4,
  },
  content: {
    color: Colors.dark.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  showMoreText: {
    color: Colors.dark.tint,
    fontWeight: '500',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    color: Colors.dark.text,
    marginLeft: 6,
    fontSize: 14,
  },
  spacer: {
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // For safe area
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  deleteAction: {
    borderBottomWidth: 0,
  },
  cancelAction: {
    justifyContent: 'center',
    borderBottomWidth: 0,
    marginTop: 8,
  },
  deleteText: {
    color: Colors.dark.error,
  },
  cancelText: {
    color: Colors.dark.subtext,
    fontSize: 16,
    fontWeight: '500',
  },
  // Repost styles
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  repostIndicatorText: {
    color: Colors.dark.subtext,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  repostContainer: {
    backgroundColor: Colors.dark.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  originalPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalPostInfo: {
    marginLeft: 8,
  },
  originalPostAuthor: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  originalPostTime: {
    color: Colors.dark.subtext,
    fontSize: 11,
  },
  repostContent: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
  },
  repostImagesContainer: {
    marginTop: 8,
  },
  // Community context styles
  communityContainer: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityIconContainer: {
    marginRight: 8,
  },
  communityIconFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityName: {
    color: Colors.dark.tint,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  communityPrivacyIndicator: {
    opacity: 0.7,
  },
  // Poll styles
  pollContainer: {
    marginBottom: 12,
  },
  pollOption: {
    backgroundColor: Colors.dark.background,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  pollOptionSelected: {
    borderColor: Colors.dark.tint,
  },
  pollOptionDisabled: {
    opacity: 0.8,
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  pollOptionText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  pollOptionTextSelected: {
    color: Colors.dark.tint,
    fontWeight: '600',
  },
  pollOptionPercentage: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  pollOptionBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: Colors.dark.border,
    opacity: 0.3,
    zIndex: 1,
  },
  pollOptionBarSelected: {
    backgroundColor: Colors.dark.tint,
    opacity: 0.2,
  },
  pollVoteCount: {
    color: Colors.dark.subtext,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default memo(PostCard, areEqual);
