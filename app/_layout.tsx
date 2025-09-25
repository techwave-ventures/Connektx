// app/_layout.tsx

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { initDatabase } from "@/services/databaseService";
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/store/auth-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Colors from '@/constants/colors';

import { ErrorBoundary } from "./error-boundary";
import { QueryProvider } from '@/providers/QueryProvider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });


  // This hook will run once when the app's layout is first rendered.
  useEffect(() => {
    const initializeApp = async () => {
        // Initialize the database on app launch
        await initDatabase();
    };

    initializeApp();
  }, []);


  useEffect(() => {
    if (error) {
      
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <SafeAreaProvider>
          <RootLayoutNav />
          <StatusBar 
            style="light" 
            backgroundColor={Colors.dark.background}
            translucent={false}
          />
          <Toast />
        </SafeAreaProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

function useNotificationObserver() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // This function is called when a user taps on a notification
    function handleNotificationClick(response: Notifications.NotificationResponse) {
      const notification = response.notification;
      // The 'data' payload is where our custom backend data lives
      const data = notification.request.content.data as {
        postId?: string | { _id: string };
        senderId?: string | { _id: string };
        notificationType?: 'follow' | 'like' | 'comment' | 'repost' | 'reply';
      };
      
      console.log('🔔 [Push Notification] Notification tapped!');
      console.log('📱 Raw notification data:', JSON.stringify(data, null, 2));
      console.log('📋 Notification type:', data.notificationType);

      try {
        // Navigate based on the data payload
        if (data.notificationType === 'follow') {
          // Handle senderId as either string or object
          const senderId = typeof data.senderId === 'string' 
            ? data.senderId 
            : data.senderId?._id;
            
          console.log('👤 Navigating to profile:', senderId);
          if (senderId) {
            router.push(`/profile/${senderId}`);
          } else {
            console.warn('⚠️ No senderId found for follow notification');
          }
        } else if (data.postId) {
          // Handle postId as either string or object
          const postId = typeof data.postId === 'string' 
            ? data.postId 
            : data.postId?._id;
            
          console.log('📄 Navigating to post:', postId);
          if (postId) {
            router.push(`/post/${postId}`);
          } else {
            console.warn('⚠️ No valid postId found in notification data');
          }
        } else {
          console.warn('⚠️ No navigation target found in notification data');
        }
      } catch (error) {
        console.error('❌ Error handling notification navigation:', error);
      }
    }

    // Listener for when a user taps on a notification while the app is running
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationClick);
    
    // Check if the app was launched from a notification (when the app was closed)
    // Only handle if the response is recent (within last 30 seconds) to avoid old notifications
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (isMounted && response) {
        const notificationTime = response.notification.date;
        const now = Date.now();
        const timeDiff = now - notificationTime;
        
        // Only handle notification if it's recent (within 30 seconds)
        if (timeDiff < 30000) {
          handleNotificationClick(response);
        }
      }
    });

    // Cleanup function to remove listeners
    return () => {
      isMounted = false;
      responseSubscription.remove();
    };
  }, []);
}

function RootLayoutNav() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useNotificationObserver();

  useEffect(() => {
    // Check if the user is authenticated
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!isAuthenticated && !inAuthGroup) {
      // If they're not authenticated and not on an auth page, redirect them to the login page
      router.replace('/login');
    }
  }, [isAuthenticated, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/[userId]" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/followers" options={{ presentation: 'card' }} />
      <Stack.Screen name="profile/following" options={{ presentation: 'card' }} />
      <Stack.Screen name="news/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="showcase/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="event/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="job/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="search/index" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notifications/index" options={{ presentation: 'card' }} />
      <Stack.Screen name="messages/index" options={{ presentation: 'card' }} />
      <Stack.Screen name="messages/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="event/create" options={{ presentation: 'card' }} />
      <Stack.Screen name="event/ticket/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="showcase/create" options={{ presentation: 'card' }} />
    </Stack>
  );
}