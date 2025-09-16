import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  const [headerInfo, setHeaderInfo] = useState({
    name: initialOtherUserName || 'Direct Message',
    avatar: initialOtherUserAvatar,
  });

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  
  // console.log('[LOG] ConversationScreen mounted with params:', params);
  
  // Initialize DB on component mount
  useEffect(() => {
    // console.log('[DB] Initializing database...');
    initDatabase();
  }, []);

  // Keyboard visibility tracking
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Mark conversation as read when the screen is focused
  useFocusEffect(
    useCallback(() => {
      const markAsRead = async () => {
        if (token && conversationId) {
          try {
            // console.log(`[API CALL] Marking conversation ${conversationId} as read.`);
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
        // console.log(`[DB] Loading local messages for conversationId: ${conversationId}`);
        const localMessages = await getLocalMessages(conversationId);
        if (localMessages.length > 0) {
            setMessages(localMessages);
            // console.log(`[DB] Loaded ${localMessages.length} messages from local cache.`);
        }

        // --- 2. Fetch latest from API ---
        // console.log(`[API CALL] Fetching remote messages for conversationId: ${conversationId}`);
        const response = await getMessagesForConversation(conversationId, token);
        // console.log('[API RESPONSE] getMessagesForConversation received.');

        if (response.success && response.body) {
            const { messages: remoteMessagesData = [], conversationStatus: status, initiatedBy: initiator } = response.body;

            setConversationStatus(status);
            setInitiatedBy(initiator);
            // console.log(`[STATE UPDATE] Status: ${status}, Initiated by: ${initiator}`);

            const transformedRemoteMessages = remoteMessagesData.map((msg: any) => ({
                id: msg._id,
                content: msg.content || '',
                createdAt: msg.createdAt,
                sender: { id: msg.sender?._id, name: msg.sender?.name, avatar: msg.sender?.profileImage },
                type: 'normal',
                sharedPost: msg.sharedPost,
                sharedNews: msg.sharedNews,
                sharedShowcase: msg.sharedShowcase,
                sharedUser: msg.sharedUser,
            }));
            
            // --- 3. Merge and De-duplicate ---
            // console.log('[LOG] Merging local and remote messages...');
            const localMessageIds = new Set(localMessages.map(m => m.id));
            const newUniqueMessages = transformedRemoteMessages.filter(m => !localMessageIds.has(m.id));
            
            if (newUniqueMessages.length > 0) {
                // console.log(`[LOG] Found ${newUniqueMessages.length} new messages from API.`);
                const combinedMessages = [...localMessages, ...newUniqueMessages];
                combinedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                setMessages(combinedMessages);
                // console.log(`[STATE UPDATE] Total messages now: ${combinedMessages.length}`);

                // --- 4. Save new messages to DB ---
                // console.log(`[DB] Saving ${newUniqueMessages.length} new messages to local cache.`);
                await saveMessages(conversationId, newUniqueMessages);
            } else {
                // console.log('[LOG] No new messages from API. Local cache is up-to-date.');
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
      const handleNewMessage = (newMessage: any) => {
        // console.log('[SOCKET] Received "newMessage" event:', newMessage);
        if (newMessage.conversationId === conversationId) {
          const transformedMessage: ChatMessage = {
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

          setMessages(prev => {
            // console.log(`[STATE UPDATE] Adding new message with ID: ${transformedMessage.id}`);
            // Also save to local DB
            saveMessages(conversationId, [transformedMessage]);
            return [...prev, transformedMessage];
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
  
  // Auto-scroll to the bottom on initial load and message update
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // console.log('[UI] Scrolling to end.');
      const timer = setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isLoading]);


  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || isSending) return;

    const messageContent = messageText.trim();
    // console.log(`[API CALL] Sending message: "${messageContent}"`);
    setMessageText('');
    setIsSending(true);

    try {
      await sendMessage(conversationId!, { content: messageContent }, token!);
      // console.log('[SUCCESS] Message sent successfully.');
      
      // Ensure scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
    // Scenario 1: The user has received a request from someone else.
    const showRequestReceivedFooter = conversationStatus === 'pending' && initiatedBy !== user?.id;
    if (showRequestReceivedFooter) {
      return (
        <View style={[
          styles.requestFooter,
          !isKeyboardVisible && styles.requestFooterWithBottomSafeArea
        ]}>
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
        <View style={[
          styles.inputContainer,
          !isKeyboardVisible && styles.inputContainerWithBottomSafeArea
        ]}>
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
        <View style={[
          styles.pendingFooter,
          !isKeyboardVisible && styles.pendingFooterWithBottomSafeArea
        ]}>
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderChatMessage}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyMessagesList
          ]}
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
          onContentSizeChange={() => {
            // Scroll to end when content size changes (new message added)
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 50);
            }
          }}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyMessagesContainer}>
                <Text style={styles.emptyMessagesText}>Start your conversation!</Text>
                <Text style={styles.emptyMessagesSubtext}>Send a message to begin chatting.</Text>
              </View>
            ) : null // Show nothing while loading in the background
          }
        />

        {/* {showRequestFooter ? (
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
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
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
        )}
        */}

        {renderFooter()}
      </KeyboardAvoidingView>
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
      paddingTop: 8,
      paddingBottom: 16,
      minHeight: '100%',
    },
    emptyMessagesList: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    
    headerTitle: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: -20 },
    headerInfo: { marginLeft: 12, flex: 1 },
    headerName: { color: Colors.dark.text, fontSize: 16, fontWeight: '600' },
    onlineText: { color: Colors.dark.subtext, fontSize: 12, marginTop: 2 },
    backButton: { paddingHorizontal: 16 },
    headerMenuButton: { paddingHorizontal: 16 },
    
    messageContainer: { 
      marginVertical: 4,
      paddingHorizontal: 2,
    },
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
      paddingTop: 8, 
      paddingBottom: 8, 
      borderTopWidth: 1, 
      borderTopColor: Colors.dark.border, 
      backgroundColor: Colors.dark.background, 
      gap: 8 
    },
    inputContainerWithBottomSafeArea: {
      paddingBottom: Platform.OS === 'ios' ? 34 : 8,
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
      paddingBottom: 16, 
      borderTopWidth: 1, 
      borderTopColor: Colors.dark.border, 
      backgroundColor: Colors.dark.background 
    },
    requestFooterWithBottomSafeArea: {
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
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
    // **NEW** Styles for the pending footer
    pendingFooter: {
      padding: 20,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: Colors.dark.border,
      backgroundColor: Colors.dark.background,
      alignItems: 'center',
    },
    pendingFooterWithBottomSafeArea: {
      paddingBottom: Platform.OS === 'ios' ? 44 : 20,
    },
    pendingFooterText: {
      color: Colors.dark.subtext,
      fontSize: 14,
      textAlign: 'center',
    }
});