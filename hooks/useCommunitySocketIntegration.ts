// Hook to integrate socket events with community store for real-time updates

import { useEffect } from 'react';
import { useCommunitySocket } from '../api/communitySocket';
import { useCommunityStore } from '../store/community-store';

export const useCommunitySocketIntegration = (token: string) => {
  const [isConnected, socketEvents] = useCommunitySocket(token);
  const { communities, setCommunities, setActiveCommunity, joinedCommunities, setJoinedCommunities } = useCommunityStore();

  useEffect(() => {
    if (!isConnected || !socketEvents) return;

    // Handle new posts in communities
    const unsubscribeNewPost = socketEvents.onNewPost((data) => {
      console.log('New community post received:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => 
          community.id === data.communityId 
            ? { 
                ...community, 
                posts: [...community.posts, data.post],
                lastActivity: new Date().toISOString()
              }
            : community
        )
      }));
    });

    // Handle post updates (likes, pins, etc.)
    const unsubscribePostUpdated = socketEvents.onPostUpdated((data) => {
      console.log('Community post updated:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => ({
          ...community,
          posts: community.posts.map(post => 
            post.id === data.postId ? { ...post, ...data.updates } : post
          )
        }))
      }));
    });

    // Handle post deletions
    const unsubscribePostDeleted = socketEvents.onPostDeleted((data) => {
      console.log('Community post deleted:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => 
          community.id === data.communityId 
            ? { 
                ...community, 
                posts: community.posts.filter(p => p.id !== data.postId)
              }
            : community
        )
      }));
    });

    // Handle new comments
    const unsubscribeNewComment = socketEvents.onNewComment((data) => {
      console.log('New community comment received:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => ({
          ...community,
          posts: community.posts.map(post => 
            post.id === data.postId 
              ? { ...post, comments: [...post.comments, data.comment] }
              : post
          )
        }))
      }));
    });

    // Handle comment updates
    const unsubscribeCommentUpdated = socketEvents.onCommentUpdated((data) => {
      console.log('Community comment updated:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => ({
          ...community,
          posts: community.posts.map(post => ({
            ...post,
            comments: post.comments.map(comment => 
              comment.id === data.commentId ? { ...comment, ...data.updates } : comment
            )
          }))
        }))
      }));
    });

    // Handle comment deletions
    const unsubscribeCommentDeleted = socketEvents.onCommentDeleted((data) => {
      console.log('Community comment deleted:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => ({
          ...community,
          posts: community.posts.map(post => 
            post.id === data.postId 
              ? { 
                  ...post, 
                  comments: post.comments.filter(c => c.id !== data.commentId)
                }
              : post
          )
        }))
      }));
    });

    // Handle member joining
    const unsubscribeMemberJoined = socketEvents.onMemberJoined((data) => {
      console.log('Member joined community:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => 
          community.id === data.communityId 
            ? { 
                ...community, 
                members: [...community.members, data.userId],
                memberCount: community.memberCount + 1,
                lastActivity: new Date().toISOString()
              }
            : community
        ),
        // Update joined communities if it's the current user
        joinedCommunities: data.isCurrentUser 
          ? [...state.joinedCommunities, {
              communityId: data.communityId,
              joinedAt: new Date().toISOString(),
              role: 'member'
            }]
          : state.joinedCommunities
      }));
    });

    // Handle member leaving
    const unsubscribeMemberLeft = socketEvents.onMemberLeft((data) => {
      console.log('Member left community:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => 
          community.id === data.communityId 
            ? { 
                ...community, 
                members: community.members.filter(id => id !== data.userId),
                admins: community.admins.filter(id => id !== data.userId),
                moderators: community.moderators.filter(id => id !== data.userId),
                memberCount: Math.max(0, community.memberCount - 1),
                lastActivity: new Date().toISOString()
              }
            : community
        ),
        // Update joined communities if it's the current user
        joinedCommunities: data.isCurrentUser 
          ? state.joinedCommunities.filter(jc => jc.communityId !== data.communityId)
          : state.joinedCommunities
      }));
    });

    // Handle role changes
    const unsubscribeRoleChanged = socketEvents.onRoleChanged((data) => {
      console.log('Member role changed:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => 
          community.id === data.communityId ? data.community : community
        ),
        // Update joined communities if it affects the current user
        joinedCommunities: state.joinedCommunities.map(jc => 
          jc.communityId === data.communityId && data.community.members.includes(data.userId)
            ? { ...jc, role: data.newRole }
            : jc
        )
      }));
    });

    // Handle new announcements
    const unsubscribeNewAnnouncement = socketEvents.onNewAnnouncement((data) => {
      console.log('New community announcement:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => 
          community.id === data.communityId 
            ? { 
                ...community, 
                announcements: [...community.announcements, data.announcement],
                lastActivity: new Date().toISOString()
              }
            : community
        )
      }));
    });

    // Handle join request updates
    const unsubscribeJoinRequestUpdated = socketEvents.onJoinRequestUpdated((data) => {
      console.log('Join request updated:', data);
      
      useCommunityStore.setState(state => ({
        communities: state.communities.map(community => 
          community.id === data.communityId 
            ? { 
                ...community, 
                joinRequests: community.joinRequests.map(request => 
                  request.id === data.requestId 
                    ? { ...request, status: data.status }
                    : request
                )
              }
            : community
        )
      }));
    });

    // Cleanup function to unsubscribe from all events
    return () => {
      if (unsubscribeNewPost) unsubscribeNewPost();
      if (unsubscribePostUpdated) unsubscribePostUpdated();
      if (unsubscribePostDeleted) unsubscribePostDeleted();
      if (unsubscribeNewComment) unsubscribeNewComment();
      if (unsubscribeCommentUpdated) unsubscribeCommentUpdated();
      if (unsubscribeCommentDeleted) unsubscribeCommentDeleted();
      if (unsubscribeMemberJoined) unsubscribeMemberJoined();
      if (unsubscribeMemberLeft) unsubscribeMemberLeft();
      if (unsubscribeRoleChanged) unsubscribeRoleChanged();
      if (unsubscribeNewAnnouncement) unsubscribeNewAnnouncement();
      if (unsubscribeJoinRequestUpdated) unsubscribeJoinRequestUpdated();
    };
  }, [isConnected, socketEvents]);

  return isConnected;
};

export default useCommunitySocketIntegration;
