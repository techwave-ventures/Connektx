// File: api/conversation.ts

import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';

// --- IMPORTANT ---
// Replace this with your actual Render backend URL
const BASE_URL = API_BASE_URL;
const API_URL = `${API_BASE_URL}/conversations`;
const API_BASE = API_BASE_URL;

// Error handling helper
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }
  return response.json();
};

/**
 * Fetches all active conversations for the logged-in user.
 * Corresponds to: GET /conversations
 */
export const getConversations = async (token: string) => {
  const response = await fetch(`${BASE_URL}/conversations`, {
    method: 'GET',
    headers: {
      'token': `${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
};

/**
 * Fetches all messages for a specific conversation with pagination.
 * Corresponds to: GET /conversations/:conversationId/messages
 */
export const getMessagesForConversation = async (conversationId: string, token: string, page = 1, limit = 30) => {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'token': `${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
};

/**
 * Accepts a pending message request.
 * Corresponds to: POST /conversations/requests/:conversationId/accept
 */
export const acceptMessageRequest = async (conversationId: string, token: string) => {
    const response = await fetch(`${BASE_URL}/conversations/requests/${conversationId}/accept`, {
        method: 'POST',
        headers: {
            'token': `${token}`,
            'Content-Type': 'application/json',
        },
    });
    return handleResponse(response);
};

/**
 * Rejects a pending message request.
 * Corresponds to: POST /conversations/requests/:conversationId/reject
 */
export const rejectMessageRequest = async (conversationId: string, token: string) => {
  const response = await fetch(`${BASE_URL}/conversations/requests/${conversationId}/reject`, {
      method: 'POST',
      headers: {
          'token': `${token}`,
          'Content-Type': 'application/json',
      },
  });
  return handleResponse(response);
};

/**
 * Fetches all pending message requests for the user.
 * Corresponds to: GET /conversations/requests
 */
export const getMessageRequests = async (token: string) => {
    const response = await fetch(`${BASE_URL}/conversations/requests`, {
        method: 'GET',
        headers: {
            'token': `${token}`,
            'Content-Type': 'application/json',
        },
    });
    return handleResponse(response);
};


export const findOrCreateConversation = async (recipientId: string, token: string) => {
  console.log(`API: Calling startConversation for recipient: ${recipientId}`);
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': `${token}`,
    },
    body: JSON.stringify({ recipientId }), // Send recipientId in the body
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to start conversation');
  }

  return response.json();
};


/**
 * Sends a new message to a conversation.
 * Can be a simple text message or a shared content message.
 */
export const sendMessage = async (
  conversationId: string,
  payload: {
    content?: string; // For text messages
    sharedPostId?: string; // For shared posts
    sharedNewsId?: string; // For shared news
    sharedShowcaseId?: string; // For shared showcases
    sharedUserId?: string; // For shared user profiles
  },
  token: string
) => {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'token': `${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};


/**
 * Marks all messages in a conversation as seen by the current user.
 */
export const markMessagesAsSeen = async (conversationId: string, token: string) => {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}/seen`, {
    method: 'POST',
    headers: {
      'token': `${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(response);
};


export async function getConnections(token: string) {
  const res = await fetch(`${API_BASE}/user/connections`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'token': token,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}