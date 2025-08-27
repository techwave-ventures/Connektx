import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Send, CheckCircle2, Circle } from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { socketService } from '@/services/socketService';
import { getMessagesForConversation, acceptMessageRequest, sendMessage } from '@/api/conversation';
import SharedPostCard from '@/components/messages/SharedPostCard';
import SharedNewsCard from '@/components/messages/SharedNewsCard';
import SharedShowcaseCard from '@/components/messages/SharedShowcaseCard';
import SharedUserCard from '@/components/messages/SharedUserCard';

// --- SOLUTION: Update the SharedPost interface to match the API response ---
interface SharedPost {
  _id: string;
  discription: string;      // Changed from 'content' to 'discription'
  media?: string[];         // Changed from 'images' to 'media'
  userId: string;           // Changed from nested 'author' to flat 'userId'
  // The `author` object is no longer here because the API does not provide it directly on this nested object.
  // Your SharedPostCard will need to be adapted to handle this structure.
}

interface NewsArticleData {
  _id: string;
  headline: string;
  bannerImage?: string | null;
  source?: string;
}

// --- INTERFACES: Ensure `sharedUser` is included in ApiMessage ---
interface UserData {
  _id: string;
  name: string;
  headline?: string;
  bio?: string;
  profileImage?: string | null;
}

// --- 2. DEFINE the ShowcaseData interface ---
interface ShowcaseData {
  _id: string;
  projectTitle: string;
  tagline?: string | null;
  logo?: string | null;
  bannerImageUrl?: string | null;
  images?: string[] | null;
}

interface ApiMessage {
  _id: string;
  content: string;
  createdAt: string;
  sender?: {
    _id: string; 
    name: string; 
    profileImage?: string 
  };
  readBy: string[];
  conversationId: string;
  sharedPost?: SharedPost;
  sharedNews?: NewsArticleData;
  sharedShowcase?: ShowcaseData;
  sharedUser?: UserData;
  tempId?: string;
}

const DEFAULT_AVATAR_URL = 'https://ui-avatars.com/api/?name=User&background=random';

