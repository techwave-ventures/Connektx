import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft, Send, MoreVertical, X, Check } from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { getMessagesForConversation, sendMessage, acceptMessageRequest, rejectMessageRequest, markMessagesAsSeen } from '@/api/conversation';
import { socketService } from '@/services/socketService';
import { initDatabase, getLocalMessages, saveMessages } from '@/services/databaseService';
import SharedPostCard from '@/components/messages/SharedPostCard';
import SharedNewsCard from '@/components/messages/SharedNewsCard';
import SharedShowcaseCard from '@/components/messages/SharedShowcaseCard';
import SharedUserCard from '@/components/messages/SharedUserCard';
import { getPostById } from '@/api/post';
import { getUserById } from '@/api/user';
import { useNewsStore } from '@/store/news-store';
import { useShowcaseStore } from '@/store/showcase-store';

// Main Chat Message Interface
interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id:string;
    name: string;
    avatar?: string;
  };
  type?: 'normal' | 'system';
  sharedPost?: any;
  sharedNews?: any;
  sharedShowcase?: any;
  sharedUser?: any;
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ 
    id: string; 
    otherUserName?: string; 
    otherUserAvatar?: string;
    isGroupChat?: string; // NEW: Receive the group chat flag
  }>();
  const { id: conversationId, otherUserName: initialOtherUserName, otherUserAvatar: initialOtherUserAvatar, isGroupChat} = params;

  const isGroup = isGroupChat === 'true';

  const router = useRouter();
  const { user, token } = useAuthStore();

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationStatus, setConversationStatus] = useState<'active' | 'pending' | 'blocked' | null>(null);
  const [initiatedBy, setInitiatedBy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Track keyboard height (Android) to avoid leftover bottom space after hide
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Track container height to detect if OS performs adjustResize (then we avoid extra padding)
  const containerBaseHeightRef = useRef<number | null>(null);
  const [currentContainerHeight, setCurrentContainerHeight] = useState<number | null>(null);

  // Glitch-free Android padding control
  const keyboardHeightRef = useRef(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [awaitingResizeCheck, setAwaitingResizeCheck] = useState(false);
  const [androidBottomPadding, setAndroidBottomPadding] = useState(0);
  const resizeCheckTimeoutRef = useRef<any>(null);
  
  const [headerInfo, setHeaderInfo] = useState({
    name: initialOtherUserName || 'Direct Message',
    avatar: initialOtherUserAvatar,
  });

  const insets = useSafeAreaInsets();

  // Access stores for optional local hydration sources
  const newsStore = useNewsStore();
  const showcaseStore = useShowcaseStore();

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  
  // console.log('[LOG] ConversationScreen mounted with params:', params);
  
  // Initialize DB on component mount
  useEffect(() => {
    // console.log('[DB] Initializing database...');
    initDatabase();
  }, []);

  // Mirror CommentsModal: listen for keyboard show/hide to manage bottom space (Android)
  // Avoid flicker: delay Android padding decision until we know if OS resized the window
  useEffect(() => {
    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
      keyboardHeightRef.current = h;
      setIsKeyboardVisible(true);
      if (resizeCheckTimeoutRef.current) {
        clearTimeout(resizeCheckTimeoutRef.current);
      }
      setAwaitingResizeCheck(true);
      // After a short delay, if OS did not resize, apply padding once
      resizeCheckTimeoutRef.current = setTimeout(() => {
        const base = containerBaseHeightRef.current;
        const curr = currentContainerHeight;
        const resizedByOS = h > 0 && base !== null && curr !== null && curr < base - 10;
        if (!resizedByOS) {
          setAndroidBottomPadding(Math.max(keyboardHeightRef.current - insets.bottom, 0));
        } else {
          setAndroidBottomPadding(0);
        }
        setAwaitingResizeCheck(false);
        resizeCheckTimeoutRef.current = null;
      }, 120);
    };

    const onHide = () => {
      setKeyboardHeight(0);
      keyboardHeightRef.current = 0;
      setIsKeyboardVisible(false);
      setAwaitingResizeCheck(false);
      setAndroidBottomPadding(0);
      if (resizeCheckTimeoutRef.current) {
        clearTimeout(resizeCheckTimeoutRef.current);
        resizeCheckTimeoutRef.current = null;
      }
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );
    return () => {
      showSub.remove();
      hideSub.remove();
      if (resizeCheckTimeoutRef.current) {
        clearTimeout(resizeCheckTimeoutRef.current);
        resizeCheckTimeoutRef.current = null;
      }
    };
  }, [currentContainerHeight, insets.bottom]);

  // Mark conversation as read when the screen is focused
  useFocusEffect(
    useCallback(() => {
      const markAsRead = async () => {
        if (token && conversationId) {
          try {
            // console.log([API CALL] Marking conversation ${conversationId} as read.);
            await markMessagesAsSeen(conversationId, token);
            // console.log('[SUCCESS] Conversation marked as read.');
          } catch (error) {
            console.error('[API ERROR] Failed to mark conversation as read:', error);
          }
        }
      };
      markAsRead();
    }, [conversationId, token])
  );

  // Helper: hydrate shared cards for a single message using raw API payload when available
  const hydrateMessageShared = async (msg: ChatMessage, raw?: any): Promise<ChatMessage> => {
    try {
      // If any shared object already present, keep it
      const alreadyHydrated = msg.sharedPost || msg.sharedNews || msg.sharedShowcase || msg.sharedUser;
      if (alreadyHydrated) return msg;

      const postId = raw?.sharedPost?._id || raw?.sharedPostId || null;
      const newsId = raw?.sharedNews?._id || raw?.sharedNewsId || null;
      const showcaseId = raw?.sharedShowcase?._id || raw?.sharedShowcaseId || null;
      const userId = raw?.sharedUser?._id || raw?.sharedUserId || null;

      // Fetch in parallel as applicable
      const fetches: Promise<any | null>[] = [];
      // Posts
      if (postId && token) {
        fetches.push(
          getPostById(token, postId)
            .then((res: any) => res?.body || res?.data || res || null)
            .catch(() => null)
        );
      } else {
        fetches.push(Promise.resolve(null));
      }
      // News
      if (newsId) {
        // Try local cache first
        const localNews = newsStore?.articles?.find?.((n: any) => n?._id === newsId || n?.id === newsId) || null;
        if (localNews) {
          fetches.push(Promise.resolve(localNews));
        } else {
          // Try API
          fetches.push(
            fetch(`${API_BASE_URL}/news/${newsId}`, { headers: token ? { token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' } })
              .then(r => r.ok ? r.json() : null)
              .then(j => (j?.body || j?.data || j || null))
              .catch(() => null)
          );
        }
      } else {
        fetches.push(Promise.resolve(null));
      }
      // Showcase
      if (showcaseId) {
        fetches.push(
          // Prefer store helper; it normalizes entries
          showcaseStore.fetchEntryById(showcaseId)
            .then((entry: any) => entry ? ({
              _id: entry.id,
              projectTitle: entry.title,
              tagline: entry.tagline,
              logo: entry.logo,
              bannerImageUrl: Array.isArray(entry.bannerImages) && entry.bannerImages.length > 0 ? entry.bannerImages[0] : null,
              images: entry.images || []
            }) : null)
            .catch(() => null)
        );
      } else {
        fetches.push(Promise.resolve(null));
      }
      // User
      if (userId && token) {
        fetches.push(
          getUserById(token, userId)
            .then((res: any) => res?.body || res?.data || res || null)
            .then((u: any) => u ? ({ _id: u._id || u.id, name: u.name, headline: u.headline, bio: u.bio, avatar: u.profileImage || u.avatar }) : null)
            .catch(() => null)
        );
      } else {
        fetches.push(Promise.resolve(null));
      }

      const [post, news, showcase, userObj] = await Promise.all(fetches);
      const next: ChatMessage = { ...msg } as any;
      if (post) next.sharedPost = post;
      if (news) next.sharedNews = news;
      if (showcase) next.sharedShowcase = showcase;
      if (userObj) next.sharedUser = userObj;
      return next;
    } catch {
      return msg;
    }
  };

  // Helper: hydrate an array of messages using a map of raw API messages by id
  const hydrateMessages = async (msgs: ChatMessage[], rawById: Map<string, any>): Promise<ChatMessage[]> => {
    const tasks = msgs.map(m => hydrateMessageShared(m, rawById.get(m.id)));
    return Promise.all(tasks);
  };

  // Load initial messages from both local DB and remote API
  useEffect(() => {
    const loadMessages = async () => {
      if (!token || !conversationId) {
        // console.log('[WARN] Token or conversationId missing. Aborting message load.');
        return;
      }
      
      setIsLoading(true);
      
      try {
        // --- 1. Load from Local DB First for instant UI ---
        // console.log([DB] Loading local messages for conversationId: ${conversationId});
        const localMessages = await getLocalMessages(conversationId);
        if (localMessages.length > 0) {
            setMessages(localMessages);
            // console.log([DB] Loaded ${localMessages.length} messages from local cache.);
        }

        // --- 2. Fetch latest from API ---
        // console.log([API CALL] Fetching remote messages for conversationId: ${conversationId});
        const response = await getMessagesForConversation(conversationId, token);
        // console.log('[API RESPONSE] getMessagesForConversation received.');

        if (response.success && response.body) {
            const { messages: remoteMessagesData = [], conversationStatus: status, initiatedBy: initiator } = response.body;

            setConversationStatus(status);
            setInitiatedBy(initiator);
            // console.log([STATE UPDATE] Status: ${status}, Initiated by: ${initiator});

            const transformedRemoteMessages = remoteMessagesData.map((msg: any) => ({
                id: msg._id,
                content: msg.content || '',
                createdAt: msg.createdAt,
                sender: { id: msg.sender?._id, name: msg.sender?.name, avatar: msg.sender?.profileImage },
                type: 'normal',
                // Shared objects if backend provided them
                sharedPost: msg.sharedPost,
                sharedNews: msg.sharedNews,
                sharedShowcase: msg.sharedShowcase,
                sharedUser: msg.sharedUser,
            }));

            // Build raw map for hydration (by message id)
            const rawById = new Map<string, any>();
            for (const rm of remoteMessagesData) {
              if (rm && rm._id) rawById.set(rm._id, rm);
            }
            
            // --- 3. Merge and De-duplicate ---
            const localMessageIds = new Set(localMessages.map(m => m.id));
            const newUniqueMessages = transformedRemoteMessages.filter(m => !localMessageIds.has(m.id));
            
            // Combine all for display (local first for instant UI)
            const combinedMessages = [...localMessages, ...newUniqueMessages];
            combinedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            // Hydrate shared cards for combined view (so cards show immediately)
            const hydratedCombined = await hydrateMessages(combinedMessages, rawById);
            setMessages(hydratedCombined);

            // --- 4. Save only newly fetched messages (hydrated) to DB ---
            if (newUniqueMessages.length > 0) {
              const newIds = new Set(newUniqueMessages.map(m => m.id));
              const toSave = hydratedCombined.filter(m => newIds.has(m.id));
              await saveMessages(conversationId, toSave);
            }

            // MODIFIED: Only update header info from messages for direct chats
            if (!isGroup) {
              const allMessages = localMessages.length > 0 ? localMessages : transformedRemoteMessages;
              const otherUserMessage = allMessages.find(msg => msg.sender.id !== user?.id);
              if (otherUserMessage) {
                  setHeaderInfo({ name: otherUserMessage.sender.name, avatar: otherUserMessage.sender.avatar });
              }
            }
        }
      } catch (error) {
        console.error('[FATAL ERROR] Error during message loading process:', error);
      } finally {
        setIsLoading(false);
        // console.log('[LOG] Finished loading and processing messages.');
      }
    };

    loadMessages();
  }, [conversationId, token]);

  // Socket listener for real-time messages
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      // console.log('[SOCKET] Setting up "newMessage" listener.');
      const handleNewMessage = async (newMessage: any) => {
        // console.log('[SOCKET] Received "newMessage" event:', newMessage);
        if (newMessage.conversationId === conversationId) {
          const baseMessage: ChatMessage = {
            id: newMessage._id,
            content: newMessage.content,
            createdAt: newMessage.createdAt,
            sender: { id: newMessage.sender._id, name: newMessage.sender.name, avatar: newMessage.sender.profileImage },
            type: 'normal',
            sharedPost: newMessage.sharedPost,
            sharedNews: newMessage.sharedNews,
            sharedShowcase: newMessage.sharedShowcase,
            sharedUser: newMessage.sharedUser,
          };

          // Hydrate using the raw socket payload (which may include only IDs)
          const hydrated = await hydrateMessageShared(baseMessage, newMessage);

          setMessages(prev => {
            // Also save to local DB
            saveMessages(conversationId, [hydrated]);
            return [...prev, hydrated];
          });
        }
      };
      
      socket.on('newMessage', handleNewMessage);
      return () => {
        // console.log('[SOCKET] Cleaning up "newMessage" listener.');
        socket.off('newMessage', handleNewMessage);
      };
    }
  }, [conversationId]);
  
  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      // console.log('[UI] Scrolling to end.');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);


  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || isSending) return;

    const messageContent = messageText.trim();
    // console.log([API CALL] Sending message: "${messageContent}");
    setMessageText('');
    setIsSending(true);

    try {
      await sendMessage(conversationId!, { content: messageContent }, token!);
      // console.log('[SUCCESS] Message sent successfully.');
    } catch (error) {
      console.error('[API ERROR] Error sending message:', error);
      setMessageText(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!token || !conversationId) return;
    // console.log('[API CALL] Accepting request...');
    try {
      await acceptMessageRequest(conversationId, token);
      setConversationStatus('active');
      // console.log('[SUCCESS] Request accepted.');
    } catch (error) {
      console.error("[API ERROR] Error in handleAcceptRequest:", error);
    }
  };

  const handleRejectRequest = async () => {
    if (!token || !conversationId) return;
    // console.log('[API CALL] Rejecting request...');
    try {
      await rejectMessageRequest(conversationId, token);
      // console.log('[SUCCESS] Request rejected. Navigating back.');
      router.back();
    } catch (error) {
      console.error("[API ERROR] Error in handleRejectRequest:", error);
      router.back();
    }
  };
  
  const renderChatMessage = ({ item }: { item: ChatMessage }) => {
    const sentByMe = item.sender.id === user?.id;
    const hasSharedContent = item.sharedPost || item.sharedNews || item.sharedShowcase || item.sharedUser;

    return (
      <View style={styles.messageContainer}>
        {hasSharedContent ? (
          <View style={[styles.sharedContentContainer, sentByMe ? styles.sentBubble : styles.receivedBubble]}>
            {item.content ? <Text style={[styles.sharedContentText, sentByMe ? styles.sentMessageText : styles.receivedMessageText]}>{item.content}</Text> : null}
            {item.sharedPost && <SharedPostCard post={item.sharedPost} author={item.sender} />}
            {item.sharedNews && <SharedNewsCard news={item.sharedNews} />}
            {item.sharedShowcase && <SharedShowcaseCard showcase={item.sharedShowcase} />}
            {item.sharedUser && <SharedUserCard user={item.sharedUser} />}
             <Text style={[styles.timestamp, sentByMe ? styles.sentTimestamp : styles.receivedTimestamp]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </Text>
          </View>
        ) : (
          <View style={[styles.messageBubble, sentByMe ? styles.sentBubble : styles.receivedBubble]}>
            <Text style={sentByMe ? styles.sentMessageText : styles.receivedMessageText}>{item.content}</Text>
             <Text style={[styles.timestamp, sentByMe ? styles.sentTimestamp : styles.receivedTimestamp]}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && messages.length === 0) { // Only show full screen loader on initial load
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderFooter = () => {
    // While loading conversation status or before it's known, show a disabled input bar
    // This keeps UI stable without changing functionality (sending stays disabled)
    if (isLoading || conversationStatus === null) {
      return (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={Colors.dark.subtext}
            value={messageText}
            onChangeText={setMessageText}
            editable={false}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, styles.sendButtonDisabled]}
            disabled
          >
            <Send size={20} color={Colors.dark.subtext} />
          </TouchableOpacity>
        </View>
      );
    }

    // Scenario 1: The user has received a request from someone else.
    const showRequestReceivedFooter = conversationStatus === 'pending' && initiatedBy !== user?.id;
    if (showRequestReceivedFooter) {
      return (
        <View style={styles.requestFooter}>
          <Text style={styles.requestFooterText}>{headerInfo.name} wants to connect with you.</Text>
          <View style={styles.requestButtons}>
            <TouchableOpacity style={[styles.requestButton, styles.rejectButton]} onPress={handleRejectRequest}>
              <X size={20} color={Colors.dark.text} />
              <Text style={styles.requestButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.requestButton, styles.acceptButton]} onPress={handleAcceptRequest}>
              <Check size={20} color={'white'} />
              <Text style={[styles.requestButtonText, { color: 'white' }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    // Scenario 2: The conversation is active.
    const canSendMessage = conversationStatus === 'active';
    
    // Scenario 3: The user initiated a pending chat and hasn't sent the first message yet.
    const canSendFirstMessage = conversationStatus === 'pending' && initiatedBy === user?.id && messages.length === 0;

    // Show the input box if the chat is active OR if the user can send their first request message.
    if (canSendMessage || canSendFirstMessage) {
      return (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={canSendFirstMessage ? "Send a message request..." : "Type a message..."}
            placeholderTextColor={Colors.dark.subtext}
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || isSending}
          >
            <Send size={20} color={(messageText.trim() && !isSending) ? 'white' : Colors.dark.subtext} />
          </TouchableOpacity>
        </View>
      );
    }

    // Scenario 4: The user has sent their first message request and is now waiting.
    const showPendingSentFooter = conversationStatus === 'pending' && initiatedBy === user?.id && messages.length > 0;
    if (showPendingSentFooter) {
      return (
        <View style={styles.pendingFooter}>
          <Text style={styles.pendingFooterText}>
            Your message request has been sent. You can chat freely once your request is accepted.
          </Text>
        </View>
      );
    }

    // Fallback for any other states (e.g., 'blocked', 'rejected')
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.dark.background },
          headerShadowVisible: false,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Avatar source={headerInfo.avatar} size={36} name={headerInfo.name} />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName} numberOfLines={1}>{headerInfo.name}</Text>
                <Text style={styles.onlineText}>{isGroup ? 'Group Chat' : 'Direct Message'}</Text>
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerMenuButton}>
              <MoreVertical size={20} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          behavior={'padding'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={100}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderChatMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyMessagesContainer}>
                  <Text style={styles.emptyMessagesText}>Start your conversation!</Text>
                  <Text style={styles.emptyMessagesSubtext}>Send a message to begin chatting.</Text>
                </View>
              ) : null
            }
          />
          {renderFooter()}
        </KeyboardAvoidingView>
      ) : (
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setCurrentContainerHeight(h);
            if (keyboardHeight === 0 && (containerBaseHeightRef.current === null || containerBaseHeightRef.current < h)) {
              containerBaseHeightRef.current = h;
            }
            // If we're waiting to decide and we observe a shrink, conclude no extra padding needed
            if (Platform.OS === 'android' && isKeyboardVisible && awaitingResizeCheck) {
              const base = containerBaseHeightRef.current;
              if (base !== null && h < base - 10) {
                setAndroidBottomPadding(0);
                setAwaitingResizeCheck(false);
                if (resizeCheckTimeoutRef.current) {
                  clearTimeout(resizeCheckTimeoutRef.current);
                  resizeCheckTimeoutRef.current = null;
                }
              }
            }
          }}
          style={[
            styles.keyboardAvoidingView,
            { paddingBottom: Platform.OS === 'android' ? (awaitingResizeCheck ? 0 : androidBottomPadding) : 0 }
          ]}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderChatMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyMessagesContainer}>
                  <Text style={styles.emptyMessagesText}>Start your conversation!</Text>
                  <Text style={styles.emptyMessagesSubtext}>Send a message to begin chatting.</Text>
                </View>
              ) : null
            }
          />
          {renderFooter()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: Colors.dark.subtext, fontSize: 16, marginTop: 12 },
    keyboardAvoidingView: { flex: 1 },
    messagesList: { 
      paddingHorizontal: 16, 
      flexGrow: 1, 
      paddingTop: 8,
      paddingBottom: 8,
    },
    
    headerTitle: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: -20 },
    headerInfo: { marginLeft: 12, flex: 1 },
    headerName: { color: Colors.dark.text, fontSize: 16, fontWeight: '600' },
    onlineText: { color: Colors.dark.subtext, fontSize: 12, marginTop: 2 },
    backButton: { paddingHorizontal: 16 },
    headerMenuButton: { paddingHorizontal: 16 },
    
    messageContainer: { marginVertical: 4 },
    messageBubble: { 
      maxWidth: '85%', 
      paddingHorizontal: 12, 
      paddingTop: 12, 
      paddingBottom: 8, 
      borderRadius: 18, 
      position: 'relative' 
    },
    sentBubble: { alignSelf: 'flex-end', backgroundColor: Colors.dark.primary },
    receivedBubble: { alignSelf: 'flex-start', backgroundColor: Colors.dark.card },
    sentMessageText: { color: 'white', fontSize: 16 },
    receivedMessageText: { color: Colors.dark.text, fontSize: 16 },

    sharedContentContainer: { 
      maxWidth: '85%', 
      borderRadius: 18, 
      overflow: 'hidden', 
      padding: 8 
    },
    sharedContentText: { 
      paddingHorizontal: 4, 
      marginBottom: 8, 
      fontSize: 16 
    },

    timestamp: { 
      fontSize: 11, 
      color: Colors.dark.subtext, 
      marginTop: 4, 
      alignSelf: 'flex-end' 
    },
    sentTimestamp: { color: '#E0E0E0' },
    receivedTimestamp: { color: Colors.dark.subtext },

    emptyMessagesContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 40 
    },
    emptyMessagesText: { 
      color: Colors.dark.text, 
      fontSize: 18, 
      fontWeight: '600', 
      textAlign: 'center' 
    },
    emptyMessagesSubtext: { 
      color: Colors.dark.subtext, 
      fontSize: 14, 
      textAlign: 'center', 
      marginTop: 8 
    },

    inputContainer: { 
      flexDirection: 'row', 
      alignItems: 'flex-end', 
      paddingHorizontal: 12, 
      paddingVertical: 8, 
      borderTopWidth: 1, 
      borderTopColor: Colors.dark.border, 
      backgroundColor: Colors.dark.background, 
      gap: 8 
    },
    input: { 
      flex: 1, 
      backgroundColor: Colors.dark.card, 
      borderRadius: 20, 
      paddingHorizontal: 16, 
      paddingVertical: 10, 
      color: Colors.dark.text, 
      maxHeight: 120, 
      fontSize: 16 
    },
    sendButton: { 
      width: 40, 
      height: 40, 
      borderRadius: 20, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: Colors.dark.primary 
    },
    sendButtonDisabled: { backgroundColor: Colors.dark.card },

    requestFooter: { 
      padding: 16, 
      paddingBottom: 24, 
      borderTopWidth: 1, 
      borderTopColor: Colors.dark.border, 
      backgroundColor: Colors.dark.background 
    },
    requestFooterText: { 
      color: Colors.dark.text, 
      textAlign: 'center', 
      fontSize: 14, 
      marginBottom: 16 
    },
    requestButtons: { 
      flexDirection: 'row', 
      justifyContent: 'space-around', 
      gap: 12 
    },
    requestButton: { 
      flex: 1, 
      flexDirection: 'row', 
      justifyContent: 'center', 
      alignItems: 'center', 
      paddingVertical: 12, 
      borderRadius: 25, 
      gap: 8 
    },
    rejectButton: { backgroundColor: Colors.dark.card },
    acceptButton: { backgroundColor: Colors.dark.primary },
    requestButtonText: { 
      fontSize: 16, 
      fontWeight: '600', 
      color: Colors.dark.text 
    },
    // *NEW* Styles for the pending footer
    pendingFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: Colors.dark.border,
      backgroundColor: Colors.dark.background,
      alignItems: 'center',
    },
    pendingFooterText: {
      color: Colors.dark.subtext,
      fontSize: 14,
      textAlign: 'center',
    }
});