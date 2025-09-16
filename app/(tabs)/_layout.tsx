// app/(tabs)/_layout.tsx

import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Keyboard } from 'react-native';
import { 
  Home, 
  TrendingUp, 
  Users, 
  Calendar,
  FileText
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import Toast from 'react-native-toast-message';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with the relativeTime plugin
dayjs.extend(relativeTime);

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  const tabBarHeight = Platform.OS === 'ios' 
    ? 84 + insets.bottom 
    : 60 + insets.bottom;
  
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);
  
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.dark.primary,
          tabBarInactiveTintColor: Colors.dark.subtext,
          tabBarStyle: isKeyboardVisible ? {
            display: 'none',
          } : {
            backgroundColor: Colors.dark.cardBackground,
            borderTopColor: Colors.dark.border,
            height: tabBarHeight,
            paddingBottom: (Platform.OS === 'ios' ? 20 : 8) + insets.bottom,
            paddingTop: 8,
            position: 'absolute',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
          tabBarHideOnKeyboard: true,
          headerShown: false,
        }}
      >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: 'Updates',
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: 'Communities',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      {/* Hide the old news and showcase tabs since they're now part of Updates */}
      <Tabs.Screen
        name="news"
        options={{
          href: null, // This hides the tab from navigation
        }}
      />
      <Tabs.Screen
        name="showcase"
        options={{
          href: null, // This hides the tab from navigation
        }}
      />
      </Tabs>
      <Toast />
    </>
  );
}
