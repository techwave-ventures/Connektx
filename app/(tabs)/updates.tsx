// app/(tabs)/updates.tsx

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Newspaper, Briefcase } from 'lucide-react-native';
import Colors from '@/constants/colors';

// Import the original News and Showcase components
import NewsScreen from './news';
import ShowcaseScreen from './showcase';

const { width } = Dimensions.get('window');

export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'news' | 'showcase'>('news');
  
  // Preserve mount state for better performance and state retention
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set(['news']));

  const renderCustomTabNavigation = () => (
    <View style={styles.customTabContainer}>
      <TouchableOpacity
        style={[
          styles.customTab,
          styles.leftTab,
          activeTab === 'news' && styles.activeTab
        ]}
        onPress={() => {
          setActiveTab('news');
          setMountedTabs(prev => new Set(prev).add('news'));
        }}
        activeOpacity={0.7}
      >
        <Newspaper 
          size={20} 
          color={activeTab === 'news' ? '#fff' : Colors.dark.text} 
        />
        <Text 
          style={[
            styles.customTabText,
            activeTab === 'news' && styles.activeTabText
          ]}
        >
          News
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.customTab,
          styles.rightTab,
          activeTab === 'showcase' && styles.activeTab
        ]}
        onPress={() => {
          setActiveTab('showcase');
          setMountedTabs(prev => new Set(prev).add('showcase'));
        }}
        activeOpacity={0.7}
      >
        <Briefcase 
          size={20} 
          color={activeTab === 'showcase' ? '#fff' : Colors.dark.text} 
        />
        <Text 
          style={[
            styles.customTabText,
            activeTab === 'showcase' && styles.activeTabText
          ]}
        >
          Showcase
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    return (
      <>
        {/* Conditionally render both components but show only the active one */}
        <View style={[styles.tabView, activeTab === 'news' ? styles.activeTabView : styles.hiddenTabView]}>
          {mountedTabs.has('news') && <NewsScreen hideHeader />}
        </View>
        <View style={[styles.tabView, activeTab === 'showcase' ? styles.activeTabView : styles.hiddenTabView]}>
          {mountedTabs.has('showcase') && <ShowcaseScreen hideHeader />}
        </View>
      </>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {renderCustomTabNavigation()}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  customTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.dark.background,
  },
  customTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    
    // Shadow for elevation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  leftTab: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 0.5,
  },
  rightTab: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderLeftWidth: 0.5,
  },
  activeTab: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
    
    // Enhanced shadow for active state
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  customTabText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  tabView: {
    flex: 1,
  },
  activeTabView: {
    display: 'flex',
  },
  hiddenTabView: {
    display: 'none',
  },
});
