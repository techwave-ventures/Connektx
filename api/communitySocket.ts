// Socket.IO integration for real-time community updates

import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';

let socket: Socket | null = null;

interface CommunitySocketEvents {
  onNewPost: (callback: (data: any) => void) => void;
  onPostUpdated: (callback: (data: any) => void) => void;
  onPostDeleted: (callback: (data: any) => void) => void;
  onNewComment: (callback: (data: any) => void) => void;
  onCommentUpdated: (callback: (data: any) => void) => void;
  onCommentDeleted: (callback: (data: any) => void) => void;
  onMemberJoined: (callback: (data: any) => void) => void;
  onMemberLeft: (callback: (data: any) => void) => void;
  onRoleChanged: (callback: (data: any) => void) => void;
  onNewAnnouncement: (callback: (data: any) => void) => void;
  onJoinRequestUpdated: (callback: (data: any) => void) => void;
}

export const useCommunitySocket = (token: string): [boolean, CommunitySocketEvents] => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection if not already established
    if (!socket) {
      socket = io(API_BASE_URL, {
        auth: {
          token
        },
        transports: ['websocket'],
        // Prevent reconnection on hot reload during development on web
        reconnection: Platform.OS !== 'web'
      });
    }

    const handleConnect = () => {
      console.log('Connected to community socket server');
      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log('Disconnected from community socket server:', reason);
      setIsConnected(false);
    };

    const handleError = (error: Error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    };

    // Setup event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    // Check if already connected
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      // Remove event listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
    };
  }, [token]);

  // Join a community room to receive community-specific events
  const joinCommunityRoom = (communityId: string) => {
    if (socket && isConnected) {
      socket.emit('join_community', { communityId });
      console.log(`Joined community room: ${communityId}`);
    }
  };

  // Leave a community room when no longer needed
  const leaveCommunityRoom = (communityId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_community', { communityId });
      console.log(`Left community room: ${communityId}`);
    }
  };

  useEffect(() => {
    return () => {
      // Only disconnect when component unmounts completely, not on token change
      if (socket) {
        // We don't want to disconnect the socket on cleanup
        // as it might be used by other components
        // socket.disconnect();
      }
    };
  }, []);

  // Community event handler functions
  const socketEvents: CommunitySocketEvents = {
    onNewPost: (callback) => {
      if (socket) {
        socket.on('community:new_post', callback);
        return () => socket.off('community:new_post', callback);
      }
    },
    onPostUpdated: (callback) => {
      if (socket) {
        socket.on('community:post_updated', callback);
        return () => socket.off('community:post_updated', callback);
      }
    },
    onPostDeleted: (callback) => {
      if (socket) {
        socket.on('community:post_deleted', callback);
        return () => socket.off('community:post_deleted', callback);
      }
    },
    onNewComment: (callback) => {
      if (socket) {
        socket.on('community:new_comment', callback);
        return () => socket.off('community:new_comment', callback);
      }
    },
    onCommentUpdated: (callback) => {
      if (socket) {
        socket.on('community:comment_updated', callback);
        return () => socket.off('community:comment_updated', callback);
      }
    },
    onCommentDeleted: (callback) => {
      if (socket) {
        socket.on('community:comment_deleted', callback);
        return () => socket.off('community:comment_deleted', callback);
      }
    },
    onMemberJoined: (callback) => {
      if (socket) {
        socket.on('community:member_joined', callback);
        return () => socket.off('community:member_joined', callback);
      }
    },
    onMemberLeft: (callback) => {
      if (socket) {
        socket.on('community:member_left', callback);
        return () => socket.off('community:member_left', callback);
      }
    },
    onRoleChanged: (callback) => {
      if (socket) {
        socket.on('community:role_changed', callback);
        return () => socket.off('community:role_changed', callback);
      }
    },
    onNewAnnouncement: (callback) => {
      if (socket) {
        socket.on('community:new_announcement', callback);
        return () => socket.off('community:new_announcement', callback);
      }
    },
    onJoinRequestUpdated: (callback) => {
      if (socket) {
        socket.on('community:join_request_updated', callback);
        return () => socket.off('community:join_request_updated', callback);
      }
    }
  };

  return [isConnected, socketEvents];
};

// Helper hook to connect to a specific community
export const useCommunityRoomConnection = (token: string, communityId: string | null) => {
  const [isConnected, socketEvents] = useCommunitySocket(token);

  useEffect(() => {
    if (isConnected && communityId) {
      // Join the community room
      if (socket) {
        socket.emit('join_community', { communityId });
        console.log(`Joined community room: ${communityId}`);
      }

      return () => {
        // Leave the community room when component unmounts or communityId changes
        if (socket) {
          socket.emit('leave_community', { communityId });
          console.log(`Left community room: ${communityId}`);
        }
      };
    }
  }, [isConnected, communityId]);

  return [isConnected, socketEvents];
};

export default {
  useCommunitySocket,
  useCommunityRoomConnection,
  
  // Expose functions to manually join/leave rooms if needed outside hooks
  joinCommunityRoom: (communityId: string) => {
    if (socket && socket.connected) {
      socket.emit('join_community', { communityId });
    }
  },
  
  leaveCommunityRoom: (communityId: string) => {
    if (socket && socket.connected) {
      socket.emit('leave_community', { communityId });
    }
  },
  
  // Method to disconnect socket when completely done
  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};
