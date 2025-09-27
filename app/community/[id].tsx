import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Bell, 
  Settings, 
  Plus,
  MapPin,
  Clock,
  Tag,
  X,
  Globe,
  Lock,
  MessageSquare,
  Heart,
  Share,
  FileText,
  ExternalLink,
  Download,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Bookmark,
  HelpCircle,
  Send,
  Trash2,
  Pin,
  Edit3,
  Eye,
  Image as ImageIcon,
  Camera,
  Video
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { useCommunityStore } from '@/store/community-store';
import type { Community } from '@/store/community-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import PostCard from '@/components/home/PostCard';
import CommunityEventsTab from '@/components/community/CommunityEventsTab';
import type { Post as HomePost, User as HomeUser } from '@/types';

// Map a community post shape to the main Home Post shape for UI consistency
function mapCommunityToHomePost(rawPost: any, community: Community, currentUserId?: string, createdQuestionPostIds?: string[]): HomePost {
  // Debug logging for post type mapping
  console.log('🔄 [mapCommunityToHomePost] Raw post from backend:', {
    id: rawPost?.id,
    type: rawPost?.type,
    subtype: rawPost?.subtype,
    discription: rawPost?.discription ? rawPost.discription.substring(0, 50) + '...' : 'No discription',
    content: rawPost?.content ? rawPost.content.substring(0, 50) + '...' : 'No content',
    images: rawPost?.images,
    imagesType: typeof rawPost?.images,
    imagesLength: Array.isArray(rawPost?.images) ? rawPost.images.length : 'not array',
    media: rawPost?.media,
    allKeys: Object.keys(rawPost || {})
  });
  
  const likesCount = typeof rawPost?.likesCount === 'number'
    ? rawPost.likesCount
    : Array.isArray(rawPost?.likes)
      ? rawPost.likes.length
      : 0;

  const likedByMe = typeof rawPost?.likedByCurrentUser === 'boolean'
    ? rawPost.likedByCurrentUser
    : (currentUserId && Array.isArray(rawPost?.likes) ? rawPost.likes.includes(currentUserId) : false);

  const author: HomeUser = {
    id: rawPost?.userId || rawPost?.authorId || rawPost?.author?._id || rawPost?.author?._id || 'unknown',
    _id: rawPost?.userId || rawPost?.authorId || rawPost?.author?._id || rawPost?.author?._id || 'unknown',
    name: rawPost?.authorName || rawPost?.author?.name || 'Unknown',
    username: (rawPost?.authorName || rawPost?.author?.name || 'user').toLowerCase().replace(/\s+/g, ''),
    email: '',
    profileImage: rawPost?.authorAvatar || rawPost?.author?.avatar || '',
    avatar: rawPost?.authorAvatar || rawPost?.author?.avatar || '',
  } as any;

  // Client-side detection of question posts if backend doesn't set type properly
  // Check both 'type' field and 'subtype' field for question detection
  let finalType = rawPost?.type === 'poll' ? 'poll' : 
                  rawPost?.type === 'question' ? 'question' : 
                  rawPost?.subtype === 'question' ? 'question' : 'community';
  
  // Workaround: If type is still 'community' or missing, check if this looks like a question
  if (finalType === 'community' || !rawPost?.type) {
    // First check if this post is in our locally tracked question posts
    if (createdQuestionPostIds && createdQuestionPostIds.includes(rawPost?.id)) {
      console.log('  🔖 Found locally tracked question post:', rawPost?.id);
      finalType = 'question';
    } else {
      // Fallback to pattern detection
      const content = rawPost?.discription || rawPost?.content || '';
      const isQuestionPattern = (
        content.includes('?') ||
        content.toLowerCase().startsWith('how ') ||
        content.toLowerCase().startsWith('what ') ||
        content.toLowerCase().startsWith('why ') ||
        content.toLowerCase().startsWith('when ') ||
        content.toLowerCase().startsWith('where ') ||
        content.toLowerCase().startsWith('who ') ||
        content.toLowerCase().includes('question')
      );
      
      if (isQuestionPattern) {
        console.log('  🔍 Client-side detected question post:', {
          id: rawPost?.id,
          content: content.substring(0, 50) + '...',
          hasQuestionMark: content.includes('?'),
          startsWithQuestionWord: ['how', 'what', 'why', 'when', 'where', 'who'].some(word => 
            content.toLowerCase().startsWith(word + ' ')
          )
        });
        finalType = 'question';
      }
    }
  }
  
  const mappedPost = {
    id: rawPost?.id,
    author,
    content: rawPost?.discription || rawPost?.content || '', // Backend uses 'discription' field
    images: Array.isArray(rawPost?.images) ? rawPost.images : 
             Array.isArray(rawPost?.media) ? rawPost.media : 
             Array.isArray(rawPost?.imageUrls) ? rawPost.imageUrls : [],
    createdAt: rawPost?.createdAt || new Date().toISOString(),
    likes: likesCount,
    comments: Array.isArray(rawPost?.comments) ? rawPost.comments.length : 0,
    reposts: 0,
    isLiked: !!likedByMe,
    isBookmarked: false,
    isReposted: false,
    commentsList: [],
    community: {
      id: community.id,
      name: community.name,
      logo: community.logo,
      isPrivate: community.isPrivate,
    },
    type: finalType,
    // Poll-specific fields
    pollOptions: rawPost?.pollOptions ? rawPost.pollOptions.map((option: any, index: number) => ({
      id: option.id || `option-${index}`,
      text: option.text || option,
      votes: option.votes || 0,
      voters: option.voters || []
    })) : undefined,
    totalVotes: rawPost?.totalVotes || (rawPost?.pollOptions ? rawPost.pollOptions.reduce((sum: number, option: any) => sum + (option.votes || 0), 0) : 0),
    hasVoted: rawPost?.hasVoted || false,
    userVote: rawPost?.userVote,
  } as HomePost;
  
  console.log('  → Mapped to type:', finalType, 'for post:', rawPost?.id);
  console.log('  🖼️ Final mapped images:', {
    originalImages: rawPost?.images,
    mappedImages: mappedPost.images ?? [],
    imagesLength: (mappedPost.images ?? []).length
  });
  
  return mappedPost;
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { 
    communities, 
    joinedCommunities,
    joinCommunity, 
    leaveCommunity, 
    createPost,
    likePost,
    addComment,
    addResource,
    createAnnouncement,
    loadCommunityDetails,
    fetchCommunityPosts,
    deleteComment,
    deletePost,
    pinPost,
    unpinPost,
    getUserRole,
    isOwner,
    isAdmin,
    isModerator
  } = useCommunityStore();
  const { user, token } = useAuthStore();
  
  const [community, setCommunity] = useState<Community | null>(null);
  const [activeTab, setActiveTab] = useState('feed');
  const [sortBy, setSortBy] = useState('new');
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);
  const [createAnnouncementModalVisible, setCreateAnnouncementModalVisible] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [qaModalVisible, setQaModalVisible] = useState(false);
  const [moderationMenuVisible, setModerationMenuVisible] = useState<string | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  
  // Form states for post creation
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'text' | 'question' | 'poll' | 'resource'>('text');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'members' | 'private'>('members');
  
  // Poll states
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(24); // hours
  const [allowMultipleChoices, setAllowMultipleChoices] = useState(false);
  
  // Form states for announcement creation
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  
  // Form states for Q&A
  const [questionContent, setQuestionContent] = useState('');
  
  // Loading state for post creation
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  
  // Track locally created question posts to identify them later
  const [createdQuestionPostIds, setCreatedQuestionPostIds] = useState<string[]>([]);

  // Use useRef to track which communities have been fetched to avoid state updates causing re-renders
  const fetchedCommunityIds = useRef<Set<string>>(new Set());
  const [fetchingInProgress, setFetchingInProgress] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    // Early returns for missing required data
    if (!id || !token) return;
    
    // Don't fetch if already fetched or currently fetching
    if (fetchedCommunityIds.current.has(id) || fetchingInProgress.has(id)) {
      console.log('⏸️ Skipping fetch - already fetched or in progress:', id);
      return;
    }
    
    const found = communities.find(c => c.id === id);
    if (!found) {
      console.log('⚠️ Community not found in store yet:', id);
      return;
    }

    // Only fetch if the community doesn't have posts or has empty posts array
    const hasValidPosts = Array.isArray(found.posts) && found.posts.length > 0;
    
    if (!hasValidPosts) {
      console.log('🔄 Fetching posts for community (no posts found):', id);
      
      // Mark as fetching in progress
      setFetchingInProgress(prev => new Set(prev.add(id)));
      
      // Add a small delay to avoid race conditions with background fetching
      setTimeout(() => {
        fetchCommunityPosts(token, id, { sortBy: 'new' })
          .then(() => {
            // Mark as successfully fetched
            fetchedCommunityIds.current.add(id);
            console.log('✅ Successfully fetched and marked community as fetched:', id);
          })
          .catch((error) => {
            console.warn('❌ Failed to fetch community posts:', error);
          })
          .finally(() => {
            // Remove from fetching in progress
            setFetchingInProgress(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          });
      }, 100);
    } else {
      // Community already has posts, just mark it as fetched
      fetchedCommunityIds.current.add(id);
      console.log('📄 Community already has posts (', found.posts.length, '), marked as fetched:', id);
    }
  }, [id, token]); // Only depend on id and token

  // Memoize the current community to prevent unnecessary re-renders
  const currentCommunity = useMemo(() => {
    if (!id || communities.length === 0) return null;
    return communities.find(c => c.id === id) || null;
  }, [id, communities]);
  
  useEffect(() => {
    if (currentCommunity && (!community || currentCommunity.id !== community.id)) {
      console.log('🏠 Setting community:', currentCommunity.id, currentCommunity.name);
      setCommunity(currentCommunity);
    }
  }, [currentCommunity?.id, community?.id]);

  const handleBack = () => {
    router.back();
  };

  const handleJoinCommunity = async () => {
    console.log('🔄 Starting join community process...');
    console.log('  👤 User:', user ? { id: user.id, name: user.name } : 'null');
    console.log('  🏘️ Community:', community ? { id: community.id, name: community.name } : 'null');
    console.log('  🎫 Token present:', !!token);
    console.log('  📍 API Base URL:', process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com');
    
    if (user && community && token) {
      try {
        console.log('🚀 Calling joinCommunity API...');
        console.log('  Parameters:', { communityId: community.id, userId: user.id });
        
        const startTime = Date.now();
        await joinCommunity(token, community.id);
        const endTime = Date.now();
        
        console.log('✅ Successfully joined community!');
        console.log('  ⏱️ API call took:', endTime - startTime, 'ms');
        console.log('  🔄 Refreshing community data...');
        
        // Refresh community data to ensure UI is in sync
        if (loadCommunityDetails && typeof loadCommunityDetails === 'function') {
          try {
            const refreshStartTime = Date.now();
            await loadCommunityDetails(token, community.id);
            const refreshEndTime = Date.now();
            console.log('  ✅ Community data refreshed successfully');
            console.log('  ⏱️ Refresh took:', refreshEndTime - refreshStartTime, 'ms');
          } catch (refreshError: any) {
            console.warn('⚠️ Failed to refresh community data after join:', {
              error: refreshError.message || refreshError,
              stack: refreshError.stack
            });
          }
        } else {
          console.warn('⚠️ loadCommunityDetails function not available');
        }
        
        console.log('🎉 Join community process completed successfully!');
        
      } catch (error: any) {
        console.error('❌ Join community process failed:');
        console.error('  Error type:', typeof error);
        console.error('  Error message:', error.message || error.toString());
        console.error('  Error stack:', error.stack);
        console.error('  Full error object:', error);
        
        const errorMessage = error.message || error.toString();
        
        // Check if user is already a member
        if (errorMessage.includes('Already a member')) {
          console.log('ℹ️ User is already a member of this community, refreshing UI...');
          
          if (loadCommunityDetails && typeof loadCommunityDetails === 'function') {
            try {
              await loadCommunityDetails(token, community.id);
              console.log('  ✅ UI refreshed after "already member" scenario');
            } catch (refreshError: any) {
              console.warn('⚠️ Failed to refresh community data:', {
                error: refreshError.message || refreshError,
                stack: refreshError.stack
              });
            }
          }
          return;
        }
        
        // Show error for other cases
        console.log('🚨 Showing error alert to user:', errorMessage);
        Alert.alert('Error', `Failed to join community: ${errorMessage}`);
      }
    } else {
      console.error('❌ Missing required data for join:');
      console.error('  User missing:', !user);
      console.error('  Community missing:', !community);
      console.error('  Token missing:', !token);
      Alert.alert('Error', 'You must be logged in to join a community.');
    }
  };

  const handleLeaveCommunity = async () => {
    if (user && community && token) {
      try {
        await leaveCommunity(token, community.id);
        console.log('✅ Successfully left community, refreshing data...');
        
        // Refresh community data to ensure UI is in sync
        if (loadCommunityDetails && typeof loadCommunityDetails === 'function') {
          try {
            await loadCommunityDetails(token, community.id);
          } catch (refreshError) {
            console.warn('⚠️ Failed to refresh community data after leave:', refreshError);
          }
        }
        
      } catch (error) {
        Alert.alert('Error', 'Failed to leave community. Please try again.');
      }
    }
  };
  
  const handleCreatePost = async () => {
    console.log('🚀 [CommunityDetail] Starting handleCreatePost...');
    console.log('  Community:', community ? { id: community.id, name: community.name } : 'null');
    console.log('  User:', user ? { id: user.id, name: user.name } : 'null');
    console.log('  Post content length:', postContent.trim().length);
    console.log('  Post type:', postType);
    console.log('  Show poll creator:', showPollCreator);
    console.log('  Token present:', !!token);
    
    if (!community || !user || !postContent.trim()) {
      Alert.alert('Error', 'Please enter post content');
      return;
    }
    
    if (showPollCreator) {
      const validPollOptions = pollOptions.filter(option => option.trim());
      if (validPollOptions.length < 2) {
        Alert.alert('Error', 'Poll must have at least 2 options');
        return;
      }
    }
    
    if (!token) {
      Alert.alert('Error', 'You must be logged in to create a post.');
      return;
    }
    
    try {
      setIsCreatingPost(true);
      
      // New backend structure - uses 'discription' instead of 'content'
      const postData: any = {
        discription: postContent.trim(), // Backend expects 'discription' (misspelled)
        imageUris: imageUrls.length > 0 ? imageUrls : [], // Pass image URIs for file upload
        type: showPollCreator ? 'poll' : postType
      };
      
      // Add resource fields if it's a resource type post
      if (postType === 'resource') {
        postData.resourceUrl = postData.resourceUrl || '';
        postData.resourceType = postData.resourceType || 'link';
      }
      
      // Handle poll options for poll posts
      if (showPollCreator) {
        // For now, we'll need to see how the backend handles poll options
        // This might need to be adjusted based on backend expectations
        postData.pollOptions = pollOptions.filter(option => option.trim());
      }
      
      console.log('  Final post data:', JSON.stringify(postData, null, 2));
      console.log('  Calling createPost...');
      
      await createPost(token, community.id, postData);
      
      console.log('  ✅ Post created successfully!');
      
      // Refresh community posts to show the new post
      console.log('  🔄 Refreshing community posts...');
      try {
        await fetchCommunityPosts(token, community.id, { sortBy: 'new' });
        console.log('  ✅ Community posts refreshed successfully!');
      } catch (refreshError) {
        console.warn('  ⚠️ Failed to refresh community posts:', refreshError);
      }
      
      resetPostForm();
      setCreatePostModalVisible(false);
      
      // Show success message
      Alert.alert('Success', 'Your post has been created successfully!');
    } catch (error: any) {
      console.error('  ❌ Failed to create post:', error);
      console.error('    Error type:', typeof error);
      console.error('    Error message:', error?.message || error?.toString());
      console.error('    Error stack:', error?.stack);
      console.error('    Full error:', error);
      
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      Alert.alert('Error', `Failed to create post: ${errorMessage}`);
    } finally {
      setIsCreatingPost(false);
    }
  };
  
  const handleCreateAnnouncement = () => {
    if (!community || !user || !announcementTitle.trim() || !announcementContent.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    createAnnouncement(community.id, {
      communityId: community.id,
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      createdBy: user.id
    });
    
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setCreateAnnouncementModalVisible(false);
  };

  const handleAddImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        // Store the image URIs directly - we'll send them with the post
        const newImageUris = result.assets.map(asset => asset.uri);
        setImageUrls(prev => [...prev, ...newImageUris]);
        console.log('📷 Images selected:', newImageUris.length);
      }
    } catch (error) {
      console.error('❌ Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const resetPostForm = () => {
    setPostContent('');
    setPostType('text');
    setImageUrls([]);
    setVisibility('members');
    setPollOptions(['', '']);
    setShowPollCreator(false);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  // Memoize membership check to prevent unnecessary re-calculations and infinite loops
  const isUserMember = useMemo(() => {
    if (!user || !community) return false;
    
    // Check if user is in members array OR in joinedCommunities store
    const isMemberInCommunity = Array.isArray(community.members) && community.members.includes(user.id);
    const isJoinedInStore = joinedCommunities.some(jc => jc.communityId === community.id);
    
    // Also check if user is admin, moderator, or owner (they are members by default)
    const isAdminOrMod = (Array.isArray(community.admins) && community.admins.includes(user.id)) || 
                        (Array.isArray(community.moderators) && community.moderators.includes(user.id)) ||
                        (community.owner === user.id) ||
                        (community.createdBy === user.id);
    
    return isMemberInCommunity || isJoinedInStore || isAdminOrMod;
  }, [user?.id, community?.id, community?.members, community?.admins, community?.moderators, community?.owner, community?.createdBy, joinedCommunities]);

  const isUserOwner = () => {
    if (!user || !community) return false;
    return (community.owner === user.id) || (community.createdBy === user.id);
  };

  const isUserAdmin = () => {
    return user && community && community.admins && community.admins.includes(user.id);
  };
  
  const canModerateContent = () => {
    if (!user || !community) return false;
    
    // TEMPORARY SIMULATION: Make current user the owner if they created the community
    const isCreatedByCurrentUser = community.createdBy === user.id;
    if (isCreatedByCurrentUser) {
      return true;
    }
    
    const userRole = getUserRole(community.id, user.id);
    return userRole === 'owner' || userRole === 'admin' || userRole === 'moderator';
  };
  
  const handleModerationAction = (action: 'delete' | 'pin' | 'unpin', postId: string, commentId?: string) => {
    if (!user || !community) return;
    
    switch (action) {
      case 'delete':
        if (commentId) {
          Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: () => deleteComment(community.id, postId, commentId, user.id)
              }
            ]
          );
        } else {
          Alert.alert(
            'Delete Post',
            'Are you sure you want to delete this post?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: async () => {
                  if (!token) return;
                  try {
                    await deletePost(token, community.id, postId);
                    Alert.alert('Success', 'Post deleted');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Failed to delete post');
                  }
                }
              }
            ]
          );
        }
        break;
      case 'pin':
        if (token) {
          pinPost(token, community.id, postId);
          Alert.alert('Success', 'Post has been pinned');
        }
        break;
      case 'unpin':
        if (token) {
          unpinPost(token, community.id, postId);
          Alert.alert('Success', 'Post has been unpinned');
        }
        break;
    }
    setModerationMenuVisible(null);
  };

  const getOnlineCount = () => {
    // Mock online count - in real app this would come from API
    return Math.floor(community?.memberCount ? community.memberCount * 0.05 : 0);
  };

  const getSortedPosts = () => {
    if (!community) return [];
    
    // Filter out question posts and answer posts, only keep regular posts (text, image, etc.)
    let posts = [...community.posts.filter(post => post.type !== 'question')];
    
    // No longer include answer posts in the feed
    // const answerPosts = getAnswersFromQuestions().map((answer, idx) => ({
    //   ...answer,
    //   id: `answer-${answer.question.id}-${answer.id || answer._id || idx}`,
    //   type: 'answer',
    //   createdAt: answer.createdAt,
    //   isAnswerPost: true
    // }));
    
    // Only use regular posts (no questions, no answers)
    const allPosts = [...posts];
    
    switch (sortBy) {
      case 'best':
        return allPosts.sort((a, b) => {
          const aLikes = typeof (a as any).likesCount === 'number' ? (a as any).likesCount : (a.likes?.length || 0);
          const bLikes = typeof (b as any).likesCount === 'number' ? (b as any).likesCount : (b.likes?.length || 0);
          const aEngagement = aLikes + (a.comments?.length || 0);
          const bEngagement = bLikes + (b.comments?.length || 0);
          return bEngagement - aEngagement;
        });
      case 'new':
        return allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'top':
        return allPosts.sort((a, b) => {
          const aLikes = typeof (a as any).likesCount === 'number' ? (a as any).likesCount : (a.likes?.length || 0);
          const bLikes = typeof (b as any).likesCount === 'number' ? (b as any).likesCount : (b.likes?.length || 0);
          return bLikes - aLikes;
        });
      default:
        return allPosts;
    }
  };

  const getQuestionsAndAnswers = () => {
    if (!community) return [];
    
    console.log('🤔 [getQuestionsAndAnswers] Filtering questions from posts:');
    console.log('  Total posts:', community.posts.length);
    
    // Debug each post type
    community.posts.forEach((post, index) => {
      console.log(`  Post ${index + 1}:`, {
        id: post.id,
        type: post.type,
        subtype: (post as any).subtype,
        content: post.content ? post.content.substring(0, 50) + '...' : 'No content',
        isQuestion: post.type === 'question' || (post as any).subtype === 'question'
      });
    });
    
    // Filter posts that are questions (check both type and subtype fields)
    const questions = community.posts.filter(post => 
      post.type === 'question' || (post as any).subtype === 'question'
    );
    console.log('  Filtered questions count:', questions.length);
    
    return questions;
  };

  const getAnswersFromQuestions = () => {
    if (!community) return [];
    
    const answers: any[] = [];
    
    // Find all questions that have answers (check both type and subtype fields)
    const questions = community.posts.filter(post => 
      post.type === 'question' || (post as any).subtype === 'question'
    );
    
    questions.forEach(question => {
      if (question.comments && question.comments.length > 0) {
        question.comments.forEach(answer => {
          answers.push({
            ...answer,
            question: {
              id: question.id,
              content: question.content,
              author: {
                id: question.userId || (question as any).UserId,
                name: question.authorName,
                avatar: question.authorAvatar
              },
              createdAt: question.createdAt
            }
          });
        });
      }
    });
    
    // Sort answers by creation date (newest first)
    return answers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const handleCreateQuestion = async () => {
    console.log('🚀 [CommunityDetail] Starting handleCreateQuestion...');
    console.log('  Community:', community ? { id: community.id, name: community.name } : 'null');
    console.log('  User:', user ? { id: user.id, name: user.name } : 'null');
    console.log('  Question content length:', questionContent.trim().length);
    console.log('  Token present:', !!token);
    
    if (!community || !user || !questionContent.trim()) {
      Alert.alert('Error', 'Please enter your question');
      return;
    }
    
    if (!token) {
      Alert.alert('Error', 'You must be logged in to ask a question.');
      return;
    }
    
    try {
      // Backend expects 'discription' field (misspelled), not 'content'
      const questionData = {
        discription: questionContent.trim(), // Backend expects 'discription' (misspelled)
        type: 'question' as const
      };
      
      console.log('  📤 Final question data being sent to backend:', JSON.stringify(questionData, null, 2));
      
      await createPost(token, community.id, questionData);
      
      console.log('  ✅ Question created successfully!');
      
      // Refresh community posts to show the new question
      console.log('  🔄 Refreshing community posts...');
      try {
        await fetchCommunityPosts(token, community.id, { sortBy: 'new' });
        console.log('  ✅ Community posts refreshed successfully!');
      } catch (refreshError) {
        console.warn('  ⚠️ Failed to refresh community posts:', refreshError);
      }
      
      setQuestionContent('');
      setQaModalVisible(false);
      Alert.alert('Success', 'Your question has been posted!');
    } catch (error: any) {
      console.error('  ❌ Failed to create question:', error);
      console.error('    Error type:', typeof error);
      console.error('    Error message:', error?.message || error?.toString());
      console.error('    Error stack:', error?.stack);
      console.error('    Full error:', error);
      
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      Alert.alert('Error', `Failed to post question: ${errorMessage}`);
    }
  };
  
  

  if (!community) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            headerShown: true,
            headerTitle: 'Community',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading community...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: '',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              {canModerateContent() && (
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={() => router.push(`/community/${id}/settings`)}
                >
                  <Settings size={22} color={Colors.dark.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.headerButton}>
                <MoreHorizontal size={22} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
          ),
        }} 
      />
      
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {/* Community Header */}
        <View style={styles.communityHeader}>
          <View style={styles.communityBanner}>
            <Image 
              source={{ uri: community.coverImage }} 
              style={styles.bannerImage} 
            />
          </View>
          
          <View style={styles.communityInfo}>
            <View style={styles.communityTitleRow}>
              <View style={styles.communityIconContainer}>
                {community.logo ? (
                  <Image source={{ uri: community.logo }} style={styles.communityLogo} />
                ) : (
                  <View style={styles.defaultCommunityLogo}>
                    <Text style={styles.defaultCommunityLogoText}>
                      {community.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.communityDetails}>
                <Text style={styles.communityName}>{community.name}</Text>
                <View style={styles.communityStats}>
                  <Text style={styles.memberCount}>
                    {community.memberCount.toLocaleString()} members
                  </Text>
                  <View style={styles.onlineIndicator} />
                  <Text style={styles.onlineCount}>
                    {getOnlineCount()} online
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Action Buttons Row */}
            <View style={styles.actionButtons}>
              {/* Action Buttons Row */}
              <TouchableOpacity 
                style={styles.chatRoomButton}
                onPress={() => {
                  const groupChatId = (community as any).groupChatId;
                  if (groupChatId) {
                    router.push({
                      pathname: `/messages/${groupChatId}`,
                      params: { 
                        otherUserName: community.name, 
                        otherUserAvatar: community.logo,
                        isGroupChat: 'true'
                      },
                    } as any);
                  } else {
                    Alert.alert("Chat Not Available", "This community does not have a group chat enabled.");
                  }
                }}
              >
                <MessageSquare size={20} color={Colors.dark.primary} />
                <Text style={styles.chatRoomText}>Chat Room</Text>
              </TouchableOpacity>
              
              {isUserOwner() ? (
                <TouchableOpacity 
                  style={styles.ownerButton}
                  disabled
                >
                  <Text style={styles.ownerButtonText}>Owner</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.joinButtonTouchable,
                    isUserMember ? styles.joinedButton : styles.joinButton
                  ]}
                  onPress={isUserMember ? handleLeaveCommunity : handleJoinCommunity}
                >
                  <Text style={[
                    styles.joinButtonText,
                    isUserMember ? styles.joinedButtonText : styles.joinButtonTextActive
                  ]}>
                    {isUserMember ? "Joined" : "Join"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.navigationContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScrollContainer}
            contentContainerStyle={styles.tabsContainer}
          >
            <TouchableOpacity
              style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
              onPress={() => setActiveTab('feed')}
            >
              <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>
                Feed
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'questions' && styles.activeTab]}
              onPress={() => setActiveTab('questions')}
            >
              <Text style={[styles.tabText, activeTab === 'questions' && styles.activeTabText]}>
                Questions
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'events' && styles.activeTab]}
              onPress={() => setActiveTab('events')}
            >
              <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
                Events
              </Text>
            </TouchableOpacity>
            
            {/* Q&A Tab - Commented out for later use */}
            {/* <TouchableOpacity
              style={[styles.tab, activeTab === 'qa' && styles.activeTab]}
              onPress={() => setActiveTab('qa')}
            >
              <Text style={[styles.tabText, activeTab === 'qa' && styles.activeTabText]}>
                Q&A
              </Text>
            </TouchableOpacity> */}
            
            <TouchableOpacity
              style={[styles.tab, activeTab === 'about' && styles.activeTab]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>
                About
              </Text>
            </TouchableOpacity>
          </ScrollView>
          
          {activeTab === 'feed' && (
            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setShowSortDropdown(!showSortDropdown)}
              >
                <Text style={styles.sortText}>
                  {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                </Text>
                <ChevronDown size={16} color={Colors.dark.text} />
              </TouchableOpacity>
              
              {showSortDropdown && (
                <View style={styles.sortDropdown}>
                  {['best', 'new', 'top'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.sortOption}
                      onPress={() => {
                        setSortBy(option);
                        setShowSortDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.sortOptionText,
                        sortBy === option && styles.sortOptionTextActive
                      ]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Content */}
        {activeTab === 'feed' && (
          <View style={styles.tabContent}>
          <View style={styles.feedContainer}>
            {/* Community Highlights */}
            {community.announcements.length > 0 && (
              <View style={styles.highlightsSection}>
                <Text style={styles.highlightsTitle}>Community highlights</Text>
                {community.announcements.slice(0, 1).map(announcement => (
                  <TouchableOpacity key={announcement.id} style={styles.highlightCard}>
                    <Text style={styles.highlightTitle}>{announcement.title}</Text>
                    <Text style={styles.highlightSubtitle}>
                      {announcement.content.length > 100 
                        ? announcement.content.substring(0, 100) + '...'
                        : announcement.content
                      }
                    </Text>
                    <Badge label="Announcement" variant="primary" size="small" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Posts Feed */}
            <View style={styles.postsContainer}>
              {getSortedPosts().length > 0 ? (
                getSortedPosts().map(post => {
                  // Check if this is an answer post
                  if ((post as any).isAnswerPost) {
                    return (
                      <TouchableOpacity 
                        key={post.id} 
                        style={styles.answerPostCard}
                        onPress={() => {
                          router.push(`/qa/${(post as any).question?.id}` as any);
                        }}
                      >
                        {/* Answer Author Header */}
                        <View style={styles.answerPostHeader}>
                          <Avatar 
                            source={post.authorAvatar} 
                            name={post.authorName} 
                            size={36} 
                          />
                          <View style={styles.answerPostAuthorInfo}>
                            <View style={styles.answerPostAuthorRow}>
<Text style={styles.answerPostAuthorName}>{post.authorName}</Text>
                              <Badge label="Answer" variant="success" size="small" style={styles.answerPostBadge} />
                            </View>
                            <Text style={styles.answerPostTime}>answered {formatTimeAgo(post.createdAt)}</Text>
                          </View>
                        <TouchableOpacity 
                          style={styles.answerPostMenuButton}
                          onPress={() => {
                          if (canModerateContent() || (((post as any).userId || (post as any).UserId) === user?.id)) {
                              setModerationMenuVisible(moderationMenuVisible === post.id ? null : post.id);
                              setSelectedPostId(post.id);
                            }
                          }}
                        >
                          <MoreHorizontal size={16} color={Colors.dark.subtext} />
                        </TouchableOpacity>
                        
                        {/* Answer Moderation Menu */}
                        {moderationMenuVisible === post.id && (canModerateContent() || (((post as any).userId || (post as any).UserId) === user?.id)) && (
                          <View style={styles.moderationMenu}>
                            {canModerateContent() && (
                              <TouchableOpacity
                                style={styles.moderationMenuItem}
                                onPress={() => handleModerationAction('delete', (post as any).question?.id as any, post.id)}
                              >
                                <Trash2 size={16} color={Colors.dark.error} />
                                <Text style={[styles.moderationMenuText, { color: Colors.dark.error }]}>
                                  Delete Answer
                                </Text>
                              </TouchableOpacity>
                            )}
                            
                            {(((post as any).userId || (post as any).UserId) === user?.id) && (
                              <TouchableOpacity
                                style={styles.moderationMenuItem}
                                onPress={() => {
                                  Alert.alert('Edit Answer', 'Edit functionality coming soon!');
                                  setModerationMenuVisible(null);
                                }}
                              >
                                <Edit3 size={16} color={Colors.dark.primary} />
                                <Text style={styles.moderationMenuText}>Edit Answer</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                        </View>
                        
                        {/* Question Context Section */}
                        <View style={styles.questionContextSection}>
                          <View style={styles.questionContextHeader}>
                            <Avatar 
                              source={(post as any).question?.author?.avatar} 
                              name={(post as any).question?.author?.name || 'User'} 
                              size={24} 
                            />
<Text style={styles.questionContextAuthor}>{(post as any).question?.author?.name || 'User'} asked:</Text>
                          </View>
                          <Text style={styles.questionContextContent}>{(post as any).question?.content}</Text>
                        </View>
                        
                        {/* Answer Content */}
                        <View style={styles.answerContentSection}>
                          <Text style={styles.answerContentText}>{post.content}</Text>
                        </View>
                        
                        {/* Answer Actions */}
                        <View style={styles.answerPostActions}>
                          <View style={styles.answerVoteContainer}>
                            <Heart size={16} color={(post as any).likedByCurrentUser || post.likes?.includes(user?.id || '') ? Colors.dark.primary : Colors.dark.subtext} fill={(post as any).likedByCurrentUser || post.likes?.includes(user?.id || '') ? Colors.dark.primary : 'none'} />
                            <Text style={styles.answerVoteCount}>{typeof (post as any).likesCount === 'number' ? (post as any).likesCount : (post.likes?.length || 0)}</Text>
                          </View>
                          
                          <TouchableOpacity style={styles.answerActionButton}>
                            <MessageSquare size={16} color={Colors.dark.subtext} />
                            <Text style={styles.answerActionText}>Reply</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity style={styles.answerActionButton}>
                            <Share size={16} color={Colors.dark.subtext} />
                          </TouchableOpacity>
                          
                          <TouchableOpacity style={styles.answerActionButton}>
                            <Bookmark size={16} color={Colors.dark.subtext} />
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={styles.viewQuestionButton}
                            onPress={() => {
                              router.push(`/qa/${(post as any).question?.id}` as any);
                            }}
                          >
                            <ExternalLink size={16} color={Colors.dark.primary} />
                            <Text style={styles.viewQuestionText}>View Question</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  }
                  
                  // Regular post rendering - reuse main PostCard UI with communityDetail variant
                  return (
                    <View key={post.id} style={styles.postCardWrapper}>
                      <PostCard 
                        post={mapCommunityToHomePost(post, community, user?.id, createdQuestionPostIds)} 
                        variant="communityDetail" 
                      />
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyStateContainer}>
                  <MessageSquare size={40} color={Colors.dark.subtext} />
                  <Text style={styles.emptyStateText}>No posts yet</Text>
                  {isUserMember && (
                    <Button
                      title="Create First Post"
                      onPress={() => setCreatePostModalVisible(true)}
                      style={styles.emptyStateButton}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
          </View>
        )}

        {activeTab === 'questions' && (
          <View style={styles.tabContent}>
          <View style={styles.questionsContainer}>
            {/* Questions Header */}
            <View style={styles.qaHeader}>
              <Text style={styles.qaTitle}>All Questions</Text>
              {/* Temporarily showing for all users - change back to isUserMember when needed */}
              <TouchableOpacity
                style={styles.askQuestionButton}
                onPress={() => setQaModalVisible(true)}
              >
                <Plus size={16} color={Colors.dark.primary} />
                <Text style={styles.askQuestionText}>Ask Question</Text>
              </TouchableOpacity>
            </View>
            
            {/* Questions List */}
            <View style={styles.questionsListContainer}>
              {getQuestionsAndAnswers().length > 0 ? (
                getQuestionsAndAnswers().map((question) => (
                  <TouchableOpacity 
                    key={question.id} 
                    style={styles.questionPostCard}
                    onPress={() => {
                      console.log('🔗 [Questions Tab] Navigating to question post:', {
                        questionId: question.id,
                        route: `/post/${question.id}`,
                        questionContent: question.content?.substring(0, 50) + '...'
                      });
                      router.push(`/post/${question.id}`);
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Question Author Header */}
                    <View style={styles.questionPostHeader}>
                      <Avatar 
                        source={question.authorAvatar} 
                        name={question.authorName} 
                        size={36} 
                      />
                      <View style={styles.questionPostAuthorInfo}>
                        <View style={styles.questionPostAuthorRow}>
<Text style={styles.questionPostAuthorName}>{question.authorName}</Text>
                          <Badge label="Question" variant="secondary" size="small" style={styles.questionPostBadge} />
                        </View>
                        <Text style={styles.questionPostTime}>asked {formatTimeAgo(question.createdAt)}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.questionPostMenuButton}
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent parent TouchableOpacity from firing
                          if (canModerateContent() || (((question as any).UserId || question.userId) === user?.id)) {
                            setModerationMenuVisible(moderationMenuVisible === question.id ? null : question.id);
                            setSelectedPostId(question.id);
                          }
                        }}
                      >
                        <MoreHorizontal size={16} color={Colors.dark.subtext} />
                      </TouchableOpacity>
                      
                      {/* Question Moderation Menu */}
                      {moderationMenuVisible === question.id && (canModerateContent() || (((question as any).UserId || question.userId) === user?.id)) && (
                        <View style={styles.moderationMenu}>
                          {canModerateContent() && (
                            <TouchableOpacity
                              style={styles.moderationMenuItem}
                              onPress={() => handleModerationAction('delete', question.id)}
                            >
                              <Trash2 size={16} color={Colors.dark.error} />
                              <Text style={[styles.moderationMenuText, { color: Colors.dark.error }]}>
                                Delete Question
                              </Text>
                            </TouchableOpacity>
                          )}
                          
                          {canModerateContent() && (
                            <TouchableOpacity
                              style={styles.moderationMenuItem}
                              onPress={() => handleModerationAction('pin', question.id)}
                            >
                              <Pin size={16} color={Colors.dark.primary} />
                              <Text style={styles.moderationMenuText}>Pin Question</Text>
                            </TouchableOpacity>
                          )}
                          
                          {(((question as any).UserId || question.userId) === user?.id) && (
                            <TouchableOpacity
                              style={styles.moderationMenuItem}
                              onPress={() => {
                                Alert.alert('Edit Question', 'Edit functionality coming soon!');
                                setModerationMenuVisible(null);
                              }}
                            >
                              <Edit3 size={16} color={Colors.dark.primary} />
                              <Text style={styles.moderationMenuText}>Edit Question</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                    
                    {/* Question Content */}
                    <View style={styles.questionPostContent}>
                      <Text style={styles.questionPostText}>{question.content}</Text>
                    </View>
                    
                    {/* Question Stats */}
                    <View style={styles.questionPostStats}>
                      <TouchableOpacity 
                        style={styles.questionStatItem}
                        onPress={(e) => { 
                          e.stopPropagation(); // Prevent parent TouchableOpacity from firing
                          if (token) likePost(token, question.id); 
                        }}
                        activeOpacity={0.7}
                      >
                        <Heart 
                          size={16} 
                          color={(question as any).likedByCurrentUser || (question.likes?.includes(user?.id || '') ?? false) ? Colors.dark.primary : Colors.dark.subtext}
                          fill={(question as any).likedByCurrentUser || (question.likes?.includes(user?.id || '') ?? false) ? Colors.dark.primary : 'none'}
                        />
                        <Text style={styles.questionStatText}>{typeof (question as any).likesCount === 'number' ? (question as any).likesCount : question.likes?.length || 0}</Text>
                      </TouchableOpacity>
                      
                      <View style={styles.questionStatItem}>
                        <MessageSquare size={16} color={Colors.dark.subtext} />
                        <Text style={styles.questionStatText}>{question.comments?.length || 0} answers</Text>
                      </View>
                      
                      
                      <TouchableOpacity 
                        style={styles.answerQuestionButton}
                        onPress={() => {
                          router.push(`/post/${question.id}`);
                        }}
                      >
                        <Text style={styles.answerQuestionText}>Answer</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <HelpCircle size={40} color={Colors.dark.subtext} />
                  <Text style={styles.emptyStateText}>No questions yet</Text>
                  <Text style={styles.emptyStateSubtext}>Be the first to ask a question in this community!</Text>
                  <Button
                    title="Ask First Question"
                    onPress={() => setQaModalVisible(true)}
                    style={styles.emptyStateButton}
                  />
                </View>
              )}
            </View>
          </View>
          </View>
        )}
        
        {/* Events Tab Content */}
        {activeTab === 'events' && community && (
          <CommunityEventsTab 
            communityId={community.id} 
            community={community} 
          />
        )}
        

        {/* Q&A Tab Content - Commented out for later use */}
        {/* {activeTab === 'qa' && (
          <View style={styles.qaContainer}>
            {/* Q&A Header */}
            {/* <View style={styles.qaHeader}>
              <Text style={styles.qaTitle}>Recent Answers</Text>
              {/* Temporarily showing for all users - change back to isUserMember() when needed */}
              {/* <TouchableOpacity
                style={styles.askQuestionButton}
                onPress={() => setQaModalVisible(true)}
              >
                <Plus size={16} color={Colors.dark.primary} />
                <Text style={styles.askQuestionText}>Ask Question</Text>
              </TouchableOpacity>
            </View> */}
            
            {/* Answer Posts List */}
            {/* <View style={styles.answersListContainer}>
              {getAnswersFromQuestions().length > 0 ? (
                getAnswersFromQuestions().map((answer, idx) => (
                  <TouchableOpacity 
                    key={`${answer.question.id}-${answer.id || answer._id || idx}`} 
                    style={styles.answerPostCard}
                    onPress={() => {
                      router.push(`/qa/${answer.question.id}`);
                    }}
                  >
                    {/* Answer Author Header */}
                    {/* <View style={styles.answerPostHeader}>
                      <Avatar 
                        source={answer.authorAvatar} 
                        name={answer.authorName} 
                        size={36} 
                      />
                      <View style={styles.answerPostAuthorInfo}>
                        <View style={styles.answerPostAuthorRow}>
                          <Text style={styles.answerPostAuthorName}>u/{answer.authorName}</Text>
                          <Badge label="Answer" variant="success" size="small" style={styles.answerPostBadge} />
                        </View>
                        <Text style={styles.answerPostTime}>answered {formatTimeAgo(answer.createdAt)}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.answerPostMenuButton}
                        onPress={() => {
                          if (canModerateContent() || answer.authorId === user?.id) {
                            setModerationMenuVisible(moderationMenuVisible === `${answer.question.id}-${answer.id}` ? null : `${answer.question.id}-${answer.id}`);
                            setSelectedPostId(answer.id);
                          }
                        }}
                      >
                        <MoreHorizontal size={16} color={Colors.dark.subtext} />
                      </TouchableOpacity>
                      
                      {/* Q&A Answer Moderation Menu */}
                      {/* {moderationMenuVisible === `${answer.question.id}-${answer.id}` && (canModerateContent() || answer.authorId === user?.id) && (
                        <View style={styles.moderationMenu}>
                          {canModerateContent() && (
                            <TouchableOpacity
                              style={styles.moderationMenuItem}
                              onPress={() => handleModerationAction('delete', answer.question.id, answer.id)}
                            >
                              <Trash2 size={16} color={Colors.dark.error} />
                              <Text style={[styles.moderationMenuText, { color: Colors.dark.error }]}>
                                Delete Answer
                              </Text>
                            </TouchableOpacity>
                          )}
                          
                          {answer.authorId === user?.id && (
                            <TouchableOpacity
                              style={styles.moderationMenuItem}
                              onPress={() => {
                                Alert.alert('Edit Answer', 'Edit functionality coming soon!');
                                setModerationMenuVisible(null);
                              }}
                            >
                              <Edit3 size={16} color={Colors.dark.primary} />
                              <Text style={styles.moderationMenuText}>Edit Answer</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )} */}
                    {/* </View> */}
                    
                    {/* Question Context Section */}
                    {/* <View style={styles.questionContextSection}>
                      <View style={styles.questionContextHeader}>
                        <Avatar 
                          source={answer.question.author.avatar} 
                          name={answer.question.author.name} 
                          size={24} 
                        />
                        <Text style={styles.questionContextAuthor}>u/{answer.question.author.name} asked:</Text>
                      </View>
                      <Text style={styles.questionContextContent}>{answer.question.content}</Text>
                    </View> */}
                    
                    {/* Answer Content */}
                    {/* <View style={styles.answerContentSection}>
                      <Text style={styles.answerContentText}>{answer.content}</Text>
                    </View> */}
                    
                    {/* Answer Actions */}
                    {/* <View style={styles.answerPostActions}>
                      <TouchableOpacity style={styles.answerVoteContainer}>
                        <ArrowUp size={16} color={Colors.dark.subtext} />
                        <Text style={styles.answerVoteCount}>{answer.likes?.length || 0}</Text>
                        <ArrowDown size={16} color={Colors.dark.subtext} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.answerActionButton}>
                        <MessageSquare size={16} color={Colors.dark.subtext} />
                        <Text style={styles.answerActionText}>Reply</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.answerActionButton}>
                        <Share size={16} color={Colors.dark.subtext} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.answerActionButton}>
                        <Bookmark size={16} color={Colors.dark.subtext} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.viewQuestionButton}
                        onPress={() => {
                          router.push(`/qa/${answer.question.id}`);
                        }}
                      >
                        <ExternalLink size={16} color={Colors.dark.primary} />
                        <Text style={styles.viewQuestionText}>View Question</Text>
                      </TouchableOpacity>
                    </View> */}
                  {/* </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyStateContainer}>
                  <HelpCircle size={40} color={Colors.dark.subtext} />
                  <Text style={styles.emptyStateText}>No answers yet</Text>
                  <Text style={styles.emptyStateSubtext}>Ask a question to get the conversation started!</Text>
                  <Button
                    title="Ask First Question"
                    onPress={() => setQaModalVisible(true)}
                    style={styles.emptyStateButton}
                  />
                </View>
              )}
            </View>
          </View>
        )} */}

        {activeTab === 'about' && (
          <View style={styles.tabContent}>
          <View style={styles.aboutContainer}>
            <View style={styles.aboutSection}>
              <Text style={styles.aboutTitle}>About Community</Text>
              <Text style={styles.aboutDescription}>{community.description}</Text>
              
              {community.location && (
                <View style={styles.aboutItem}>
                  <MapPin size={16} color={Colors.dark.subtext} />
                  <Text style={styles.aboutItemText}>{community.location}</Text>
                </View>
              )}
              
              <View style={styles.aboutItem}>
                <Calendar size={16} color={Colors.dark.subtext} />
                <Text style={styles.aboutItemText}>
                  Created {new Date(community.createdAt).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.tagsContainer}>
                {community.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    label={tag}
                    variant="secondary"
                    size="small"
                    style={styles.tag}
                  />
                ))}
              </View>
            </View>
          </View>
          </View>
        )}
      </ScrollView>
      
      {/* Create Post Modal */}
      <Modal
        visible={createPostModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (postContent.trim() || imageUrls.length > 0) {
            Alert.alert(
              'Discard Post',
              'Are you sure you want to discard this post?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => {
                  resetPostForm();
                  setCreatePostModalVisible(false);
                }}
              ]
            );
          } else {
            setCreatePostModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => {
                if (postContent.trim() || imageUrls.length > 0) {
                  Alert.alert(
                    'Discard Post',
                    'Are you sure you want to discard this post?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Discard', style: 'destructive', onPress: () => {
                        resetPostForm();
                        setCreatePostModalVisible(false);
                      }}
                    ]
                  );
                } else {
                  setCreatePostModalVisible(false);
                }
              }}>
                <X size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {/* User Header Section */}
              <View style={styles.userHeaderSection}>
                <Avatar source={user?.avatar} size={50} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <TouchableOpacity 
                    style={styles.visibilitySelector}
                    onPress={() => {
                      Alert.alert(
                        'Post Visibility',
                        'Who can see your post?',
                        [
                          { 
                            text: 'Members Only', 
                            onPress: () => setVisibility('members') 
                          },
                          { 
                            text: 'Public', 
                            onPress: () => setVisibility('public') 
                          },
                          { 
                            text: 'Private', 
                            onPress: () => setVisibility('private') 
                          },
                          { text: 'Cancel', style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    {visibility === 'public' && <Globe size={16} color={Colors.dark.text} />}
                    {visibility === 'members' && <Users size={16} color={Colors.dark.text} />}
                    {visibility === 'private' && <FileText size={16} color={Colors.dark.text} />}
                    <Text style={styles.visibilityText}>
                      {visibility === 'public' ? 'Public' : 
                       visibility === 'members' ? 'Members' : 'Private'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TextInput
                style={styles.postInput}
                placeholder="What's on your mind?"
                placeholderTextColor={Colors.dark.subtext}
                multiline
                value={postContent}
                onChangeText={setPostContent}
                autoFocus
              />
              
              {imageUrls.length > 0 && (
                <View style={styles.imagesContainer}>
                  <FlatList
                    data={imageUrls}
                    horizontal={imageUrls.length > 1}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                      <View style={styles.imageContainer}>
                        <Image 
                          source={{ uri: item }} 
                          style={[
                            styles.postImage,
                            imageUrls.length > 1 ? styles.multipleImages : styles.singleImage
                          ]} 
                          resizeMode="contain"
                        />
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => handleRemoveImage(index)}
                        >
                          <X size={20} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                    keyExtractor={(item, index) => `image-${index}`}
                    contentContainerStyle={styles.imagesList}
                  />
                </View>
              )}
              
              {showPollCreator && (
                <View style={styles.pollOptionsContainer}>
                  <Text style={styles.pollTitle}>Poll Options</Text>
                  {pollOptions.map((option, index) => (
                    <View key={index} style={styles.pollOptionRow}>
                      <TextInput
                        style={styles.pollOptionInput}
                        placeholder={`Option ${index + 1}`}
                        placeholderTextColor={Colors.dark.subtext}
                        value={option}
                        onChangeText={(text) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = text;
                          setPollOptions(newOptions);
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity
                          style={styles.removePollOptionButton}
                          onPress={() => {
                            if (pollOptions.length > 2) {
                              setPollOptions(pollOptions.filter((_, i) => i !== index));
                            }
                          }}
                        >
                          <X size={16} color={Colors.dark.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  
                  <View style={styles.pollActionsRow}>
                    <TouchableOpacity
                      style={styles.addPollOptionButton}
                      onPress={() => {
                        if (pollOptions.length < 5) {
                          setPollOptions([...pollOptions, '']);
                        } else {
                          Alert.alert('Limit reached', 'You can only add up to 5 options.');
                        }
                      }}
                      disabled={pollOptions.length >= 5}
                    >
                      <Plus size={16} color={pollOptions.length >= 5 ? Colors.dark.subtext : Colors.dark.primary} />
                      <Text style={[styles.addPollOptionText, pollOptions.length >= 5 && styles.disabledText]}>Add Option</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.removePollButton}
                      onPress={() => {
                        setShowPollCreator(false);
                        setPollOptions(['', '']);
                      }}
                    >
                      <Text style={styles.removePollButtonText}>Remove Poll</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              <View style={styles.attachmentsContainer}>
                <Text style={styles.attachmentsTitle}>Add to your post</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.attachmentButtons}
                >
                  <TouchableOpacity 
                    style={styles.attachmentButton}
                    onPress={handleAddImage}
                  >
                    <ImageIcon size={20} color={Colors.dark.success} />
                    <Text style={styles.attachmentText}>Gallery</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.attachmentButton}>
                    <MapPin size={20} color={Colors.dark.tint} />
                    <Text style={styles.attachmentText}>Location</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.attachmentButton}
                    onPress={() => setShowPollCreator(!showPollCreator)}
                  >
                    <FileText size={20} color={showPollCreator ? Colors.dark.primary : Colors.dark.info} />
                    <Text style={[styles.attachmentText, showPollCreator && { color: Colors.dark.primary }]}>Poll</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
              
              <Button
                title={isCreatingPost ? 'Posting...' : 'Post'}
                onPress={handleCreatePost}
                gradient
                style={styles.postButton}
                disabled={isCreatingPost || (!postContent.trim() && imageUrls.length === 0 && !showPollCreator)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Create Announcement Modal */}
      <Modal
        visible={createAnnouncementModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateAnnouncementModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Announcement</Text>
              <TouchableOpacity onPress={() => setCreateAnnouncementModalVisible(false)}>
                <X size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              <Input
                label="Title *"
                placeholder="Announcement title"
                value={announcementTitle}
                onChangeText={setAnnouncementTitle}
              />
              
              <TextInput
                style={styles.postTextArea}
                placeholder="Announcement content"
                placeholderTextColor={Colors.dark.subtext}
                value={announcementContent}
                onChangeText={setAnnouncementContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              
              <Button
                title="Create Announcement"
                onPress={handleCreateAnnouncement}
                disabled={!announcementTitle.trim() || !announcementContent.trim()}
                gradient
                style={styles.createButton}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Q&A Modal */}
      <Modal
        visible={qaModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setQaModalVisible(false)}
      >
        <View style={styles.qaModalContainer}>
          {/* Q&A Modal Header */}
          <View style={styles.qaModalHeader}>
            <TouchableOpacity onPress={() => setQaModalVisible(false)} style={styles.qaModalBackButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
            <Text style={styles.qaModalTitle}>Community Q&A</Text>
            <TouchableOpacity style={styles.qaModalActionButton}>
              <Send size={20} color={Colors.dark.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Recent Questions List */}
          <FlatList
            data={getQuestionsAndAnswers()}
            keyExtractor={(item) => item.id}
            renderItem={({item: question}) => (
              <TouchableOpacity 
                style={styles.qaListItem}
                onPress={() => {
                  setQaModalVisible(false);
                  router.push(`/post/${question.id}`);
                }}
              >
                <View style={styles.qaListItemHeader}>
                  <Avatar 
                    source={question.authorAvatar} 
                    name={question.authorName} 
                    size={32} 
                  />
                  <View style={styles.qaListItemInfo}>
<Text style={styles.qaListItemAuthor}>{question.authorName}</Text>
                    <Text style={styles.qaListItemTime}>{formatTimeAgo(question.createdAt)}</Text>
                  </View>
                  <TouchableOpacity style={styles.qaListItemMenu}>
                    <MoreHorizontal size={18} color={Colors.dark.subtext} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.qaListItemContent}>{question.content}</Text>
                <View style={styles.qaListItemFooter}>
                  <TouchableOpacity 
                    style={styles.qaListItemStat}
                    onPress={() => { if (token) likePost(token, question.id); }}
                    activeOpacity={0.7}
                  >
                    <Heart 
                      size={14} 
                      color={(question as any).likedByCurrentUser || (question.likes?.includes(user?.id || '') ?? false) ? Colors.dark.primary : Colors.dark.subtext}
                      fill={(question as any).likedByCurrentUser || (question.likes?.includes(user?.id || '') ?? false) ? Colors.dark.primary : 'none'}
                    />
                    <Text style={styles.qaListItemStatText}>{typeof (question as any).likesCount === 'number' ? (question as any).likesCount : question.likes.length}</Text>
                  </TouchableOpacity>
                  <View style={styles.qaListItemStat}>
                    <MessageSquare size={14} color={Colors.dark.subtext} />
                    <Text style={styles.qaListItemStatText}>{question.comments.length}</Text>
                  </View>
                  <View style={styles.qaListItemStat}>
                    <Share size={14} color={Colors.dark.subtext} />
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.qaListEmptyState}>
                <HelpCircle size={48} color={Colors.dark.subtext} />
                <Text style={styles.qaListEmptyStateText}>
                  No questions yet in this community.
                </Text>
                <Text style={styles.qaListEmptyStateSubtext}>
                  Ask the first question below!
                </Text>
              </View>
            }
            contentContainerStyle={styles.qaListContentContainer}
          />
          
          {/* Question Input Section - Fixed at bottom */}
          <View style={styles.qaInputContainer}>
            <TextInput
              style={styles.qaInputField}
              placeholder="Ask a question..."
              placeholderTextColor={Colors.dark.subtext}
              value={questionContent}
              onChangeText={setQuestionContent}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.qaSubmitButton, !questionContent.trim() && styles.qaSubmitButtonDisabled]}
              onPress={handleCreateQuestion}
              disabled={!questionContent.trim()}
            >
              <Send size={20} color={questionContent.trim() ? Colors.dark.primary : Colors.dark.subtext} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      
      {/* Floating Action Button */}
      {isUserMember && (
        <TouchableOpacity 
          style={styles.floatingActionButton}
          onPress={() => setCreatePostModalVisible(true)}
        >
          <Plus size={24} color={"white"} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  contentContainer: {
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 100, // space for FAB and bottom padding
  },
  tabContent: {
    flex: 1,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  communityHeader: {
    backgroundColor: Colors.dark.background,
  },
  communityBanner: {
    height: 120,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  communityInfo: {
    padding: 16,
  },
  communityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  communityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  communityLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultCommunityLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultCommunityLogoText: {
    color: Colors.dark.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  communityDetails: {
    flex: 1,
  },
  communityName: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCount: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.success,
    marginHorizontal: 8,
  },
  onlineCount: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  createPostButton: {
    flex: 1,
  },
  /* joinButton deprecated - merged into new button styles */
  navigationContainer: {
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingHorizontal: 16,
  },
  tabsScrollContainer: {
    flexGrow: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingBottom: 12,
    paddingHorizontal: 0,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.dark.primary,
  },
  tabText: {
    color: Colors.dark.subtext,
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.dark.text,
    fontWeight: '600',
  },
  sortContainer: {
    position: 'relative',
    alignItems: 'flex-end',
    paddingBottom: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.dark.card,
    borderRadius: 6,
    gap: 4,
  },
  sortText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  sortDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionText: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  sortOptionTextActive: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  tabContentScrollView: {
    flex: 1,
  },
  feedContainer: {
    flex: 1,
  },
  highlightsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  highlightsTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  highlightCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
  },
  highlightTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  highlightSubtitle: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginBottom: 8,
  },
  postsContainer: {
    flex: 1,
  },
  postCardWrapper: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  postCard: {
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    padding: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAuthorInfo: {
    flex: 1,
    marginLeft: 8,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postAuthorName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  postTypeBadge: {
    marginLeft: 4,
  },
  postTime: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  postMenuButton: {
    padding: 4,
  },
  postContent: {
    color: Colors.dark.text,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  voteButton: {
    padding: 4,
  },
  voteCount: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  actionText: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  aboutContainer: {
    padding: 16,
  },
  aboutSection: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
  },
  aboutTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  aboutDescription: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  aboutItemText: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  tag: {
    marginRight: 0,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    color: Colors.dark.subtext,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    minWidth: 200,
  },
  
  // Answer Posts List Styles
  answersListContainer: {
    flex: 1,
  },
  answerPostCard: {
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    padding: 16,
  },
  answerPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerPostAuthorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  answerPostAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  answerPostAuthorName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600',
  },
  answerPostBadge: {
    marginLeft: 4,
  },
  answerPostTime: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  answerPostMenuButton: {
    padding: 4,
  },
  
  // Question Context Styles
  questionContextSection: {
    backgroundColor: `${Colors.dark.card}40`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  questionContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  questionContextAuthor: {
    color: Colors.dark.subtext,
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  questionContextContent: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Answer Content Styles
  answerContentSection: {
    marginBottom: 12,
  },
  answerContentText: {
    color: Colors.dark.text,
    fontSize: 16,
    lineHeight: 22,
  },
  
  // Answer Post Actions Styles
  answerPostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  viewQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    marginLeft: 'auto',
  },
  viewQuestionText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.dark.background,
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScrollView: {
    padding: 16,
  },
  postTypeContainer: {
    marginBottom: 16,
  },
  postTypeLabel: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  postTypeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  postTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  postTypeOptionActive: {
    backgroundColor: `${Colors.dark.tint}20`,
    borderColor: Colors.dark.tint,
  },
  postTypeOptionText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    fontWeight: '500',
  },
  postTypeOptionTextActive: {
    color: Colors.dark.tint,
  },
  postTextArea: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.dark.text,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  createButton: {
    marginTop: 16,
    marginBottom: 40,
  },
  
  // Special action buttons styles
  specialActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  chatRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.primary}15`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flex: 1,
  },
  chatRoomText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  qaCircleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.secondary}15`,
    borderWidth: 1,
    borderColor: Colors.dark.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flex: 1,
  },
  qaButtonText: {
    color: Colors.dark.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Q&A Tab styles
  qaContainer: {
    flex: 1,
  },
  qaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  qaTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  askQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.primary}15`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  askQuestionText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  questionsContainer: {
    flex: 1,
  },
  questionCard: {
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 8,
    borderBottomColor: Colors.dark.border,
    paddingBottom: 0,
  },
  
  // Question Section Styles
  questionSection: {
    padding: 16,
    backgroundColor: Colors.dark.background,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionAuthorInfo: {
    flex: 1,
    marginLeft: 8,
  },
  questionAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionAuthorName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  questionBadge: {
    marginLeft: 4,
  },
  questionMenuButton: {
    padding: 4,
  },
  questionTime: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  questionContent: {
    color: Colors.dark.text,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  questionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  answerText: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  answersContainer: {
    marginTop: 8,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: Colors.dark.border,
  },
  answerCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  answerAuthor: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  answerTime: {
    color: Colors.dark.subtext,
    fontSize: 10,
  },
  answerContent: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 18,
  },
  showMoreAnswers: {
    paddingVertical: 8,
  },
  showMoreText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Q&A Modal styles
  askQuestionSection: {
    marginBottom: 24,
  },
  askQuestionLabel: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.dark.text,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  postQuestionButton: {
    marginBottom: 16,
  },
  recentQuestionsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 16,
  },
  recentQuestionsTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  recentQuestionCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recentQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentQuestionInfo: {
    marginLeft: 8,
    flex: 1,
  },
  recentQuestionAuthor: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
  },
  recentQuestionTime: {
    color: Colors.dark.subtext,
    fontSize: 10,
    marginTop: 2,
  },
  recentQuestionText: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  recentQuestionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  recentQuestionStat: {
    color: Colors.dark.subtext,
    fontSize: 12,
  },
  noQuestionsContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    marginTop: 8,
  },
  noQuestionsText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Answers Section Styles
  answersSection: {
    backgroundColor: `${Colors.dark.card}50`,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  answersTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  answerAuthorInfo: {
    flex: 1,
    marginLeft: 8,
  },
  answerAuthorName: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600',
  },
  answerMenuButton: {
    padding: 4,
  },
  answerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  answerVoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  answerVoteCount: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'center',
  },
  answerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 3,
  },
  answerActionText: {
    color: Colors.dark.subtext,
    fontSize: 12,
  },
  answerSeparator: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
  },
  addAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.dark.primary}10`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 8,
  },
  addAnswerText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  noAnswersContainer: {
    backgroundColor: `${Colors.dark.card}30`,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    alignItems: 'center',
  },
  noAnswersText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  firstAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.primary}15`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  firstAnswerText: {
    color: Colors.dark.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Q&A Full-Page Modal Styles
  qaModalContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  qaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  qaModalBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  qaModalTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  qaModalActionButton: {
    padding: 8,
    marginRight: -8,
  },
  qaListContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  qaListItem: {
    backgroundColor: Colors.dark.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  qaListItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  qaListItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  qaListItemAuthor: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600',
  },
  qaListItemTime: {
    color: Colors.dark.subtext,
    fontSize: 13,
    marginTop: 2,
  },
  qaListItemMenu: {
    padding: 4,
  },
  qaListItemContent: {
    color: Colors.dark.text,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
    marginLeft: 2,
  },
  qaListItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 2,
  },
  qaListItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qaListItemStatText: {
    color: Colors.dark.subtext,
    fontSize: 13,
    fontWeight: '500',
  },
  qaListEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  qaListEmptyStateText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  qaListEmptyStateSubtext: {
    color: Colors.dark.subtext,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  qaInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 12,
  },
  qaInputField: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 16,
    maxHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  qaSubmitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.dark.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaSubmitButtonDisabled: {
    backgroundColor: Colors.dark.card,
  },
  
  // Moderation Menu Styles
  moderationMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  moderationMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  moderationMenuText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },

  // Questions Tab Styles
  questionsListContainer: {
    flex: 1,
  },
  questionPostCard: {
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    padding: 16,
  },
  questionPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionPostAuthorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  questionPostAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  questionPostAuthorName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600',
  },
  questionPostBadge: {
    marginLeft: 4,
  },
  questionPostTime: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  questionPostMenuButton: {
    padding: 4,
  },
  questionPostContent: {
    marginBottom: 12,
  },
  questionPostText: {
    color: Colors.dark.text,
    fontSize: 16,
    lineHeight: 22,
  },
  questionPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  questionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questionStatText: {
    color: Colors.dark.subtext,
    fontSize: 13,
    fontWeight: '500',
  },
  answerQuestionButton: {
    marginLeft: 'auto',
    backgroundColor: `${Colors.dark.primary}15`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  answerQuestionText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '600',
  },

  // Floating Action Button
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Horizontal Button Styles
  ownerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    opacity: 0.7,
  },
  ownerButtonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  joinButtonTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    borderWidth: 1,
  },
  joinedButton: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
  },
  joinButton: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
    minWidth: 80,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  joinedButtonText: {
    color: Colors.dark.text,
  },
  joinButtonTextActive: {
    color: Colors.dark.background,
  },

  // Enhanced Create Post Modal Styles (matching main home page)
  userHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  visibilitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  visibilityText: {
    color: Colors.dark.text,
    fontSize: 12,
    marginLeft: 4,
  },
  postInput: {
    color: Colors.dark.text,
    fontSize: 18,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imagesList: {
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  singleImage: {
    width: '100%',
    height: 200,
  },
  multipleImages: {
    width: Dimensions.get('window').width * 0.7,
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentsContainer: {
    marginBottom: 24,
  },
  attachmentsTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  attachmentButtons: {
    paddingBottom: 8,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 100,
    marginRight: 8,
  },
  attachmentText: {
    color: Colors.dark.text,
    fontSize: 14,
    marginLeft: 6,
  },
  postButton: {
    marginBottom: 20,
  },
  
  // Poll creation styles
  pollOptionsContainer: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pollTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pollOptionInput: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.dark.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  removePollOptionButton: {
    padding: 8,
    marginLeft: 8,
  },
  pollActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addPollOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.primary}15`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  addPollOptionText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  disabledText: {
    color: Colors.dark.subtext,
  },
  removePollButton: {
    backgroundColor: `${Colors.dark.error}15`,
    borderWidth: 1,
    borderColor: Colors.dark.error,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removePollButtonText: {
    color: Colors.dark.error,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Event Styles
  eventsContainer: {
    flex: 1,
  },
  eventsHeader: {
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  eventsTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eventsFilterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 2,
    flex: 1,
  },
  eventsFilterButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  eventsFilterButtonActive: {
    backgroundColor: Colors.dark.primary,
  },
  eventsFilterText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    fontWeight: '500',
  },
  eventsFilterTextActive: {
    color: Colors.dark.background,
    fontWeight: '600',
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.primary}15`,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  createEventText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  eventsListContainer: {
    flex: 1,
    padding: 16,
  },
  eventCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  eventBanner: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  eventBannerPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetails: {
    padding: 16,
  },
  eventTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 6,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  eventAttendees: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  eventAttendeesText: {
    color: Colors.dark.subtext,
    fontSize: 14,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  joinEventButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
  },
  joinEventText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  joinEventTextDisabled: {
    color: Colors.dark.subtext,
  },
  leaveEventButton: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
  },
  leaveEventText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  shareEventButton: {
    padding: 8,
  },
});