export default function ConversationScreen() {
  const { id: conversationId, otherUserName, otherUserAvatar } = useLocalSearchParams<{ id: string, otherUserName?: string, otherUserAvatar?: string }>();
  const router = useRouter();
  const { user, token } = useAuthStore();
  
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [messageText, setMessageText] = useState('');
  
  const [conversationStatus, setConversationStatus] = useState<'active' | 'pending' | null>(null);
  const [initiatedBy, setInitiatedBy] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const flatListRef = useRef<FlatList<ApiMessage>>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!conversationId || !token) return;
      setIsLoading(true);
      try {
        const response = await getMessagesForConversation(conversationId, token);
        if (response.success && response.body) {
          setMessages(response.body.messages || []);
          setConversationStatus(response.body.conversationStatus || 'active');
          setInitiatedBy(response.body.initiatedBy || null);
        } else {
          throw new Error(response.message);
        }
      } catch (error: any) {
        Alert.alert("Error", "Could not load this conversation.", [{ text: 'OK', onPress: () => router.back() }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [conversationId, token]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) {
      if (token) socketService.connect(token);
      return;
    }
    const handleNewMessage = (newMessage: ApiMessage) => {
      setMessages(prev => {
        if (prev.some(msg => msg._id === newMessage._id)) return prev;
        return [...prev, newMessage];
      });
    };
    socket.on('newMessage', handleNewMessage);
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [token]);

  // Keyboard listeners for better keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      // Auto-scroll to bottom when keyboard appears
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || !token) return;
    
    const tempId = `optimistic_${Date.now()}`;
    const optimisticMessage: ApiMessage = {
        _id: tempId,
        content: messageText.trim(),
        createdAt: new Date().toISOString(),
        sender: { _id: user!.id, name: user!.name, profileImage: user!.profileImage },
        readBy: [user!.id],
        conversationId,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageText('');
    
    try {
        await sendMessage(conversationId, { content: optimisticMessage.content }, token);
    } catch (error) {
        Alert.alert("Error", "Message could not be sent.");
        setMessages(prev => prev.filter(msg => msg._id !== tempId));
    }
  };

  const handleAccept = async () => {
    if (!token) return;
    try {
      await acceptMessageRequest(conversationId, token);
      setConversationStatus('active');
      Alert.alert("Request Accepted", "You can now chat with this user.");
    } catch (error: any) {
      Alert.alert("Error", `Could not accept the request: ${error.message}`);
    }
  };
  
  const handleReject = () => {
    Alert.alert("Request Rejected", "The conversation has been ignored.", [{ text: "OK", onPress: () => router.back() }]);
  };

  const renderMessageItem = ({ item }: { item: ApiMessage }) => {
    const sentByMe = item.sender?._id === user?.id;

    // console.log(`[RENDER] Processing message ID: ${item._id}. Content:`, item);

    const hasSharedPost = item.sharedPost && item.sharedPost._id;
    const hasSharedNews = item.sharedNews && item.sharedNews._id;
    const hasSharedShowcase = item.sharedShowcase && item.sharedShowcase._id;
    // const hasSharedUser = item.sender && item.sender._id !== user?.id;
    const hasSharedUser = !!item.sharedUser;

     // --- DEBUG LOG ---
    // if (hasSharedUser) {
    //     console.log(`[RENDER] This message IS a shared profile. Data:`, item.sharedUser);
    // }

    // The message sender's info (name, avatar) comes from the parent message object
    const postAuthorInfo = hasSharedPost ? item.sender : null;

    return (
      <View style={[styles.messageBubble, sentByMe ? styles.sentBubble : styles.receivedBubble]}>
        
        {/* Pass both the post data and the author info to the card */}
        {hasSharedPost && <SharedPostCard post={item.sharedPost!} author={postAuthorInfo} />}
        {hasSharedNews && <SharedNewsCard news={item.sharedNews!} />}
        {hasSharedShowcase && <SharedShowcaseCard showcase={item.sharedShowcase!} />}
        {hasSharedUser && <SharedUserCard user={item.sharedUser!} />}

        {/* Conditionally render the text bubble */}
        {!hasSharedPost && !hasSharedNews && !hasSharedShowcase && !hasSharedUser && item.content ? (
          <Text style={styles.messageText}>{item.content}</Text>
        ) : null}
        
        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {sentByMe && (
            <View style={styles.readStatus}>
              {item.readBy.length > 1 ? <CheckCircle2 size={12} color={Colors.dark.success} /> : <Circle size={12} color={Colors.dark.subtext} />}
            </View>
          )}
        </View>
      </View>
    );
  };

  const showRequestFooter = conversationStatus === 'pending' && user?.id !== initiatedBy;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerStyle: { backgroundColor: Colors.dark.background },
          headerShadowVisible: false, 
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Avatar source={otherUserAvatar || undefined} size={36} />
              <Text style={styles.headerName}>{otherUserName}</Text>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20} 
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.messagesContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={Colors.dark.tint} style={{ flex: 1 }} />
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item._id}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                keyboardShouldPersistTaps="handled"
                // ListHeaderComponent={!isSocketConnected ? (<View style={styles.connectionStatus}><Text style={styles.connectionStatusText}>⚠️ Connecting...</Text></View>) : null}
              />
            )}
          </View>
        </TouchableWithoutFeedback>

        {showRequestFooter ? (
          <View style={styles.requestFooter}>
            <Text style={styles.requestFooterText}>Accept message request to chat.</Text>
            <View style={styles.requestButtons}>
              <Button title="Reject" onPress={handleReject} variant="outline" style={{ flex: 1, marginRight: 8 }} />
              <Button title="Accept" onPress={handleAccept} variant="primary" style={{ flex: 1, marginLeft: 8 }} />
            </View>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input} 
              placeholder={conversationStatus === 'pending' ? 'Waiting for user to accept...' : 'Type a message...'}
              placeholderTextColor={Colors.dark.subtext}
              editable={conversationStatus === 'active'}
              value={messageText} 
              onChangeText={setMessageText} 
              multiline 
              onFocus={() => {
                // Scroll to bottom when input is focused
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
            />
            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={handleSendMessage}
              disabled={conversationStatus !== 'active' || !messageText.trim()}
            >
              <Send size={24} color={conversationStatus === 'active' && messageText.trim() ? Colors.dark.tint : Colors.dark.subtext} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  keyboardAvoidingView: { flex: 1 },
  messagesContainer: { flex: 1 },
  messagesList: { 
    paddingHorizontal: 16, 
    paddingBottom: 8, 
    flexGrow: 1,
    paddingTop: 8,
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    paddingHorizontal: 8, 
    paddingVertical: 8, 
    paddingBottom: Platform.OS === 'android' ? 8 : 12,
    borderTopWidth: 1, 
    borderTopColor: Colors.dark.border, 
    backgroundColor: Colors.dark.background,
    minHeight: 56,
  },
  input: { 
    flex: 1, 
    backgroundColor: Colors.dark.card, 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    marginHorizontal: 8, 
    color: Colors.dark.text, 
    maxHeight: 120,
    minHeight: 40,
    fontSize: 16,
    textAlignVertical: 'center',
  },
  sendButton: { 
    padding: 8, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center' },
  headerName: { color: Colors.dark.text, fontSize: 16, fontWeight: '600', marginLeft: 10 },
  backButton: { paddingHorizontal: 16 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8 },
  sentBubble: { alignSelf: 'flex-end', backgroundColor: `${Colors.dark.tint}40` },
  receivedBubble: { alignSelf: 'flex-start', backgroundColor: Colors.dark.card },
  messageText: { color: Colors.dark.text, fontSize: 16 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
  messageTime: { color: Colors.dark.subtext, fontSize: 12, marginRight: 4 },
  readStatus: { marginLeft: 2 },
  connectionStatus: { backgroundColor: Colors.dark.card, padding: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  connectionStatusText: { color: Colors.dark.subtext, fontSize: 12 },
  requestFooter: { 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: Colors.dark.border, 
    backgroundColor: Colors.dark.card,
    minHeight: 80,
  },
  requestFooterText: { color: Colors.dark.text, textAlign: 'center', fontSize: 14, marginBottom: 12 },
  requestButtons: { flexDirection: 'row', justifyContent: 'space-between' },
});
