// app/messages/new.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import { getConnections, findOrCreateConversation } from '@/api/conversation';
import { User } from '@/types';

export default function NewConversationScreen() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [connections, setConnections] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      if (!token) return;
      try {
        setIsLoading(true);
        const response = await getConnections(token);
        if (response.success) {
          const uniqueUsers = Array.from(
            new Map(response.body.map(item => [item._id, item])).values()
          );
          setConnections(uniqueUsers);
        }
      } catch (error) {
        console.error('Failed to fetch connections:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConnections();
  }, [token]);

  const filteredConnections = useMemo(() => {
    if (!searchQuery) return connections;
    return connections.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, connections]);

  const handleStartChat = async (recipient: User) => {
    if (!token || isCreating) return;
    setIsCreating(recipient._id);

    try {
      const response = await findOrCreateConversation(recipient._id, token);
      if (response.success) {
        const conversation = response.body;
        router.replace({
          pathname: `/messages/${conversation._id}`,
          params: {
            otherUserName: recipient.name,
            otherUserAvatar: recipient.profileImage || '',
          },
        });
      } else {
        throw new Error(response.message || 'Failed to create or find conversation');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      setIsCreating(null);
    }
  };

  const renderConnectionItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleStartChat(item)}
      disabled={isCreating === item._id}
    >
      <Avatar source={item.profileImage || ''} size={50} name={item.name || ''} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userHeadline} numberOfLines={1}>
          {item.headline || 'No headline'}
        </Text>
      </View>
      {isCreating === item._id && <ActivityIndicator color={Colors.dark.tint} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'New Conversation',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTitleStyle: { color: Colors.dark.text },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 8 }}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
          headerShadowVisible: false,
        }}
      />

      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.dark.subtext} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your connections..."
          placeholderTextColor={Colors.dark.subtext}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.dark.tint} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredConnections}
          keyExtractor={item => item._id}
          renderItem={renderConnectionItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No connections found.</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different name.'
                  : 'Connect with people to see them here.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 44,
    color: Colors.dark.text,
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  userInfo: { marginLeft: 12, flex: 1 },
  userName: { color: Colors.dark.text, fontSize: 16, fontWeight: '600' },
  userHeadline: { color: Colors.dark.subtext, fontSize: 14, marginTop: 2 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: { color: Colors.dark.text, fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: Colors.dark.subtext, marginTop: 8, textAlign: 'center' },
});