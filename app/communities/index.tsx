import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  Search,
  Plus,
  Users,
  MapPin,
  Clock,
  TrendingUp,
  Filter,
  Globe,
  Lock,
  Loader,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCommunityStore } from '@/store/community-store';
import { useAuthStore } from '@/store/auth-store';
import { useCommunitySocketIntegration } from '@/hooks/useCommunitySocketIntegration';
import Colors from '@/constants/colors';
import Button from '@/components/ui/Button';
import CommunityCard from '@/components/community/CommunityCard';
import type { Community } from '@/store/community-store';

export default function CommunitiesScreen() {
  const router = useRouter();
  const { 
    communities, 
    joinedCommunities, 
    searchQuery, 
    filterType, 
    setSearchQuery, 
    setFilterType, 
    getFilteredCommunities,
    joinCommunity,
    leaveCommunity,
    initializeCommunities,
    refreshCommunities,
    fetchAllCommunityPosts,
    isLoading,
    error,
    isInitialized
  } = useCommunityStore();
  const { user, token } = useAuthStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Initialize socket integration for real-time updates
  const isSocketConnected = useCommunitySocketIntegration(token || '');

  const filteredCommunities = getFilteredCommunities();

  // Initialize communities on component mount (with or without token)
  useEffect(() => {
    console.log('Communities screen useEffect - token:', !!token, 'isInitialized:', isInitialized);
    if (!isInitialized) {
      console.log('Communities screen: Initializing communities');
      initializeCommunities(token || undefined);
    } else {
      console.log('Communities screen: Already initialized, skipping');
    }
  }, [token, isInitialized]);

  // When token becomes available after initial load, prefetch posts for all communities
  useEffect(() => {
    if (token && isInitialized && communities.length > 0) {
      // Fire-and-forget to avoid blocking UI
      fetchAllCommunityPosts(token).catch((e) => {
        console.warn('Prefetching community posts failed:', e?.message || String(e));
      });
    }
  }, [token, isInitialized, communities.length, fetchAllCommunityPosts]);

  // Show error alert if there's an error
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => useCommunityStore.setState({ error: null }) }
      ]);
    }
  }, [error]);

  const onRefresh = async () => {
    if (!token) return;
    
    setRefreshing(true);
    try {
      await refreshCommunities(token);
    } catch (error) {
      console.error('Failed to refresh communities:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!user || !token) return;
    
    try {
      await joinCommunity(token, communityId);
      // After join, refresh to ensure UI sync
      await refreshCommunities(token);
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes('Already a member')) {
        console.log('ℹ️ Already a member - refreshing list');
        try { await refreshCommunities(token); } catch {}
        return;
      }
      console.error('Failed to join community:', error);
    }
  };

  const handleLeaveCommunity = async (communityId: string) => {
    if (!user || !token) return;
    
    try {
      await leaveCommunity(token, communityId);
      await refreshCommunities(token);
    } catch (error) {
      console.error('Failed to leave community:', error);
    }
  };

  const isUserMember = (c: Community) => {
    if (!user) return false;
    const inJoined = joinedCommunities.some(jc => jc.communityId === c.id);
    const inMembers = Array.isArray(c.members) && c.members.includes(user.id);
    const inAdmins = Array.isArray(c.admins) && c.admins.includes(user.id);
    const inMods = Array.isArray(c.moderators) && c.moderators.includes(user.id);
    const isOwner = c.owner === user.id || (c as any).createdBy === user.id;
    return inJoined || inMembers || inAdmins || inMods || isOwner;
  };

  const renderCommunityCard = ({ item: community }: { item: Community }) => (
    <CommunityCard
      community={community}
      isJoined={isUserMember(community)}
      onJoin={() => handleJoinCommunity(community.id)}
      onLeave={() => handleLeaveCommunity(community.id)}
    />
  );

  const renderFilterChip = (type: string, label: string, icon: React.ReactNode) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        filterType === type && styles.filterChipActive
      ]}
      onPress={() => setFilterType(type as any)}
    >
      {icon}
      <Text
        style={[
          styles.filterChipText,
          filterType === type && styles.filterChipTextActive
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Communities',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
          headerRight: () => (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/community/create')}
            >
              <Plus size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.dark.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search communities..."
            placeholderTextColor={Colors.dark.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {renderFilterChip('all', 'All', <Globe size={16} color={filterType === 'all' ? Colors.dark.tint : Colors.dark.subtext} />)}
          {renderFilterChip('trending', 'Trending', <TrendingUp size={16} color={filterType === 'trending' ? Colors.dark.tint : Colors.dark.subtext} />)}
          {renderFilterChip('nearby', 'Nearby', <MapPin size={16} color={filterType === 'nearby' ? Colors.dark.tint : Colors.dark.subtext} />)}
          {renderFilterChip('joined', 'Joined', <Users size={16} color={filterType === 'joined' ? Colors.dark.tint : Colors.dark.subtext} />)}
        </ScrollView>
      )}

      {isLoading && communities.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Loader size={32} color={Colors.dark.tint} />
          <Text style={styles.loadingText}>Loading communities...</Text>
          {isSocketConnected && (
            <Text style={styles.socketStatus}>Connected to real-time updates</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCommunities.filter((c: any) => c && c.id)}
          renderItem={renderCommunityCard}
          keyExtractor={(item: Community, index) => (item?.id ?? `community-${index}`)}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isLoading}
              onRefresh={onRefresh}
              tintColor={Colors.dark.tint}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={Colors.dark.subtext} />
              <Text style={styles.emptyTitle}>
                {!isInitialized 
                  ? 'Loading communities...' 
                  : 'No communities found'
                }
              </Text>
              <Text style={styles.emptyDescription}>
                {!isInitialized 
                  ? 'Fetching communities from server'
                  : searchQuery 
                    ? 'Try adjusting your search or filters'
                    : 'Be the first to create a community!'
                }
              </Text>
              {isInitialized && !searchQuery && (
                <Button
                  title="Create Community"
                  onPress={() => router.push('/community/create')}
                  style={styles.emptyButton}
                />
              )}
              {isSocketConnected && (
                <Text style={styles.socketStatus}>Real-time updates enabled</Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  createButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 16,
  },
  filterButton: {
    padding: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filtersContent: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: `${Colors.dark.tint}20`,
  },
  filterChipText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.dark.tint,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  socketStatus: {
    color: Colors.dark.success || Colors.dark.tint,
    fontSize: 12,
    marginTop: 8,
    fontWeight: '400',
  },
});
