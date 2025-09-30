// components/home/CommunityCard.tsx

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
  Users,
  Globe,
  Lock,
  Shield,
} from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ThreadsImageGallery from '@/components/ui/ThreadsImageGallery';
import FullScreenImageViewer from '@/components/ui/FullScreenImageViewer';
import { Post } from '@/types';
import { usePostStore } from '@/store/post-store';
import { useAuthStore } from '@/store/auth-store';
import { useCommunityStore } from '@/store/community-store';
import Colors from '@/constants/colors';
import { ShareBottomSheet } from '@/components/ui/ShareBottomSheet';
import { enrichCommunityPost, getCommunityById } from '@/utils/enrichCommunityPosts';
import { useLikeStore } from '@/store/like-store';

const DEBUG = (typeof __DEV__ !== 'undefined' && __DEV__) && (typeof process !== 'undefined' && process.env?.LOG_LEVEL === 'verbose');

const { width } = Dimensions.get('window');

interface CommunityCardProps {
  post: Post;
  onPress?: () => void;
}

const MAX_CONTENT_LENGTH = 150;
const CONTAINER_PADDING = 16;

// Prevent re-renders when post reference changes but relevant fields are unchanged
const propsAreEqual = (prev: CommunityCardProps, next: CommunityCardProps) => {
  const p = prev.post as any;
  const n = next.post as any;
  // Basic identity and type/community checks
  if ((p?.id || p?._id) !== (n?.id || n?._id)) return false;
  if (p?.type !== n?.type) return false;
  const pCid = p?.community?.id || p?.communityId;
  const nCid = n?.community?.id || n?.communityId;
  const pCname = p?.community?.name;
  const nCname = n?.community?.name;
  if (pCid !== nCid || pCname !== nCname) return false;

  // Counters and toggles commonly updated by interactions
  if (p?.likes !== n?.likes) return false;
  if (p?.comments !== n?.comments) return false;
  if (p?.reposts !== n?.reposts) return false;
  if (!!p?.isLiked !== !!n?.isLiked) return false;
  if (!!p?.isBookmarked !== !!n?.isBookmarked) return false;
  if (!!p?.isReposted !== !!n?.isReposted) return false;

  // Content hash (length check is cheap proxy for equality without deep compare)
  const pContentLen = (p?.content || '').length;
  const nContentLen = (n?.content || '').length;
  if (pContentLen !== nContentLen) return false;

  // Images count (avoid re-render when array reference changes but count same)
  const pImgs = Array.isArray(p?.images) ? p.images.length : 0;
  const nImgs = Array.isArray(n?.images) ? n.images.length : 0;
  if (pImgs !== nImgs) return false;

  // onPress should be stable from parent
  if (prev.onPress !== next.onPress) return false;

  return true;
};

