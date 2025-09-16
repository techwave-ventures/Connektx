// app/messages/index.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { ArrowLeft, Edit } from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button'; 
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { socketService } from '@/services/socketService';
import { getConversations, getMessageRequests, acceptMessageRequest } from '@/api/conversation';
import { getLocalConversations, saveConversations, initDatabase } from '@/services/databaseService';

// This interface should match your backend's conversation object
interface ApiConversation {
  _id: string;
  participants: [{
    _id: string;
    name: string;
    profileImage?: string;
  }];
  lastMessage?: {
    _id: string;
    content: string;
    createdAt: string;
    sender: { _id: string };
    readBy: string[];
  };
  status: 'active' | 'pending';
  createdAt: string;
  updatedAt: string;
  initiatedBy: string; 
}

// A simple TabBar component for the UI
const MessagesTabBar = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => (
  <View style={styles.tabContainer}>
    <TouchableOpacity
      style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
      onPress={() => onTabChange('messages')}
    >
      <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Messages</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
      onPress={() => onTabChange('requests')}
    >
      <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
    </TouchableOpacity>
  </View>
);

export default function MessagesScreen() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [activeTab, setActiveTab] = useState('messages');
  
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [requests, setRequests] = useState<ApiConversation[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Initialize DB on component mount
  useEffect(() => {
    console.log('[DB] Initializing database...');
    initDatabase();
  }, []);

  // --- API Fetching Logic with Local DB and Correct Filtering ---
  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (!token || !user?.id) {
      console.log('[WARN] No token or user ID, aborting fetch.');
      setIsLoading(false);
      return;
    }
    
    if (!isRefresh) setIsLoading(true);
    console.log(`[FETCH] Starting data fetch. Is refresh: ${isRefresh}`);

    try {
        if (!isRefresh) {
            console.log('[DB] Attempting to load conversations from local cache...');
            const localData = await getLocalConversations();
            if (localData.length > 0) {
                const activeConversations = localData.filter(c => c.status === 'active' || (c.status === 'pending' && c.initiatedBy === user.id));
                setConversations(activeConversations);
                console.log(`[DB] Loaded ${localData.length} conversations from cache. Filtered to ${activeConversations.length} for the messages tab.`);
            }
        }

        console.log('[API] Fetching remote conversations and requests...');
        const [convResponse, reqResponse] = await Promise.all([
            getConversations(token),
            getMessageRequests(token)
        ]);
        console.log('[API] Remote data fetch complete.');

        if (convResponse.success) {
            const allConversations = convResponse.body || [];
            console.log(`[API] Received ${allConversations.length} total conversations:`, JSON.stringify(allConversations, null, 2));
            
            const activeAndPendingByMe = allConversations.filter(c => c.status === 'active' || (c.status === 'pending' && c.initiatedBy === user.id));
            setConversations(activeAndPendingByMe);
            console.log(`[FILTER] Filtered to ${activeAndPendingByMe.length} conversations for 'Messages' tab.`);
            
            await saveConversations(allConversations);
            console.log('[DB] Saved all conversations to local cache.');
        }
        if (reqResponse.success) {
            const remoteRequests = reqResponse.body || [];
            setRequests(remoteRequests);
            console.log(`[API] Received and set ${remoteRequests.length} message requests.`);
        }

    } catch (error: any) {
      console.error('--- MSG LIST DEBUG: ❌ ERROR fetching data:', error.message);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      console.log('[FETCH] Data fetch process finished.');
    }
  }, [token, user?.id]);

  const onRefresh = () => {
    console.log('[UI] Pull-to-refresh triggered.');
    setRefreshing(true);
    fetchAllData(true);
  };

  useFocusEffect(
    useCallback(() => {
      console.log('[NAVIGATION] Screen focused, fetching data.');
      fetchAllData();
    }, [fetchAllData])
  );

  // --- Socket Listener for real-time updates ---
  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      console.log('[SOCKET] Setting up real-time listeners.');
      const handleNewData = (event: string) => {
        console.log(`[SOCKET] Event "${event}" received, refetching data.`);
        fetchAllData(true);
      };
      socket.on('newMessage', () => handleNewData('newMessage'));
      socket.on('requestAccepted', () => handleNewData('requestAccepted'));
      return () => {
        console.log('[SOCKET] Cleaning up listeners.');
        socket.off('newMessage');
        socket.off('requestAccepted');
      };
    }
  }, [fetchAllData]);
  
  // --- Accept request handler ---
  const handleAcceptRequest = async (conversationId: string) => {
    console.log(`[ACTION] Accepting request for conversation ID: ${conversationId}`);
    setAcceptingId(conversationId);
    try {
        const response = await acceptMessageRequest(conversationId, token);
        if (response.success) {
            Alert.alert("Request Accepted", "You can now chat with this user.");
            fetchAllData(true);
        } else {
            throw new Error(response.message || "Could not accept request.");
        }
    } catch (error: any) {
        Alert.alert("Error", error.message);
    } finally {
        setAcceptingId(null);
    }
  };

  const handleConversationPress = (item: ApiConversation) => {
    const otherUser = item.participants.find(p => p._id !== user?.id) || item.participants[0];
    if (!otherUser) return;
    console.log(`[NAVIGATION] Navigating to chat with ${otherUser.name}, ID: ${item._id}`);
    router.push({
      pathname: `/messages/${item._id}`,
      params: { otherUserName: otherUser.name, otherUserAvatar: otherUser.profileImage || '' },
    });
  };

  const renderConversationItem = ({ item }: { item: ApiConversation }) => {
    const otherUser = item.participants.find(p => p._id !== user?.id) || item.participants[0];
    if (!otherUser) return null;
    const lastMsg = item.lastMessage;
    const sentByMe = lastMsg?.sender._id === user?.id;
    const isRead = lastMsg ? lastMsg.readBy.includes(user?.id ?? '') : true;

    const isPendingByMe = item.status === 'pending' && item.initiatedBy === user?.id;
    const messageContent = isPendingByMe ? 'Request sent. Waiting for response.' : (lastMsg?.content || 'Conversation started.');

    return (
      <TouchableOpacity onPress={() => handleConversationPress(item)} style={styles.conversationItem}>
        <Avatar source={otherUser.profileImage || ''} size={56} name={otherUser.name} />
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={styles.userName}>{otherUser.name}</Text>
            <Text style={styles.timestamp}>{new Date(lastMsg?.createdAt || item.updatedAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.messageContainer}>
            <Text style={[styles.lastMessage, !isRead && !sentByMe && styles.unreadMessage, isPendingByMe && styles.requestText]} numberOfLines={1}>
              {sentByMe && !isPendingByMe ? 'You: ' : ''}{messageContent}
            </Text>
            {!isRead && !sentByMe && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderRequestItem = ({ item }: { item: ApiConversation }) => {
    const otherUser = item.participants.find(p => p._id !== user?.id) || item.participants[0];
    if (!otherUser) return null;

    return (
      <TouchableOpacity 
        onPress={() => handleConversationPress(item)} 
        style={styles.requestItem}
      >
        <Avatar source={otherUser.profileImage || ''} size={56} name={otherUser.name}/>
        <View style={styles.requestContent}>
          <Text style={styles.userName}>{otherUser.name}</Text>
          <Text style={styles.requestText}>Wants to send you a message.</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: true,
        headerTitle: 'Messages', 
        headerStyle: { backgroundColor: Colors.dark.background, }, 
        headerTitleStyle: { color: Colors.dark.text, fontSize: 18, fontWeight: '600' }, 
        headerTintColor: Colors.dark.text, headerShadowVisible: false, 
        headerLeft: () => (<TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 8 }}><ArrowLeft size={24} color={Colors.dark.text} /></TouchableOpacity>), 
        headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/messages/new')} style={{ paddingHorizontal: 8 }}>
              <Edit size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          )
        }} 
      />
      <MessagesTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      {isLoading && conversations.length === 0 ? (
        <ActivityIndicator size="large" color={Colors.dark.tint} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={activeTab === 'messages' ? conversations : requests}
          keyExtractor={(item) => item._id}
          renderItem={activeTab === 'messages' ? renderConversationItem : renderRequestItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.tint} />}
          ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>{`No ${activeTab} found.`}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.dark.tint },
  tabText: { color: Colors.dark.subtext, fontSize: 16, fontWeight: '500' },
  activeTabText: { color: Colors.dark.text },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: Colors.dark.subtext },
  conversationItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  conversationContent: { marginLeft: 12, flex: 1, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userName: { color: Colors.dark.text, fontSize: 16, fontWeight: '600' },
  timestamp: { color: Colors.dark.subtext, fontSize: 12 },
  messageContainer: { flexDirection: 'row', alignItems: 'center' },
  lastMessage: { color: Colors.dark.subtext, fontSize: 14, flex: 1 },
  unreadMessage: { color: Colors.dark.text, fontWeight: 'bold' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.tint, marginLeft: 8 },
  requestItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  requestContent: { marginLeft: 12, flex: 1 },
  requestText: { color: Colors.dark.subtext, fontSize: 14, marginTop: 4},
  acceptButton: { height: 36, paddingHorizontal: 16 }
});