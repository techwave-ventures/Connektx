import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Crown,
  Shield,
  User,
  MoreVertical,
} from 'lucide-react-native';
import { useCommunityStore } from '@/store/community-store';
import { useAuthStore } from '@/store/auth-store';
import { getCommunityMembers } from '@/api/community';
import Colors from '@/constants/colors';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

interface Member {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  joinedAt: string;
  bio?: string;
  userId?: string;
}

export default function CommunityMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { communities } = useCommunityStore();
  const { user, token } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const community = communities.find(c => c.id === id);

  const fetchCommunityMembers = async () => {
    console.log('🚀 [Members Screen] Starting fetchCommunityMembers...');
    console.log('  Community ID:', id);
    console.log('  Token exists:', !!token);
    console.log('  Token length:', token?.length);
    console.log('  Community found in store:', !!community);
    
    if (!id || !token) {
      console.error('❌ Missing requirements:', { id: !!id, token: !!token });
      setError('Authentication required or community not found');
      setLoading(false);
      return;
    }

    try {
      console.log('📡 Starting API call to getCommunityMembers...');
      setLoading(true);
      setError(null);
      
      const startTime = Date.now();
      const response = await getCommunityMembers(token, id);
      const endTime = Date.now();
      
      console.log('📊 API Response received:', {
        duration: endTime - startTime,
        responseExists: !!response,
        hasSuccess: response?.success,
        hasMembers: !!response?.members,
        membersCount: response?.members?.length || 0,
        responseKeys: response ? Object.keys(response) : []
      });
      
      if (response.success && response.members) {
        console.log('✅ Processing member data...');
        console.log('Raw members data:', JSON.stringify(response.members, null, 2));
        
        // Map API response to our Member interface
        const mappedMembers: Member[] = response.members.map((member: any, index: number) => {
          const memberId = member.id || member._id || member.userId;
          
          console.log(`  Processing member ${index + 1}:`, {
            rawMember: member,
            extractedId: memberId,
            extractedName: member.name || member.username || 'Unknown User'
          });
          
          // Determine the actual role
          let actualRole = member.role || 'member';
          
          // Check if this member is the community owner
          if (community && (
            community.createdBy === memberId || 
            community.ownerId === memberId ||
            (community.admins && community.admins.includes(memberId) && community.createdBy === memberId)
          )) {
            actualRole = 'owner';
          }
          
          console.log(`  Member ${member.name}: role=${member.role}, actualRole=${actualRole}`);
          
          return {
            id: memberId,
            name: member.name || member.username || 'Unknown User',
            avatar: member.avatar || member.profilePicture,
            role: actualRole,
            joinedAt: member.joinedAt || member.createdAt || new Date().toISOString(),
            bio: member.bio || member.description,
            userId: member.userId || member.id || member._id
          };
        });
        
        console.log('✅ Mapped members:', mappedMembers);
        setMembers(mappedMembers);
        console.log('✅ Members state updated!');
      } else {
        console.warn('⚠️ No valid member data in response:', {
          success: response?.success,
          hasMembers: !!response?.members,
          response: response
        });
        setMembers([]);
      }
    } catch (err: any) {
      console.error('❌ API call failed:');
      console.error('  Error type:', typeof err);
      console.error('  Error name:', err?.name);
      console.error('  Error message:', err?.message);
      console.error('  Error stack:', err?.stack);
      console.error('  Full error:', err);
      setError(err.message || 'Failed to load community members');
    } finally {
      console.log('🏁 fetchCommunityMembers completed, setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityMembers();
  }, [id, token]);
  
  if (!community) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Members',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Community not found</Text>
        </View>
      </View>
    );
  }

  // Filter members based on search query
  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.bio && member.bio.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} color={Colors.dark.primary} />;
      case 'admin':
        return <Crown size={16} color={Colors.dark.warning} />;
      case 'moderator':
        return <Shield size={16} color={Colors.dark.tint} />;
      default:
        return <User size={16} color={Colors.dark.subtext} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return Colors.dark.primary;
      case 'admin':
        return Colors.dark.warning;
      case 'moderator':
        return Colors.dark.tint;
      default:
        return Colors.dark.subtext;
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  const renderMember = ({ item: member }: { item: Member }) => (
    <TouchableOpacity style={styles.memberCard}>
      <Avatar source={member.avatar} name={member.name} size={50} />
      
      <View style={styles.memberInfo}>
        <View style={styles.memberHeader}>
          <Text style={styles.memberName}>{member.name}</Text>
          <View style={styles.memberRole}>
            {getRoleIcon(member.role)}
            <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
              {member.role}
            </Text>
          </View>
        </View>
        
        <Text style={styles.memberBio} numberOfLines={1}>
          {member.bio}
        </Text>
        
        <Text style={styles.joinDate}>
          Joined {formatJoinDate(member.joinedAt)}
        </Text>
      </View>
      
      <TouchableOpacity style={styles.moreButton}>
        <MoreVertical size={20} color={Colors.dark.subtext} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Badge label={count.toString()} variant="secondary" size="small" />
    </View>
  );

  const owners = filteredMembers.filter(m => m.role === 'owner');
  const admins = filteredMembers.filter(m => m.role === 'admin');
  const moderators = filteredMembers.filter(m => m.role === 'moderator');
  const regularMembers = filteredMembers.filter(m => m.role === 'member');

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Members',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.tint} />
          <Text style={styles.loadingText}>Loading members...</Text>
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>Debug Info:</Text>
            <Text style={styles.debugText}>Community ID: {id}</Text>
            <Text style={styles.debugText}>Token Length: {token?.length || 0}</Text>
            <Text style={styles.debugText}>Community Found: {community ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Members',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={fetchCommunityMembers}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: `Members (${members.length})`,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={Colors.dark.subtext} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor={Colors.dark.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {filteredMembers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {members.length === 0 ? 'No members found' : 'No members match your search'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={[
            { type: 'section', title: 'Owners', data: owners },
            { type: 'section', title: 'Admins', data: admins },
            { type: 'section', title: 'Moderators', data: moderators },
            { type: 'section', title: 'Members', data: regularMembers },
          ]}
          renderItem={({ item }) => {
            if (item.type === 'section') {
              return (
                <View>
                  {item.data.length > 0 && renderSectionHeader(item.title, item.data.length)}
                  {item.data.map((member) => (
                    <View key={member.id}>
                      {renderMember({ item: member })}
                    </View>
                  ))}
                </View>
              );
            }
            return null;
          }}
          keyExtractor={(item, index) => `section-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
  backButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  emptyText: {
    color: Colors.dark.subtext,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.dark.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: Colors.dark.background,
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
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
  listContainer: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  memberBio: {
    color: Colors.dark.text,
    fontSize: 14,
    marginBottom: 4,
  },
  joinDate: {
    color: Colors.dark.subtext,
    fontSize: 12,
  },
  moreButton: {
    padding: 8,
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    alignSelf: 'stretch',
    marginHorizontal: 20,
  },
  debugText: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginBottom: 4,
  },
});