const CommunityCard: React.FC<CommunityCardProps> = memo(({ post, onPress }) => {
  const router = useRouter();
  const likePost = usePostStore(s => s.likePost);
  const bookmarkPost = usePostStore(s => s.bookmarkPost);
  const unlikePost = usePostStore(s => s.unlikePost);
  const deletePost = usePostStore(s => s.deletePost);
  const repostPost = usePostStore(s => s.repostPost);
  const unrepostPost = usePostStore(s => s.unrepostPost);
  const votePoll = usePostStore(s => s.votePoll);

  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);

  const initializeCommunities = useCommunityStore(s => s.initializeCommunities);
  const communities = useCommunityStore(s => s.communities);
  const communitiesLength = useCommunityStore(s => s.communities.length);
  const [expanded, setExpanded] = useState(false);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [contentToShare, setContentToShare] = useState<{ id: string; type: 'post' | 'news' } | null>(null);

  const isOwnPost = useMemo(() => user && post.author && user.id === post.author.id, [user?.id, post.author?.id]);
  const shouldTruncate = useMemo(() => post.content?.length > MAX_CONTENT_LENGTH, [post.content?.length]);
  const displayContent = useMemo(() => shouldTruncate && !expanded ? `${post.content.substring(0, MAX_CONTENT_LENGTH)}...` : post.content, [post.content, shouldTruncate, expanded]);
  const formattedDate = useMemo(() => new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), [post.createdAt]);

  // Use centralized registry when available, fall back to persisted like state during hydration
  const meta = usePostStore(s => s.getPostMeta(post.id));
  const persistedLiked = useLikeStore(s => s.isLiked(post.id));
  const hasHydrated = (useLikeStore as any)?.persist?.hasHydrated?.() ?? false;
  const effectiveIsLiked = (meta?.isLiked ?? null) !== null
    ? (meta!.isLiked)
    : (hasHydrated ? persistedLiked : !!post.isLiked);
  const effectiveLikes = useMemo(() => {
    if (meta && typeof meta.likes === 'number') return meta.likes;
    const base = typeof post.likes === 'number' ? post.likes : (post as any).likesCount || 0;
    const wasLiked = !!post.isLiked;
    if (!hasHydrated) return base;
    if (effectiveIsLiked && !wasLiked) return base + 1;
    if (!effectiveIsLiked && wasLiked) return Math.max(0, base - 1);
    return base;
  }, [meta, post.likes, (post as any).likesCount, post.isLiked, effectiveIsLiked, hasHydrated]);

  const handleLike = useCallback(() => {
    effectiveIsLiked ? unlikePost(post.id) : likePost(post.id);
  }, [post.id, effectiveIsLiked, unlikePost, likePost]);

  const handleBookmark = useCallback(() => {
    bookmarkPost(post.id);
  }, [post.id, bookmarkPost]);

  // Seed centralized meta if missing (supports lists outside home feed)
  useEffect(() => {
    if (!meta) {
      try {
        (usePostStore.getState().updatePostMeta as any)?.(post.id, {
          likes: typeof post.likes === 'number' ? post.likes : (post as any).likesCount || 0,
          isLiked: !!post.isLiked,
          bookmarked: !!post.isBookmarked,
          comments: typeof post.comments === 'number' ? post.comments : 0,
        });
      } catch {}
    }
  // Only on mount / post identity change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);
  
  const handleComment = useCallback(() => {
    // Pass post data to avoid loading screen (similar to notifications)
    console.log('✅ [CommunityCard] Navigating to post with data to avoid loading');
    router.push({
      pathname: `/post/${post.id}` as any,
      params: {
        postData: JSON.stringify({
          ...enrichedPost,
          _fromCommunityCard: true // Add metadata to indicate source
        })
      }
    });
  }, [router, enrichedPost]);
  
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
      unrepostPost(post.id);
    } else {
      router.push({
        pathname: '/post/create',
        params: { repostId: post.id }
      });
    }
  };
  
  const handleViewCommunity = () => {
    if (communityInfo?.id && communityInfo.id !== 'unknown') {
      router.push(`/community/${communityInfo.id}`);
    }
  };

  const handleViewUserProfile = () => {
    router.push({
      pathname: `/profile/${post.author.id}`,
      params: { userData: JSON.stringify({ 
        id: post.author.id, 
        name: post.author.name, 
        avatar: post.author.avatar, 
        bio: post.author.bio || post.author.headline 
      }) }
    });
  };

  const handleViewPost = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      // Pass post data to avoid loading screen (similar to notifications)
      console.log('✅ [CommunityCard] Navigating to post with data to avoid loading');
      router.push({
        pathname: `/post/${post.id}` as any,
        params: {
          postData: JSON.stringify({
            ...enrichedPost,
            _fromCommunityCard: true // Add metadata to indicate source
          })
        }
      });
    }
  }, [onPress, router, enrichedPost]);
  const handleImagePress = (imageUri: string, index: number) => {
    setSelectedImageIndex(index);
    setFullScreenVisible(true);
  };
  const handleCloseFullScreen = () => setFullScreenVisible(false);
  const handleMoreMenu = () => setMenuVisible(true);

  const handleEditPost = () => {
    setMenuVisible(false);
    // Navigate directly to the dynamic edit route to avoid matching /post/[id] with id="edit"
    router.push(`/post/edit/${post.id}` as any);
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

  // Enrich post with real community data or ensure communities are loaded
  const enrichedPost = useMemo(() => {
    if (post.type === 'community' || (post as any)?.type === 'question') {
      return enrichCommunityPost(post);
    }
    return post;
  }, [post]);

  // Detect if this post is a question (for Q&A badge)
  const isQuestion = useMemo(() => {
    // Prefer explicit type or subtype when available
    if ((post as any)?.type === 'question' || (post as any)?.subtype === 'question') {
      return true;
    }
    // Heuristic detection similar to community page mapping
    const content = (post?.content || '').toString();
    const lc = content.toLowerCase();
    const startsWithQuestionWord = ['how ', 'what ', 'why ', 'when ', 'where ', 'who '].some(w => lc.startsWith(w));
    const mentionsQuestion = lc.includes('question');
    const hasQuestionMark = content.includes('?');
    return hasQuestionMark || startsWithQuestionWord || mentionsQuestion;
  }, [post?.content, (post as any)?.type, (post as any)?.subtype]);

  // State to force re-render when communities load
  const [communityLoadTime, setCommunityLoadTime] = useState(0);
  
  // Initialize communities if not already done (ensures we have community data)
  useEffect(() => {
    if (post.type === 'community' && communities.length === 0 && token) {
      initializeCommunities(token).catch(error => {
        console.warn('Failed to initialize communities for community card:', error);
      });
    }
  }, [post.type, communities.length, token, initializeCommunities]);
  
  // Force re-render when communities are loaded to update any fallback names
  useEffect(() => {
    if (communities.length > 0) {
      setCommunityLoadTime(Date.now());
    }
  }, [communities.length]);

  // Get community info with immediate enrichment and robust fallback
  const communityInfo = useMemo(() => {
    const pid = (post as any)?.id || (post as any)?._id;
    if (DEBUG) {
      console.log(`🔍 [CommunityCard] Resolving community info for post ${pid}:`, {
        enrichedName: enrichedPost.community?.name,
        originalName: post.community?.name,
        communityId: post.community?.id,
        communitiesLoaded: communitiesLength > 0,
        communityLoadTime,
        postType: post.type,
        authorName: post.author?.name // Add for debugging
      });
    }
    
    // AGGRESSIVE COMMUNITY NAME RESOLUTION: Try all possible sources
    let communityData = null;
    
    // 1. Check if enriched post has valid community data
    if (enrichedPost.community?.name && 
        enrichedPost.community.name !== 'null' && 
        enrichedPost.community.name !== 'undefined' &&
        enrichedPost.community.name.trim() !== '') {
      communityData = {
        id: enrichedPost.community.id || 'unknown',
        name: enrichedPost.community.name,
        logo: enrichedPost.community.logo || null,
        isPrivate: enrichedPost.community.isPrivate || false
      };
      if (DEBUG) console.log(`✅ [CommunityCard] Using enriched community data: "${communityData.name}"`);
    }
    
    // 2. If no enriched data, try original post community data
    else if (post.community?.name && 
             post.community.name !== 'null' && 
             post.community.name !== 'undefined' &&
             post.community.name.trim() !== '') {
      communityData = {
        id: post.community.id || 'unknown',
        name: post.community.name,
        logo: post.community.logo || null,
        isPrivate: post.community.isPrivate || false
      };
      if (DEBUG) console.log(`✅ [CommunityCard] Using original post community data: "${communityData.name}"`);
    }
    
    // 3. If we have community ID but no name, try to get from store immediately
    else if (post.community?.id && post.community.id !== 'unknown') {
      const communityFromStore = getCommunityById(post.community.id);
      if (communityFromStore?.name && 
          communityFromStore.name !== 'null' && 
          communityFromStore.name !== 'undefined' &&
          communityFromStore.name.trim() !== '') {
        communityData = {
          id: communityFromStore.id,
          name: communityFromStore.name,
          logo: communityFromStore.logo || null,
          isPrivate: communityFromStore.isPrivate || false
        };
        if (DEBUG) console.log(`✅ [CommunityCard] Using store lookup community data: "${communityData.name}"`);
      }
    }
    
    // 4. AGGRESSIVE FALLBACK: Try to find ANY community from available communities
    if (!communityData || !communityData.name || communityData.name === 'null' || communityData.name === 'undefined') {
      // First try to find any community that contains this post
      if (communities.length > 0) {
        const foundCommunity = communities.find(community => {
          if (!Array.isArray(community.posts)) return false;
          return community.posts.some((communityPost: any) => {
            const postId = typeof communityPost === 'string' ? communityPost : 
                           (communityPost?.id || communityPost?._id);
            return postId === post.id;
          });
        });
        
        if (foundCommunity?.name && foundCommunity.name !== 'null' && foundCommunity.name !== 'undefined') {
          communityData = {
            id: foundCommunity.id || foundCommunity._id,
            name: foundCommunity.name,
            logo: foundCommunity.logo || null,
            isPrivate: foundCommunity.isPrivate || false
          };
          if (DEBUG) console.log(`✅ [CommunityCard] Found community by post lookup: "${communityData.name}"`);
        } else {
          // Do not use an arbitrary community as fallback; let the final generic fallback handle it.
        }
      }
    }
    
    // 5. Final fallback - use a meaningful generic name (but NEVER the author name)
    if (!communityData || !communityData.name || communityData.name === 'null' || communityData.name === 'undefined') {
      communityData = {
        id: post.community?.id || 'unknown',
        name: 'Community', // Generic but clear - never use author name
        logo: post.community?.logo || null,
        isPrivate: post.community?.isPrivate || false
      };
      if (DEBUG) {
        console.log('⚠️ [CommunityCard] Using final fallback community name "Community" for post:', {
          postId: post.id,
          enrichedName: enrichedPost.community?.name,
          originalName: post.community?.name,
          communityId: post.community?.id,
          storeHasCommunities: communities.length > 0,
          postType: post.type,
          authorName: post.author?.name
        });
      }
    }
    
    // Double check final result and ensure we never show author name as community name
    if (communityData.name === post.author?.name) {
      console.error(`🚨 [CommunityCard] CRITICAL: Community name matches author name! Fixing...`);
      communityData.name = 'Community';
    }
    
    if (DEBUG) {
      console.log(`🏁 [CommunityCard] Final community info for post ${post.id}:`, {
        name: communityData.name,
        id: communityData.id,
        hasLogo: !!communityData.logo,
        isPrivate: communityData.isPrivate,
        authorName: post.author?.name,
        differentFromAuthor: communityData.name !== post.author?.name
      });
    }
    
    return communityData;
  }, [enrichedPost.community, post.community, communitiesLength, communityLoadTime, post.type, post.author?.name]);
  

  return (
    <View style={styles.container}>
      {/* Community Header */}
      <View style={styles.communityHeader}>
        <TouchableOpacity onPress={handleViewCommunity} style={styles.communityMainInfo}>
          {communityInfo.logo ? (
            <Avatar source={communityInfo.logo} size={48} />
          ) : (
            <View style={[styles.communityIconFallback, { 
              width: 48, 
              height: 48, 
              borderRadius: 24, 
              backgroundColor: communityInfo.isPrivate ? Colors.dark.warning : Colors.dark.tint 
            }]}>
              <Users size={24} color={Colors.dark.background} />
            </View>
          )}
          <View style={styles.communityInfo}>
            <View style={styles.communityNameRow}>
            <Text style={styles.communityName}>
              {(() => {
                const name = communityInfo?.name;
                const pid = (post as any)?.id || (post as any)?._id;
                if (DEBUG) {
                  console.log('🏷️ [CommunityCard] Displaying community name for post:', {
                    postId: pid,
                    displayName: name,
                    communityInfoComplete: communityInfo,
                    postType: post.type
                  });
                }
                
                // Aggressive null/undefined/empty check
                if (!name || 
                    name === 'null' || 
                    name === 'undefined' || 
                    name === null || 
                    name === undefined || 
                    (typeof name === 'string' && name.trim() === '')) {
                  if (DEBUG) {
                    console.log('⚠️ [CommunityCard] Blocked null/empty community name display for:', {
                      postId: post.id,
                      communityInfoName: name,
                      typeof: typeof name,
                      originalCommunityName: post.community?.name,
                      enrichedCommunityName: enrichedPost.community?.name
                    });
                  }
                  return 'Community';
                }
                return name;
              })()}
            </Text>
              {communityInfo.isPrivate ? (
                <Lock size={14} color={Colors.dark.warning} />
              ) : (
                <Globe size={14} color={Colors.dark.success} />
              )}
              {isQuestion && (
                <Badge 
                  label="Q&A" 
                  variant="secondary" 
                  size="small" 
                  style={styles.qaBadge}
                />
              )}
            </View>
            <Text style={styles.communityTimestamp}>{formattedDate}</Text>
          </View>
        </TouchableOpacity>
        {isOwnPost && (
          <TouchableOpacity style={styles.moreButton} onPress={handleMoreMenu}>
            <MoreHorizontal size={20} color={Colors.dark.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Author Info - Secondary */}
      <TouchableOpacity style={styles.authorInfo} onPress={handleViewUserProfile}>
        <Avatar source={post.author.avatar} size={24} />
        <Text style={styles.authorName}>by {post.author.name}</Text>
        <Shield size={12} color={Colors.dark.subtext} />
      </TouchableOpacity>

      {/* Content */}
      <TouchableOpacity onPress={handleViewPost} activeOpacity={0.9}>
        <Text style={styles.content}>{displayContent}</Text>
        {shouldTruncate && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={styles.showMoreText}>{expanded ? 'show less' : '...show more'}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

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

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Heart size={22} color={effectiveIsLiked ? Colors.dark.error : Colors.dark.text} fill={effectiveIsLiked ? Colors.dark.error : 'transparent'} />
          <Text style={styles.actionText}>{effectiveLikes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <MessageCircle size={22} color={Colors.dark.text} />
          <Text style={styles.actionText}>{post?.comments}</Text>
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
          likes={effectiveLikes}
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
              <Text style={styles.menuActionText}>Edit Post</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionItem, styles.deleteAction]}
              onPress={handleDeletePost}
            >
              <Trash2 size={20} color={Colors.dark.error} />
              <Text style={[styles.menuActionText, styles.deleteText]}>Delete Post</Text>
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

      {/* Share Bottom Sheet */}
      <ShareBottomSheet
        visible={isShareVisible}
        onClose={handleCloseShareSheet}
        contentId={contentToShare?.id || null}
        contentType={contentToShare?.type || null}
      />
    </View>
  );
}, propsAreEqual);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    padding: CONTAINER_PADDING,
    marginBottom: 16,
  
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  communityMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  communityInfo: {
    marginLeft: 12,
    flex: 1,
  },
  communityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityName: {
    color: Colors.dark.text,
    fontWeight: '700',
    fontSize: 18,
    marginRight: 8,
  },
  qaBadge: {
    marginLeft: 4,
    marginRight: 4,
  },
  communityTimestamp: {
    color: Colors.dark.subtext,
    fontSize: 13,
    marginTop: 2,
  },
  communityIconFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    padding: 4,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 8,
    opacity: 0.8,
  },
  authorName: {
    color: Colors.dark.subtext,
    fontSize: 13,
    marginLeft: 8,
    marginRight: 6,
    fontStyle: 'italic',
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
    paddingBottom: 34,
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
  menuActionText: {
    color: Colors.dark.text,
    marginLeft: 12,
    fontSize: 16,
  },
  deleteText: {
    color: Colors.dark.error,
  },
  cancelText: {
    color: Colors.dark.subtext,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CommunityCard;
