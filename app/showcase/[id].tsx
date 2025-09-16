import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Share, StatusBar, ImageBackground, TextInput, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ExternalLink, Share2, Heart, MessageCircle, Bookmark, ChevronLeft, ArrowUp, Badge, Tag, Globe, Github, Smartphone, Play, Send } from 'lucide-react-native';
import ThreadsImageGallery from '@/components/ui/ThreadsImageGallery';
import FullScreenImageViewer from '@/components/ui/FullScreenImageViewer';
import { LinearGradient } from 'expo-linear-gradient';
import { useShowcaseStore } from '@/store/showcase-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import Avatar from '@/components/ui/Avatar';
import { ShareBottomSheet } from '@/components/ui/ShareBottomSheet';
import { 
  getShowcaseComments, 
  addCommentToShowcase, 
  likeShowcaseComment, 
  replyToShowcaseComment,
  normalizeShowcaseComments,
  type ShowcaseComment
} from '@/api/showcase';

export default function ShowcaseDetails() {
  const { id, entryData } = useLocalSearchParams<{ id: string; entryData?: string }>();
  const router = useRouter();
  const { entries, upvoteEntry, upvoteShowcase, downvoteShowcase, bookmarkEntry, fetchEntryById, fetchEntries, isLoading: storeLoading } = useShowcaseStore();
  const { user } = useAuthStore();
  
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [entry, setEntry] = useState(() => {
    // First try to use passed entry data for instant display
    if (entryData) {
      try {
        return JSON.parse(entryData);
      } catch (e) {
        console.warn('Failed to parse entryData:', e);
      }
    }
    // Fallback to finding in store entries
    return entries.find(e => e.id === id);
  });
  const [loading, setLoading] = useState(!entryData && !entries.find(e => e.id === id)); // Only load if no data available
  const [newComment, setNewComment] = useState('');
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const scrollViewRef = useRef(null);

  // --- 2. ADD state for the share functionality ---
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [contentToShare, setContentToShare] = useState<{ id: string; type: 'post' | 'news' | 'user' | 'showcase' } | null>(null);


  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  
  // Reply functionality state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    loadEntry();
  }, [id]);

  // Load comments immediately when component mounts
  useEffect(() => {
    if (id) {
      loadComments();
    }
  }, [id]);

  // Sync local entry state with store state when entries change
  useEffect(() => {
    if (id && entries.length > 0) {
      const updatedEntry = entries.find(e => e.id === id);
      if (updatedEntry) {
        setEntry(updatedEntry);
      }
    }
  }, [entries, id]);
  
  const loadEntry = async () => {
    if (id && !entry) {
      // Only load if we don't already have entry data
      setLoading(true);
      
      try {
        // First ensure we have fresh data from API
        await fetchEntries(); // This will fetch all entries from API
        
        // Then get the specific entry
        const entryData = await fetchEntryById(id as string);
        if (entryData) {
          setEntry(entryData);
        } else {
          router.replace('/showcase');
        }
      } catch (error) {
        console.error('Error loading entry:', error);
      } finally {
        setLoading(false);
      }
    }
  };
  
  if (loading || storeLoading || !entry) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {loading || storeLoading ? '🚀 Loading showcase from API...' : 'Showcase not found'}
          </Text>
          {(loading || storeLoading) && (
            <Text style={styles.loadingSubtext}>Fetching latest data...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  const handleVisitProject = async () => {
    // console.log('🔍 Entry links object:', entry.links);
    // console.log('🔍 Website URL raw:', entry.links?.website);
    
    // Check multiple possible URL fields
    const possibleUrls = [
      entry.links?.website,
      entry.links?.projectLinks,
      entry.links?.websiteUrl,
      entry.websiteUrl,
      entry.projectLinks
    ].filter(Boolean);
    
    if (possibleUrls.length === 0) {
      // console.warn('⚠️ No website URL found');
      // Show a user-friendly message
      Alert.alert('No Website', 'This project does not have a website URL available.');
      return;
    }
    
    let url = possibleUrls[0].toString().trim();
    
    if (!url) {
      // console.warn('⚠️ Website URL is empty after trimming');
      Alert.alert('Invalid URL', 'The website URL appears to be empty.');
      return;
    }
    
    // Enhanced URL validation and normalization
    const validateAndNormalizeUrl = (inputUrl: string): string | null => {
      try {
        // Remove any whitespace or invalid characters
        let cleanUrl = inputUrl.trim();
        
        // Handle common URL issues
        if (cleanUrl.includes(' ')) {
          cleanUrl = cleanUrl.replace(/\s+/g, '');
        }
        
        // Add protocol if missing
        if (!cleanUrl.match(/^https?:\/\//i)) {
          // Check if it looks like a domain
          if (cleanUrl.includes('.') && !cleanUrl.includes('/') || cleanUrl.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/)) {
            cleanUrl = 'https://' + cleanUrl;
          } else if (!cleanUrl.startsWith('http')) {
            cleanUrl = 'https://' + cleanUrl;
          }
        }
        
        // Validate the URL
        const urlObj = new URL(cleanUrl);
        
        // Additional validation - ensure it's http or https
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return null;
        }
        
        return cleanUrl;
      } catch (error) {
        // console.error('URL validation error:', error);
        return null;
      }
    };
    
    const normalizedUrl = validateAndNormalizeUrl(url);
    
    if (!normalizedUrl) {
      // console.error('❌ Invalid URL format:', url);
      Alert.alert('Invalid URL', 'The website URL format is invalid. Please contact the project owner.');
      return;
    }
    
    // console.log('🌐 Opening website URL:', normalizedUrl);
    // console.log('🔗 Original URL from entry:', url);
    
    try {
      // First try to validate if the URL can be opened
      const supported = await Linking.canOpenURL(normalizedUrl);
      
      if (!supported) {
        // console.error('❌ URL not supported by device:', normalizedUrl);
        Alert.alert('Cannot Open', 'Your device cannot open this type of URL.');
        return;
      }
      
      // console.log('✅ URL is supported, opening...');
      await Linking.openURL(normalizedUrl);
      // console.log('✅ URL opened successfully');
      
    } catch (error) {
      // console.error('❌ Error opening URL:', error);
      
      // Try fallback strategies
      const fallbackStrategies = [
        // Strategy 1: Force HTTPS
        normalizedUrl.replace('http://', 'https://'),
        // Strategy 2: Remove www if present, or add it if not
        normalizedUrl.includes('www.') 
          ? normalizedUrl.replace('www.', '') 
          : normalizedUrl.replace('https://', 'https://www.'),
        // Strategy 3: Try original URL with just https prefix
        `https://${url.replace(/^https?:\/\//, '')}`
      ];
      
      let opened = false;
      for (const fallbackUrl of fallbackStrategies) {
        try {
          // console.log(`🔄 Trying fallback URL: ${fallbackUrl}`);
          const canOpen = await Linking.canOpenURL(fallbackUrl);
          if (canOpen) {
            await Linking.openURL(fallbackUrl);
            // console.log(`✅ Fallback successful: ${fallbackUrl}`);
            opened = true;
            break;
          }
        } catch (fallbackError) {
          // console.log(`❌ Fallback failed for ${fallbackUrl}:`, fallbackError);
          continue;
        }
      }
      
      if (!opened) {
        // console.error('❌ All URL opening strategies failed');
        Alert.alert(
          'Cannot Open Website', 
          'Unable to open the project website. The URL might be invalid or temporarily unavailable.',
          [{ text: 'OK' }]
        );
      }
    }
  };
  
  // --- 3. UPDATE the share handler to use the bottom sheet ---
  const handleShareProject = useCallback(() => {
    if (entry) {
      setContentToShare({ id: entry.id, type: 'showcase' });
      setIsShareVisible(true);
    }
  }, [entry]);

  // --- 4. ADD a handler to close the bottom sheet ---
  const handleCloseShareSheet = () => {
    setIsShareVisible(false);
    setContentToShare(null);
  };
  
  const handleLike = async () => {
    if (user && entry?.id) {
      // console.log('🎯 User clicked upvote for entry:', entry.id);
      try {
        // Check if currently upvoted to determine action
        const isCurrentlyUpvoted = entry.upvoters && entry.upvoters.includes(user?.id || user?._id);
        
        if (isCurrentlyUpvoted) {
          // If already upvoted, downvote (remove upvote)
          await downvoteShowcase(entry.id);
        } else {
          // If not upvoted, upvote
          await upvoteShowcase(entry.id);
        }
        // The store will handle optimistic updates, so no need to reload
        // console.log('✅ Upvote/Downvote completed');
      } catch (error) {
        // console.error('❌ Upvote/Downvote failed:', error);
      }
    } else {
      // console.warn('⚠️ Cannot upvote: missing user or entry ID');
    }
  };
  
  const handleBookmark = async () => {
    if (user && entry?.id) {
      // console.log('📌 User clicked bookmark for entry:', entry.id);
      try {
        await bookmarkEntry(entry.id);
        // console.log('✅ Bookmark completed');
      } catch (error) {
        // console.error('❌ Bookmark failed:', error);
      }
    } else {
      // console.warn('⚠️ Cannot bookmark: missing user or entry ID');
    }
  };
  
  const isLiked = entry.upvoters && user ? entry.upvoters.includes(user?.id) : false;
  const isBookmarked = entry.isBookmarked || false;
  
  const upvotersToShow = entry.upvoters && entry.upvoters.length > 0 ? 3 : 0;

  // Handle scroll to comments
  const handleScrollToComments = () => {
    if (scrollViewRef.current) {
      // Scroll to the end to reach comments section
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  // Helper function to convert YouTube URL to embed URL
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  // Load comments from API
  const loadComments = async () => {
    if (!id) return;
    
    const { token } = require('@/store/auth-store').useAuthStore.getState();
    setLoadingComments(true);
    
    try {
      const response = await getShowcaseComments(id as string, token);
      if (response.success && response.body) {
        const rawComments = Array.isArray(response.body) ? response.body : [response.body];
        const normalizedComments = normalizeShowcaseComments(rawComments);
        
        console.log('📝 [COMMENTS] Raw comments count:', rawComments.length);
        console.log('📝 [COMMENTS] Normalized comments:', normalizedComments.map(c => ({ 
          id: c.id, 
          createdAt: c.createdAt, 
          content: c.content?.substring(0, 50) 
        })));
        
        // Sort comments by creation date, newest first (more robust sorting)
        const sortedComments = [...normalizedComments].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          
          // If dates are the same, sort by ID (assuming newer IDs are larger)
          if (dateA === dateB) {
            return (b.id || '').localeCompare(a.id || '');
          }
          
          return dateB - dateA; // Newest first
        });
        
        console.log('📝 [COMMENTS] Sorted comments (newest first):', sortedComments.map(c => ({ 
          id: c.id, 
          createdAt: c.createdAt, 
          content: c.content?.substring(0, 50) 
        })));
        
        setComments(sortedComments);
        
        // Auto-expand comments that have replies
        const commentsWithReplies = sortedComments
          .filter(comment => comment.replies && comment.replies.length > 0)
          .map(comment => comment.id);
        
        if (commentsWithReplies.length > 0) {
          setExpandedReplies(new Set(commentsWithReplies));
        }
      }
    } catch (error) {
      console.error('Error loading showcase comments:', error);
      // Don't show error to user, just leave comments empty
    } finally {
      setLoadingComments(false);
      setCommentsLoaded(true);
    }
  };

  // Add a new comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !id || !user) return;
    
    const { token } = require('@/store/auth-store').useAuthStore.getState();
    
    // Optimistically add comment to the top of the list immediately
    const userDisplayName = user.name || user.username || user.displayName || 'You';
    const userAvatar = user.avatar || user.profileImage || user.profilePicture || '';
    const userId = user.id || user._id || '';
    
    console.log('📝 [COMMENT] Creating optimistic comment with user data:', {
      userDisplayName,
      userAvatar: userAvatar ? 'Yes' : 'No',
      userId,
      originalUser: { name: user.name, username: user.username, avatar: user.avatar }
    });
    
    const optimisticComment = {
      id: `temp_${Date.now()}`,
      _id: `temp_${Date.now()}`,
      content: newComment.trim(),
      text: newComment.trim(),
      author: {
        _id: userId,
        id: userId,
        name: userDisplayName,
        username: user.username || user.name || userDisplayName,
        avatar: userAvatar,
        profileImage: userAvatar,
      },
      user: {
        _id: userId,
        id: userId,
        name: userDisplayName,
        username: user.username || user.name || userDisplayName,
        avatar: userAvatar,
        profileImage: userAvatar,
      },
      createdAt: new Date().toISOString(),
      isLiked: false,
      likesCount: 0,
      likes: 0,
      replies: []
    };
    
    // Add optimistic comment to the top
    setComments(prevComments => [optimisticComment, ...prevComments]);
    setNewComment('');
    
    try {
      const response = await addCommentToShowcase(token, id as string, newComment.trim());
      if (response.success) {
        // Replace the optimistic comment with the real data from server
        if (response.body || response.data) {
          const serverComment = response.body || response.data;
          const normalizedComment = Array.isArray(serverComment) ? serverComment[0] : serverComment;
          
          console.log('📝 [COMMENT] Server response received:', {
            hasAuthor: !!normalizedComment.author,
            hasUser: !!normalizedComment.user,
            authorName: normalizedComment.author?.name,
            userName: normalizedComment.user?.name,
            normalizedComment: normalizedComment
          });
          
          setComments(prevComments => 
            prevComments.map(c => 
              c.id === optimisticComment.id ? {
                ...normalizedComment,
                id: normalizedComment.id || normalizedComment._id,
                _id: normalizedComment._id || normalizedComment.id,
                content: normalizedComment.content || normalizedComment.text,
                text: normalizedComment.text || normalizedComment.content,
                author: normalizedComment.author || normalizedComment.user || optimisticComment.author,
                user: normalizedComment.user || normalizedComment.author || optimisticComment.user,
                createdAt: normalizedComment.createdAt || new Date().toISOString(),
                isLiked: normalizedComment.isLiked || false,
                likesCount: normalizedComment.likesCount || normalizedComment.likes || 0,
                likes: normalizedComment.likes || normalizedComment.likesCount || 0,
                replies: normalizedComment.replies || []
              } : c
            )
          );
        }
        // Comment successfully added, keep the optimistic comment in place
      } else {
        // Remove optimistic comment and show error
        setComments(prevComments => prevComments.filter(c => c.id !== optimisticComment.id));
        Alert.alert('Error', 'Failed to add comment. Please try again.');
        setNewComment(newComment.trim()); // Restore the comment text
      }
    } catch (error) {
      console.error('Error adding showcase comment:', error);
      // Remove optimistic comment and show error
      setComments(prevComments => prevComments.filter(c => c.id !== optimisticComment.id));
      Alert.alert('Error', 'Failed to add comment. Please try again.');
      setNewComment(newComment.trim()); // Restore the comment text
    }
  };

  // Handle comment like
  const handleLikeComment = async (commentId: string) => {
    if (!user || !id) return;
    
    const { token } = require('@/store/auth-store').useAuthStore.getState();
    
    // Optimistic update
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? { 
            ...c, 
            isLiked: !c.isLiked, 
            likesCount: c.isLiked ? (c.likesCount || 1) - 1 : (c.likesCount || 0) + 1 
          }
        : c
    ));
    
    try {
      const response = await likeShowcaseComment(token, commentId, id as string);
      if (!response.success) {
        // Revert optimistic update on failure
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { 
                ...c, 
                isLiked: !c.isLiked, 
                likesCount: c.isLiked ? (c.likesCount || 1) - 1 : (c.likesCount || 0) + 1 
              }
            : c
        ));
      }
    } catch (error) {
      console.error('Error liking showcase comment:', error);
      // Revert optimistic update on error
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { 
              ...c, 
              isLiked: !c.isLiked, 
              likesCount: c.isLiked ? (c.likesCount || 1) - 1 : (c.likesCount || 0) + 1 
            }
          : c
      ));
    }
  };

  // Handle reply to comment
  const handleReplyToComment = async (commentId: string) => {
    if (!replyText.trim() || !id || !user) return;
    
    const { token } = require('@/store/auth-store').useAuthStore.getState();
    
    try {
      const response = await replyToShowcaseComment(token, commentId, id as string, replyText.trim());
      if (response.success) {
        // Refresh comments to show the new reply
        await loadComments();
        // Reset reply state
        setReplyText('');
        setReplyingTo(null);
      } else {
        Alert.alert('Error', 'Failed to post reply. Please try again.');
      }
    } catch (error) {
      console.error('Error replying to showcase comment:', error);
      Alert.alert('Error', 'Failed to post reply. Please try again.');
    }
  };

  // Toggle reply input for a comment
  const handleToggleReply = (commentId: string) => {
    if (replyingTo === commentId) {
      // Close reply input if already replying to this comment
      setReplyingTo(null);
      setReplyText('');
    } else {
      // Open reply input for this comment
      setReplyingTo(commentId);
      setReplyText('');
    }
  };

  // Toggle expand/collapse replies for a comment
  const handleToggleExpandReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Handle liking a reply (nested comment)
  const handleLikeReply = async (commentId: string, replyId: string) => {
    if (!user || !id) return;
    
    const { token } = require('@/store/auth-store').useAuthStore.getState();
    
    // Optimistic update for nested replies
    setComments(prev => prev.map(c => 
      c.id === commentId 
        ? {
            ...c,
            replies: c.replies?.map(reply => 
              reply.id === replyId
                ? {
                    ...reply,
                    isLiked: !reply.isLiked,
                    likesCount: reply.isLiked ? (reply.likesCount || 1) - 1 : (reply.likesCount || 0) + 1
                  }
                : reply
            )
          }
        : c
    ));
    
    try {
      const response = await likeShowcaseComment(token, replyId, id as string);
      if (!response.success) {
        // Revert optimistic update on failure
        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? {
                ...c,
                replies: c.replies?.map(reply => 
                  reply.id === replyId
                    ? {
                        ...reply,
                        isLiked: !reply.isLiked,
                        likesCount: reply.isLiked ? (reply.likesCount || 1) - 1 : (reply.likesCount || 0) + 1
                      }
                    : reply
                )
              }
            : c
        ));
      }
    } catch (error) {
      console.error('Error liking showcase reply:', error);
      // Revert optimistic update on error
      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? {
              ...c,
              replies: c.replies?.map(reply => 
                reply.id === replyId
                  ? {
                      ...reply,
                      isLiked: !reply.isLiked,
                      likesCount: reply.isLiked ? (reply.likesCount || 1) - 1 : (reply.likesCount || 0) + 1
                    }
                  : reply
              )
            }
          : c
      ));
    }
  };

  // Format comment timestamp
  const formatCommentTime = (timestamp: string) => {
    try {
      const now = new Date();
      const commentDate = new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(commentDate.getTime())) {
        return 'now';
      }
      
      const diffInMs = now.getTime() - commentDate.getTime();
      const diffInSeconds = Math.floor(diffInMs / 1000);
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);
      
      // Handle future dates (in case of server time sync issues)
      if (diffInSeconds < 0) return 'now';
      
      if (diffInSeconds < 30) return 'now';
      if (diffInMinutes < 1) return `${diffInSeconds}s ago`;
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return commentDate.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting comment time:', error);
      return 'now';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Banner Section */}
        <View style={styles.headerBanner}>
          <ImageBackground 
            source={{ uri: entry.bannerImages?.[0] || entry.images?.[0] || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f' }} 
            style={styles.bannerBackground}
            imageStyle={styles.bannerImageStyle}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
              style={styles.bannerOverlay}
            >
              {/* Header Controls */}
              <View style={styles.headerControls}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={handleShareProject} style={styles.headerActionButton}>
                    <Share2 size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleBookmark} style={styles.headerActionButton}>
                    <Bookmark size={20} color={isBookmarked ? Colors.dark.primary : "#fff"} fill={isBookmarked ? Colors.dark.primary : 'none'} />
                  </TouchableOpacity>
                </View>
              </View>
              
            </LinearGradient>
          </ImageBackground>
        </View>
        
        <View style={styles.content}>
          {/* Profile Card Section */}
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.logoContainer}>
                {entry.logo ? (
                  <Image 
                    source={{ uri: entry.logo }} 
                    style={styles.logoImage}
                  />
                ) : (
                  <View style={[styles.logoImage, styles.logoPlaceholder]}>
                    <Text style={styles.logoText}>{entry.title?.charAt(0)}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.profileTitle}>{entry.title}</Text>
                <Text style={styles.profileTagline}>{entry.tagline || entry.subtitle}</Text>
                
                <View style={styles.profileStats}>
                  <View style={styles.statItem}>
                    <ArrowUp size={14} color={Colors.dark.primary} />
                    <Text style={styles.statText}>{entry.upvotes !== undefined ? entry.upvotes : (entry.upvoters?.length || 0)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <MessageCircle size={14} color={Colors.dark.subtext} />
                    <Text style={styles.statText}>{entry.comments || 0}</Text>
                  </View>
                </View>
                
                {/* Category and Website Link Row */}
                {(entry.category || entry.links?.website) && (
                  <View style={styles.categoryAndLinkRow}>
                    {entry.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{entry.category.toUpperCase()}</Text>
                      </View>
                    )}
                    
                    {entry.links?.website && (
                      <TouchableOpacity onPress={handleVisitProject} style={styles.websiteLink}>
                        <Globe size={16} color="#4A90E2" />
                        <Text style={styles.linkText}>Website</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {/* Other Project Links */}
                {(entry.links?.github || entry.links?.playstore || entry.links?.appstore) && (
                  <View style={styles.projectLinks}>
                    {entry.links?.github && (
                      <TouchableOpacity onPress={() => Linking.openURL(entry.links?.github || '')} style={styles.linkItem}>
                        <Github size={16} color="#4A90E2" />
                        <Text style={styles.linkText}>GitHub</Text>
                      </TouchableOpacity>
                    )}
                    {entry.links?.playstore && (
                      <TouchableOpacity onPress={() => Linking.openURL(entry.links?.playstore || '')} style={styles.linkItem}>
                        <Smartphone size={16} color="#4A90E2" />
                        <Text style={styles.linkText}>Play Store</Text>
                      </TouchableOpacity>
                    )}
                    {entry.links?.appstore && (
                      <TouchableOpacity onPress={() => Linking.openURL(entry.links?.appstore || '')} style={styles.linkItem}>
                        <Smartphone size={16} color="#4A90E2" />
                        <Text style={styles.linkText}>App Store</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {/* Action Buttons Row */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.primaryActionButton, isLiked && styles.primaryActionButtonActive]}
              onPress={handleLike}
            >
              <ArrowUp size={18} color={isLiked ? "#fff" : Colors.dark.primary} />
              <Text style={[styles.primaryActionText, isLiked && styles.primaryActionTextActive]}>Upvote</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryActionButton}
              onPress={handleScrollToComments}
            >
              <MessageCircle size={18} color={Colors.dark.subtext} />
              <Text style={styles.secondaryActionText}>Discuss</Text>
            </TouchableOpacity>
          </View>
          
          {/* DESCRIPTION Section */}
          {entry.description && entry.description.trim() && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.sectionText} numberOfLines={isDescriptionExpanded ? undefined : 3}>
                {entry.description}
              </Text>
              {entry.description.length > 120 && (
                <TouchableOpacity 
                  style={styles.showMoreButton}
                  onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  <Text style={styles.showMoreText}>
                    {isDescriptionExpanded ? 'Show less' : '...show more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {/* PROBLEM Section */}
          {entry.problem && entry.problem.trim() && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>❓ Problem</Text>
              <Text style={styles.sectionText}>{entry.problem}</Text>
            </View>
          )}
          
          {/* SOLUTION Section */}
          {entry.solution && entry.solution.trim() && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>💡 Solution</Text>
              <Text style={styles.sectionText}>{entry.solution}</Text>
            </View>
          )}
          
          {/* REVENUE MODEL Section */}
          {entry.revenueModel && entry.revenueModel.trim() && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>💰 Revenue Model</Text>
              <Text style={styles.sectionText}>{entry.revenueModel}</Text>
            </View>
          )}
          
          {/* SHOWCASE IMAGES Section */}
          {entry.images && entry.images.length > 0 && (
            <View style={styles.showcaseImagesSection}>
              <Text style={styles.sectionTitle}>🖼️ Showcase Images</Text>
              <ThreadsImageGallery
                images={entry.images}
                onImagePress={(imageUri, index) => {
                  setSelectedImageIndex(index);
                  setFullScreenVisible(true);
                }}
                containerPadding={0}
                maxImageHeight={220}
                imageSpacing={12}
              />
            </View>
          )}

          {/* DEMO VIDEO Section */}
          {entry.links?.demoVideo && entry.links.demoVideo.trim().length > 0 && (
            <View style={styles.videoSection}>
              <Text style={styles.sectionTitle}>🎥 Demo Video</Text>
              <View style={styles.videoContainer}>
                <WebView
                  source={{ uri: getEmbedUrl(entry.links.demoVideo) }}
                  style={styles.video}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  allowsFullscreenVideo={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                />
              </View>
            </View>
          )}
          
          {/* TAGS Section */}
          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>🏷️ Tags</Text>
              <View style={styles.tagsContainer}>
                {entry.tags.map((tag, index) => (
                  <View key={index} style={styles.tagChip}>
                    <Tag size={12} color={Colors.dark.primary} />
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
            
            {/* Add Comment */}
            <View style={styles.addCommentContainer}>
              <Avatar 
                size={40} 
                name={user?.name || "User"} 
                source={user?.avatar} 
              />
              <View style={styles.addCommentInputContainer}>
                <TextInput
                  style={styles.addCommentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#666"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity 
                  style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
                  onPress={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Send size={18} color={newComment.trim() ? Colors.dark.primary : '#666'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Comments List */}
            {comments.length === 0 && !loadingComments ? (
              <View style={styles.commentCard}>
                <Text style={styles.commentText}>No comments yet. Be the first to comment!</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id}>
                  {/* Main Comment Container - Exactly like Post Comments */}
                  <View style={styles.commentContainer}>
                  <Avatar 
                    size={36} 
                    name={comment.author?.name || comment.author?.username || comment.user?.name || comment.user?.username || 'User'} 
                    source={comment.author?.avatar} 
                  />
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comment.author?.name || comment.author?.username || comment.user?.name || comment.user?.username || 'Anonymous User'}</Text>
                      <Text style={styles.commentTime}>{formatCommentTime(comment.createdAt)}</Text>
                    </View>
                    
                    <Text style={styles.commentText}>{comment.content}</Text>
                    
                    <View style={styles.commentActions}>
                      <TouchableOpacity 
                        style={styles.commentAction}
                        onPress={() => handleLikeComment(comment.id)}
                      >
                        <Heart 
                          size={16} 
                          color={comment.isLiked ? Colors.dark.error : Colors.dark.subtext} 
                          fill={comment.isLiked ? Colors.dark.error : 'transparent'} 
                        />
                        <Text style={[styles.commentActionText, comment.isLiked && styles.commentActionTextActive]}>
                          {comment.likesCount > 0 ? comment.likesCount : ''} Like
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.commentAction}
                        onPress={() => handleToggleReply(comment.id)}
                      >
                        <MessageCircle size={16} color={Colors.dark.subtext} />
                        <Text style={styles.commentActionText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Show Replies Button - Exactly like Post Comments */}
                    {comment.replies && comment.replies.length > 0 && (
                      <TouchableOpacity
                        style={styles.showRepliesButton}
                        onPress={() => handleToggleExpandReplies(comment.id)}
                      >
                        <Text style={styles.showRepliesText}>
                          {expandedReplies.has(comment.id) ? 'Hide Replies' : `Show Replies (${comment.replies.length})`}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Replies Container - Exactly like Post Comments */}
                    {expandedReplies.has(comment.id) && comment.replies && comment.replies.length > 0 && (
                      <View style={styles.repliesContainer}>
                        {comment.replies.map((reply, index) => (
                          <View key={reply.id} style={[styles.commentContainer, styles.replyContainer]}>
                            <Avatar 
                              size={36} 
                              name={reply.author?.name || reply.author?.username || reply.user?.name || reply.user?.username || 'User'} 
                              source={reply.author?.avatar} 
                            />
                            <View style={styles.commentContent}>
                              <View style={styles.commentHeader}>
                                <Text style={styles.commentAuthor}>{reply.author?.name || reply.author?.username || reply.user?.name || reply.user?.username || 'Anonymous User'}</Text>
                                <Text style={styles.commentTime}>{formatCommentTime(reply.createdAt)}</Text>
                              </View>
                              
                              <Text style={styles.commentText}>{reply.content}</Text>
                              
                              <View style={styles.commentActions}>
                                <TouchableOpacity 
                                  style={styles.commentAction}
                                  onPress={() => handleLikeReply(comment.id, reply.id)}
                                >
                                  <Heart 
                                    size={16} 
                                    color={reply.isLiked ? Colors.dark.error : Colors.dark.subtext} 
                                    fill={reply.isLiked ? Colors.dark.error : 'transparent'} 
                                  />
                                  <Text style={[styles.commentActionText, reply.isLiked && styles.commentActionTextActive]}>
                                    {reply.likesCount > 0 ? reply.likesCount : ''} Like
                                  </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                  style={styles.commentAction}
                                  onPress={() => handleToggleReply(reply.id)}
                                >
                                  <MessageCircle size={16} color={Colors.dark.subtext} />
                                  <Text style={styles.commentActionText}>Reply</Text>
                                </TouchableOpacity>
                              </View>
                              
                              {/* Nested Reply Input for Reply-to-Reply */}
                              {replyingTo === reply.id && (
                                <View style={styles.nestedReplyInputContainer}>
                                  <TextInput
                                    style={styles.nestedReplyInput}
                                    placeholder={`Reply to ${reply.author?.name || reply.author?.username || reply.user?.name || reply.user?.username || 'this reply'}...`}
                                    placeholderTextColor={Colors.dark.subtext}
                                    value={replyText}
                                    onChangeText={setReplyText}
                                    multiline
                                    maxLength={500}
                                    autoFocus
                                  />
                                  <View style={styles.nestedReplyActions}>
                                    <TouchableOpacity 
                                      style={styles.nestedReplyActionButton}
                                      onPress={() => handleToggleReply(reply.id)}
                                    >
                                      <Text style={styles.nestedReplyActionText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                      style={[styles.nestedReplySubmitButton, !replyText.trim() && styles.nestedReplySubmitButtonDisabled]}
                                      onPress={() => handleReplyToComment(reply.id)}
                                      disabled={!replyText.trim()}
                                    >
                                      <Text style={[styles.nestedReplySubmitText, !replyText.trim() && styles.nestedReplySubmitTextDisabled]}>Reply</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                  
                  {/* Reply Input for main comment */}
                  {replyingTo === comment.id && (
                    <View style={styles.replyInputSection}>
                      <Avatar 
                        size={32} 
                        name={user?.name || "User"} 
                        source={user?.avatar} 
                      />
                      <View style={styles.replyInputContainer}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder={`Reply to ${comment.author?.name || comment.author?.username || comment.user?.name || comment.user?.username || 'this comment'}...`}
                          placeholderTextColor="#666"
                          value={replyText}
                          onChangeText={setReplyText}
                          multiline
                          maxLength={500}
                          autoFocus
                        />
                        <View style={styles.replyInputActions}>
                          <TouchableOpacity 
                            style={styles.replyInputActionButton}
                            onPress={() => handleToggleReply(comment.id)}
                          >
                            <Text style={styles.replyInputActionText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.replyInputActionButton, styles.replyInputSubmitButton, !replyText.trim() && styles.replyInputSubmitButtonDisabled]}
                            onPress={() => handleReplyToComment(comment.id)}
                            disabled={!replyText.trim()}
                          >
                            <Text style={[styles.replyInputActionText, styles.replyInputSubmitText, !replyText.trim() && styles.replyInputSubmitTextDisabled]}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
      
      {/* Full-Screen Image Viewer for Showcase Images */}
      {entry.images && entry.images.length > 0 && (
        <FullScreenImageViewer
          visible={fullScreenVisible}
          images={entry.images}
          initialIndex={selectedImageIndex}
          postId={entry.id}
          likes={entry.upvotes !== undefined ? entry.upvotes : (entry.upvoters?.length || 0)}
          comments={entry.comments || 0}
          isLiked={isLiked}
          onClose={() => setFullScreenVisible(false)}
          onLike={handleLike}
          onComment={handleScrollToComments}
          onShare={handleShareProject}
          onRepost={() => {}}
        />
      )}

      {/* --- 5. ADD the ShareBottomSheet component to the UI --- */}
      <ShareBottomSheet
        visible={isShareVisible}
        onClose={handleCloseShareSheet}
        contentId={contentToShare?.id || null}
        contentType={contentToShare?.type || null}
      />
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Header Banner Section
  headerBanner: {
    height: 250,
    width: '100%',
  },
  bannerBackground: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bannerImageStyle: {
    resizeMode: 'cover',
  },
  bannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  
  // Content
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  
  // Profile Card Section
  profileCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginTop: -30,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logoContainer: {
    marginRight: 16,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.primary,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  profileTagline: {
    fontSize: 15,
    color: '#aaa',
    marginBottom: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  profileStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  categoryAndLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: Colors.dark.primary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  projectLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  linkText: {
    color: '#4A90E2',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  
  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryActionButtonActive: {
    backgroundColor: Colors.dark.primary,
  },
  primaryActionText: {
    color: Colors.dark.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  primaryActionTextActive: {
    color: '#fff',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryActionText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Information Sections
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
  },
  showMoreButton: {
    marginTop: 8,
  },
  showMoreText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Showcase Images Section
  showcaseImagesSection: {
    marginBottom: 24,
  },
  imagesScrollView: {
    marginTop: 8,
  },
  showcaseImage: {
    width: 280,
    height: 180,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#1a1a1a',
  },
  
  // Video Section
  videoSection: {
    marginBottom: 24,
  },
  videoContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  video: {
    flex: 1,
  },
  
  // Tags Section
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  tagText: {
    color: Colors.dark.primary,
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  // Comments Section - Exactly like Post Comments
  commentsSection: {
    marginBottom: 24,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: Colors.dark.card,
    padding: 16,
    borderRadius: 12,
  },
  addCommentInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addCommentInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  
  // Comment Card for loading and empty states
  commentCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
  },
  
  // Comment Container - Modern style
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#0f0f0f',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  
  commentAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  
  commentTime: {
    fontSize: 13,
    color: Colors.dark.subtext,
  },
  
  commentText: {
    fontSize: 15,
    color: Colors.dark.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  commentActionText: {
    fontSize: 13,
    color: Colors.dark.subtext,
    fontWeight: '500',
  },
  
  commentActionTextActive: {
    color: Colors.dark.error,
  },
  
  // Show Replies Button - Exactly like Post Comments
  showRepliesButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  
  showRepliesText: {
    fontSize: 13,
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  
  // Replies Container - Exactly like Post Comments
  repliesContainer: {
    marginTop: 8,
    paddingLeft: 48,
  },
  
  // Reply Container - Exactly like Post Comments
  replyContainer: {
    marginLeft: 0,
    marginTop: 0,
    paddingTop: 8,
    paddingBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.border,
    paddingLeft: 12,
  },
  replyInputContainer: {
    flex: 1,
    marginLeft: 12,
  },
  replyInput: {
    color: '#fff',
    fontSize: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 60,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  replyActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  replySubmitButton: {
    backgroundColor: Colors.dark.primary,
  },
  replySubmitButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  replyActionText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  replySubmitText: {
    color: '#fff',
  },
  replySubmitTextDisabled: {
    color: '#666',
  },
  
  // Replies Count Text
  repliesCountText: {
    color: Colors.dark.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Replies Container (for nested replies)
  repliesContainer: {
    marginLeft: 20,
    marginTop: 8,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#333',
  },
  
  // Individual Reply Card
  replyCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  
  // Reply Header (same as comment header but smaller)
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  replyInfo: {
    marginLeft: 10,
    flex: 1,
  },
  
  replyAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 1,
  },
  
  replyTime: {
    fontSize: 11,
    color: '#888',
  },
  
  replyText: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
    marginBottom: 8,
  },
  
  // Reply Actions (smaller than comment actions)
  replyActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    paddingTop: 8,
  },
  
  replyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  
  replyActionText: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  
  replyActionTextLiked: {
    color: Colors.dark.error,
  },
  
  // Nested Reply Container (for replies to replies)
  nestedReplyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginLeft: 8,
    backgroundColor: '#0a0a0a',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: Colors.dark.primary,
  },
  
  nestedReplyInputContainer: {
    flex: 1,
    marginLeft: 8,
  },
  
  nestedReplyInput: {
    color: '#fff',
    fontSize: 13,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxHeight: 50,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  
  nestedReplyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  
  nestedReplyActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#2a2a2a',
  },
  
  nestedReplySubmitButton: {
    backgroundColor: Colors.dark.primary,
  },
  
  nestedReplySubmitButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  
  nestedReplyActionText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  
  nestedReplySubmitText: {
    color: '#fff',
  },
  
  nestedReplySubmitTextDisabled: {
    color: '#666',
  },
  
  // Post-style reply layout
  replyItem: {
    flexDirection: 'row',
    marginBottom: 12,
    marginLeft: 16,
  },
  
  replyContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
  },
  
  // Reply Input Section (for main comment replies)
  replyInputSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 20,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#0f0f0f',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  
  replyInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  
  replyInputActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  
  replyInputSubmitButton: {
    backgroundColor: Colors.dark.primary,
  },
  
  replyInputSubmitButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  
  replyInputActionText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  
  replyInputSubmitText: {
    color: '#fff',
  },
  
  replyInputSubmitTextDisabled: {
    color: '#666',
  },
});
