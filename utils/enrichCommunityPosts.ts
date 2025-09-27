// utils/enrichCommunityPosts.ts

import { useCommunityStore } from '../store/community-store';
import { Post } from '../types';

/**
 * Enriches community posts with complete community information from the community store
 */
export const enrichCommunityPost = (post: Post): Post => {
  // If not a community-related post, return as-is
  if (post.type !== 'community' && post.type !== 'question') {
    return post;
  }
  
  // Check if this post should be a question post based on subtype
  let shouldBeQuestion = (post as any).subtype === 'question';
  
  // If post doesn't have subtype, try to find it in community data
  if (!shouldBeQuestion && post.community?.id) {
    const communities = useCommunityStore.getState().communities;
    const community = communities.find(c => c.id === post.community!.id);
    
    if (community?.posts) {
      const communityPost = community.posts.find((cp: any) => cp.id === post.id);
      if (communityPost) {
        const communitySubtype = (communityPost as any).subtype;
        shouldBeQuestion = communitySubtype === 'question';
        
        // Update post with subtype for future reference
        if (communitySubtype) {
          (post as any).subtype = communitySubtype;
        }
      }
    }
  }
  
  let updatedPost = post;
  
  if (shouldBeQuestion && post.type !== 'question') {
    updatedPost = {
      ...post,
      type: 'question' as const
    };
  }
  
  // If post already has a valid community name, check if we can improve it with store data
  if (updatedPost.community?.name && 
      updatedPost.community.name !== 'null' && 
      updatedPost.community.name.trim() !== '' && 
      updatedPost.community.id && 
      updatedPost.community.id !== 'unknown') {
    
    // Try to get more complete data from store
    const communities = useCommunityStore.getState().communities;
    const fullCommunityData = communities.find(c => c.id === updatedPost.community!.id);
    
    if (fullCommunityData && fullCommunityData.name) {
      console.log(`✨ ENRICHING POST: Community "${updatedPost.community.name}" -> "${fullCommunityData.name}"`);
      return {
        ...updatedPost,
        community: {
          id: fullCommunityData.id,
          name: fullCommunityData.name,
          logo: fullCommunityData.logo || updatedPost.community.logo || null,
          isPrivate: fullCommunityData.isPrivate || updatedPost.community.isPrivate || false
        }
      };
    }
    
    // If no store data but post has valid community info, return as-is
    return updatedPost;
  }
  
  // If post has community ID but no/invalid name, try to get name from store
  if (updatedPost.community?.id && updatedPost.community.id !== 'unknown') {
    const communities = useCommunityStore.getState().communities;
    const fullCommunityData = communities.find(c => c.id === updatedPost.community!.id);
    
    if (fullCommunityData && fullCommunityData.name) {
      console.log(`✨ ENRICHING POST: Community "${updatedPost.community?.name || 'null'}" -> "${fullCommunityData.name}"`);
      return {
        ...updatedPost,
        community: {
          id: fullCommunityData.id,
          name: fullCommunityData.name,
          logo: fullCommunityData.logo || updatedPost.community?.logo || null,
          isPrivate: fullCommunityData.isPrivate || updatedPost.community?.isPrivate || false
        }
      };
    } else {
      // Only log warning if we have communities loaded but can't find this one
      if (communities.length > 0) {
        console.log(`⚠️ Community not found in store for ID: ${updatedPost.community.id}`);
        console.log(`Available communities:`, communities.map(c => ({ id: c.id, name: c.name })));
      }
    }
  }
  
  // Return updated post (which might have corrected type) if no enrichment possible
  return updatedPost;
};

/**
 * Enriches multiple community posts with complete community information
 */
export const enrichCommunityPosts = (posts: Post[]): Post[] => {
  return posts.map(enrichCommunityPost);
};

/**
 * Gets community information by ID from the community store
 */
export const getCommunityById = (communityId: string) => {
  const communities = useCommunityStore.getState().communities;
  return communities.find(c => c.id === communityId);
};

/**
 * Converts community posts to home feed format with real community data
 */
export const convertCommunityPostsToHomeFeed = () => {
  const { communities } = useCommunityStore.getState();
  const homeFeedPosts: any[] = [];
  
  communities.forEach(community => {
    if (community.posts && community.posts.length > 0) {
      console.log(`🏘️ Converting posts from community: "${community.name}" (${community.posts.length} posts)`);
      community.posts.forEach(communityPost => {
        // Detect post type from type and subtype fields
        const postType = (communityPost as any).type;
        const postSubtype = (communityPost as any).subtype;
        const isQuestion = postType === 'question' || postSubtype === 'question';
        
        const homeFeedPost = {
          id: communityPost.id,
          author: {
            id: communityPost.userId || communityPost.UserId || '',
            _id: communityPost.userId || communityPost.UserId || '',
            name: communityPost.authorName || 'Unknown',
            username: (communityPost.authorName || 'user').toLowerCase().replace(/\s+/g, ''),
            email: '',
            profileImage: communityPost.authorAvatar || '',
            avatar: communityPost.authorAvatar || '',
            headline: '',
          },
          content: (communityPost as any).discription || (communityPost as any).content || '',
          images: (communityPost as any).images || (communityPost as any).media || (communityPost as any).imageUrls || [],
          createdAt: communityPost.createdAt,
          likes: communityPost.likesCount || (Array.isArray(communityPost.likes) ? communityPost.likes.length : 0),
          comments: Array.isArray(communityPost.comments) ? communityPost.comments.length : 0,
          reposts: 0,
          isLiked: communityPost.likedByCurrentUser || false,
          isBookmarked: false,
          isReposted: false,
          commentsList: communityPost.comments || [],
          community: {
            id: community.id,
            name: community.name, // Real community name!
            logo: community.logo || null,
            isPrivate: community.isPrivate,
          },
          type: isQuestion 
            ? 'question' as const 
            : postType === 'poll' 
              ? 'poll' as const 
              : 'community' as const,
          pollOptions: (communityPost as any).pollOptions,
          totalVotes: (communityPost as any).totalVotes || 0,
          hasVoted: (communityPost as any).hasVoted || false,
          userVote: (communityPost as any).userVote,
        };
        
        homeFeedPosts.push(homeFeedPost);
      });
    }
  });
  
  // Sort by creation date (newest first)
  return homeFeedPosts.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
};
