import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Repeat,
  Bell
} from 'lucide-react-native';
import Avatar from '@/components/ui/Avatar';
import Colors from '@/constants/colors';
import { useNotificationStore, Notification } from '@/store/notification-store';

export default function NotificationsScreen() {
  const router = useRouter();
  // Get state and actions from the Zustand store
  const { notifications, isLoading, fetchNotifications, markAsRead } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications when the component mounts
  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
  };

  const handleNotificationPress = (notification: Notification) => {
    console.log('📱 [In-App Notification] Notification pressed!');
    console.log('📋 Notification type:', notification.type);
    console.log('📄 Raw notification data:', JSON.stringify({
      id: notification._id,
      type: notification.type,
      postId: notification.postId,
      senderId: notification.sender?._id,
      message: notification.message
    }, null, 2));

    // Mark as read via the store
    if (!notification.read) {
        markAsRead(notification._id);
    }
    
    try {
      // Navigate based on notification type
      switch (notification.type) {
        case 'like':
        case 'comment':
        case 'reply':
        case 'repost':
          // Handle postId as either string or object
          const postId = typeof notification.postId === 'string'
            ? notification.postId
            : notification.postId?._id;
            
          console.log('📄 Navigating to post:', postId);
          if (postId) {
            router.push(`/post/${postId}`);
          } else {
            console.warn('⚠️ No valid postId found for notification:', notification.type);
            console.warn('⚠️ PostId structure:', notification.postId);
          }
          break;
          
        case 'follow':
          const senderId = typeof notification.sender === 'string'
            ? notification.sender
            : notification.sender?._id;
            
          console.log('👤 Navigating to profile:', senderId);
          if (senderId) {
            router.push(`/profile/${senderId}`);
          } else {
            console.warn('⚠️ No valid senderId found for follow notification');
            console.warn('⚠️ Sender structure:', notification.sender);
          }
          break;
          
        default:
          console.warn('⚠️ Unknown notification type:', notification.type);
          break;
      }
    } catch (error) {
      console.error('❌ Error navigating from notification:', error);
      console.error('❌ Failed notification data:', notification);
    }
  };

  // Map backend types to icons
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'like':
        return <Heart size={20} color={Colors.dark.error} />;
      case 'comment':
      case 'reply':
        return <MessageCircle size={20} color={Colors.dark.tint} />;
      case 'follow':
        return <UserPlus size={20} color={Colors.dark.success} />;
      case 'repost':
        return <Repeat size={20} color={Colors.dark.info} />;
      default:
        return <Bell size={20} color={Colors.dark.tint} />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIconContainer}>
        {getNotificationIcon(item.type)}
      </View>
      
      <Avatar source={item.sender?.profileImage || ''} size={50} />
      
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText} numberOfLines={2}>
          <Text style={styles.userName}>{item.sender?.name || 'Someone'}</Text> {item.message.replace(item.sender?.name || '', '').trim()}
        </Text>
        <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
      </View>
      
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: 'Notifications',
          headerTitleStyle: {
            color: Colors.dark.text,
            fontSize: 18,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: Colors.dark.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: Colors.dark.border,
          },
          headerTintColor: Colors.dark.text,
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      {isLoading && !refreshing && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.dark.tint} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.dark.tint}
            />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Bell size={60} color={Colors.dark.subtext} style={styles.emptyIcon} />
                <Text style={styles.emptyText}>No notifications yet</Text>
                <Text style={styles.emptySubtext}>When you get notifications, they'll show up here.</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: `${Colors.dark.tint}1A`, // A bit more subtle than 10
    borderColor: `${Colors.dark.tint}40`,
    borderWidth: 1,
  },
  notificationIconContainer: {
    position: 'absolute',
    bottom: 8,
    left: 40,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: Colors.dark.background,
  },
  notificationContent: {
    marginLeft: 12,
    flex: 1,
  },
  notificationText: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
  },
  userName: {
    fontWeight: '600',
  },
  timestamp: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.tint,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    opacity: 0.7,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: Colors.dark.subtext,
    textAlign: 'center',
  },
});
