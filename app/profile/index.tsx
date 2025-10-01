// app/profile/index.tsx

import React, { useState, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import {
  Edit2,
  MapPin,
  Briefcase,
  GraduationCap,
  Settings,
  Calendar,
  BarChart2,
  Plus,
  Share2
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import TabBar from '@/components/ui/TabBar';
import { useAuthStore } from '@/store/auth-store';
import { usePortfolioStore } from '@/store/portfolio-store';
import { useShowcaseStore } from '@/store/showcase-store';
import PostCard from '@/components/home/PostCard';
import CommunityCard from '@/components/home/CommunityCard';
import ShowcaseCard from '@/components/showcase/ShowcaseCard';
import PortfolioGrid from '@/components/portfolio/PortfolioGrid';
import { 
  ProfileHeaderSkeleton, 
  ProfileContentSkeleton, 
  PostCardSkeleton, 
  RepliesLoadingSkeleton,
  ShowcaseLoadingSkeleton,
  PortfolioGridLoadingSkeleton,
  SkeletonLoader 
} from '@/components/ui/SkeletonLoader';
import Colors from '@/constants/colors';
import Avatar from '@/components/ui/Avatar';
import useProfileData from '@/hooks/useProfileData';
import { useUserCommentsStore } from '@/store/user-comments-store';
import UserReply from '@/components/ui/UserReply';

export default function ProfileScreen() {
  const router = useRouter();
  const { user: currentUser, token, logout } = useAuthStore();
  const { deletePortfolioItem } = usePortfolioStore();
  const { deleteEntryApi, fetchEntries, entries: allShowcases } = useShowcaseStore();
  const { userComments, isLoading: commentsLoading, fetchUserComments, refreshUserComments } = useUserCommentsStore();
  const [activeTab, setActiveTab] = useState('about');
  
  // Use optimized profile data hook
  const {
    user,
    posts: userPosts,
    showcases: userShowcases, 
    portfolioItems: userPortfolioItems,
    loading,
    refreshing,
    refresh,
    smartRefresh,
    isCacheExpired,
    lastUpdated,
  } = useProfileData({
    userId: currentUser?.id || '',
    isOwnProfile: true,
    enableAutoRefresh: false, // Temporarily disable to isolate issue
    cacheTimeout: 2 * 60 * 1000, // 2 minutes for own profile
  });
  
  // Use current user or fetched user data
  const displayUser = user || currentUser;
  
  // Prefetch posts when switching to Posts tab for faster display
  React.useEffect(() => {
    if (activeTab === 'posts') {
      // Force smart refresh if cache is empty/expired or still loading
      if (loading || isCacheExpired || !lastUpdated) {
        smartRefresh(true);
      }
    }
  }, [activeTab, loading, isCacheExpired, lastUpdated, smartRefresh]);
  
  // Get user's showcases from the store for real-time updates
  const realTimeUserShowcases = React.useMemo(() => {
    if (!displayUser?.id) return [];
    
    const filtered = allShowcases.filter(showcase => {
      const showcaseUserId = showcase.user?.id || showcase.user?._id;
      return showcaseUserId === displayUser.id;
    });
    
    return filtered;
  }, [allShowcases, displayUser?.id]);

  // Smart focus effect - only refresh when needed (use ref to avoid dependency issues)
  const smartRefreshRef = useRef(smartRefresh);
  smartRefreshRef.current = smartRefresh;
  
  useFocusEffect(
    useCallback(() => {
      // Fetch showcases when profile is focused
      fetchEntries();
      // Prefetch replies in background so Replies tab feels instant
      if (currentUser?.id) {
        fetchUserComments(currentUser.id);
      }
      // Use ref to call the latest version without creating dependency loop
      smartRefreshRef.current();
    }, [fetchEntries, currentUser?.id, fetchUserComments])
  );
  
  // Fetch showcases when ideas tab is active
  React.useEffect(() => {
    if (activeTab === 'ideas') {
      fetchEntries();
    }
  }, [activeTab, fetchEntries]);

  // Fetch user comments when replies tab is active
  React.useEffect(() => {
    if (activeTab === 'replies' && currentUser?.id) {
      fetchUserComments(currentUser.id);
    }
  }, [activeTab, currentUser?.id, fetchUserComments]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleEditProfile =  () => {
    router.push('/profile/edit');
  };

  const handleSettings = () => {
    router.push('/settings' as any);
  };

  const [expanded, setExpanded] = useState(false);


  const handleShare = () => {
    Alert.alert('Share Profile', 'Share your profile with others');
  };

  const handleDeleteShowcase = async (showcase: any) => {
    Alert.alert(
      'Delete Showcase',
      'Are you sure you want to delete this showcase? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteEntryApi(showcase.id);
              if (success) {
                // Refresh the profile data to update the showcase list
                smartRefresh();
                Alert.alert('Success', 'Showcase deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete showcase. Please try again.');
              }
            } catch (error) {
              console.error('Failed to delete showcase:', error);
              Alert.alert('Error', 'Failed to delete showcase. Please try again.');
            }
          }
        }
      ]
    );
  };
  // Only show login prompt if we've finished loading and have no user data at all
  if (!loading && !displayUser) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'My Profile',
            headerStyle: { backgroundColor: Colors.dark.background },
            headerTintColor: Colors.dark.text,
            headerTitleStyle: { color: Colors.dark.text, fontWeight: '600' },
            headerShadowVisible: false,
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please log in to view your profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'about':
        return (
          <View style={styles.tabContent}>
            {/* Profile Summary Section */}
            <View style={styles.aboutSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.aboutSectionTitle}>Profile Summary</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleEditProfile}>
                        <Plus size={20} color={Colors.dark.primary} />
                    </TouchableOpacity>
                </View>
                {user?.bio ? (
  <View>
    <Text
      style={styles.summaryText}
      numberOfLines={expanded ? undefined : 3}   // show 3 lines by default
      ellipsizeMode="tail"
    >
      {user.bio}
    </Text>

    {user.bio.length > 100 && ( // only show if bio is long enough
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <Text style={styles.seeMoreText}>
          {expanded ? "See less" : "See more"}
        </Text>
      </TouchableOpacity>
    )}
  </View>
) : (
  <View style={styles.emptySection}>
    <Text style={styles.emptySectionText}>
      {"Add your profile summary"}
    </Text>
  </View>
)}

            </View>
            {/* Experience Section */}
            <View style={styles.aboutSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.aboutSectionTitle}>Experience</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleEditProfile}>
                        <Plus size={20} color={Colors.dark.primary} />
                    </TouchableOpacity>
                </View>
                {displayUser.experience && displayUser.experience.length > 0 ? (
                    displayUser.experience.map((exp: any, index: number) => (
                        <View key={exp.id || index} style={styles.experienceItem}>
                          <Briefcase size={20} color={Colors.dark.tint} />
                          <View style={styles.experienceContent}>
                            <Text style={styles.experienceRole}>{exp.position}</Text>
                            <Text style={styles.experienceCompany}>{exp.company}</Text>
                            <Text style={styles.experienceDuration}>
                              {exp.startDate?.substring(0,10) || 'Start'} - {exp.current ? 'Present' : (exp.endDate?.substring(0,10) || 'End')}
                            </Text>
                            {exp.description && (
                              <Text style={styles.experienceDescription}>{exp.description}</Text>
                            )}
                          </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptySection}>
                        <Text style={styles.emptySectionText}>Add your work experience</Text>
                    </View>
                )}
            </View>
            {/* Education Section */}
            <View style={styles.aboutSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.aboutSectionTitle}>Education</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleEditProfile}>
                        <Plus size={20} color={Colors.dark.primary} />
                    </TouchableOpacity>
                </View>
                {displayUser.education && displayUser.education.length > 0 ? (
                    displayUser.education.map((edu: any, index: number) => (
                        <View key={edu.id || index} style={styles.educationItem}>
                          <GraduationCap size={20} color={Colors.dark.tint} />
                          <View style={styles.educationContent}>
                            <Text style={styles.educationDegree}>
                              {edu.degree} {edu.field ? `in ${edu.field}` : ''}
                            </Text>
                            <Text style={styles.educationInstitution}>{edu.name}</Text>
                            <Text style={styles.educationYears}>
                              {edu?.startDate?.substring(0,10) || 'Start'} - {edu.current ? 'Present' : (edu?.endDate?.substring(0,10) || 'End')}
                            </Text>
                          </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptySection}>
                        <Text style={styles.emptySectionText}>Add your education</Text>
                    </View>
                )}
            </View>
            {/* Skills Section */}
            <View style={styles.aboutSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.aboutSectionTitle}>Skills</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleEditProfile}>
                        <Plus size={20} color={Colors.dark.primary} />
                    </TouchableOpacity>
                </View>
                {displayUser.skills && displayUser.skills.length > 0 ? (
                    <View style={styles.skillsContainer}>
                        {displayUser.skills.map((skill: string, index: number) => (
                            <View key={index} style={styles.skillChip}>
                                <Text style={styles.skillText}>{skill}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptySection}>
                        <Text style={styles.emptySectionText}>Add your skills</Text>
                    </View>
                )}
            </View>
            {/* Contact Information Section */}
            {(displayUser?.phone || displayUser?.email || displayUser?.website) && (
              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>Contact Information</Text>
                {displayUser.email && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactText}>{displayUser.email}</Text>
                  </View>
                )}
                {displayUser.phone && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactText}>{displayUser.phone}</Text>
                  </View>
                )}
                {displayUser.website && (
                  <View style={styles.contactItem}>
                    <Text style={styles.contactText}>{displayUser.website}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      case 'portfolio':
        return (
          <View style={styles.tabContent}>
            {loading && !displayUser && userPortfolioItems.length === 0 ? (
              <PortfolioGridLoadingSkeleton count={6} />
            ) : (
              <PortfolioGrid
                items={userPortfolioItems}
                onItemPress={(item) => {
                  // Open the portfolio link
                  if (item.links && item.links.length > 0 && item.links[0].url) {
                    const url = item.links[0].url;
                    // Check if URL has protocol, if not add https://
                    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
                    
                    import('expo-linking').then(({ openURL }) => {
                      openURL(formattedUrl).catch(() => {
                        Alert.alert('Error', 'Could not open the portfolio link');
                      });
                    });
                  } else {
                    Alert.alert('No Link', 'This portfolio item does not have a link');
                  }
                }}
                onCreatePress={() => router.push('/portfolio/create')}
                onEditItem={(item) => router.push({ pathname: '/portfolio/create', params: { editItem: JSON.stringify(item) } })}
                onDeleteItem={async (item) => {
                  if (token) {
                    const success = await deletePortfolioItem(token, item.id);
                    if (!success) {
                      Alert.alert('Error', 'Failed to delete portfolio item');
                    }
                  }
                }}
              />
            )}
          </View>
        );
      case 'ideas':
        const showcasesToShow = realTimeUserShowcases.length > 0 ? realTimeUserShowcases : userShowcases;
        
        return (
            <View style={styles.tabContent}>
                {loading && !displayUser && showcasesToShow.length === 0 ? (
                    <ShowcaseLoadingSkeleton count={3} />
                ) : showcasesToShow.length > 0 ? (
                    showcasesToShow.map(showcase =>
                        <ShowcaseCard 
                          key={showcase.id} 
                          entry={showcase} 
                          onPress={() => router.push(`/showcase/${showcase.id}`)} 
                          onDelete={handleDeleteShowcase}
                          showOwnerActions={true}
                        />
                    )
                ) : (
                    <View style={styles.emptyStateContainer}><Text style={styles.emptyStateText}>You have no ideas yet.</Text></View>
                )}
            </View>
        );
      case 'posts':
        return (
          <View style={styles.tabContent}>
            {loading && !displayUser && userPosts.length === 0 ? (
              <View>
                {Array.from({ length: 4 }).map((_, index) => (
                  <PostCardSkeleton key={index} showImages={Math.random() > 0.6} />
                ))}
              </View>
            ) : userPosts.length > 0 ? (
              <FlatList
                data={userPosts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <PostCard
                    post={item}
                    onPress={() => router.push(`/post/${item.id}`)}
                  />
                )}
                initialNumToRender={6}
                maxToRenderPerBatch={8}
                windowSize={7}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={{ paddingBottom: 16 }}
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>You have no posts yet.</Text>
              </View>
            )}
          </View>
        );
      case 'replies':
          return (
              <View style={styles.repliesTabContent}>
                  {commentsLoading ? (
                      <RepliesLoadingSkeleton count={6} />
                  ) : userComments.length > 0 ? (
                      <View style={styles.repliesContainer}>
                          {userComments.map((comment) => (
                              <UserReply
                                  key={comment.id || comment._id}
                                  comment={comment}
                                  onPress={() => {
                                      if (comment.post?._id) {
                                          router.push(`/post/${comment.post._id}`);
                                      }
                                  }}
                              />
                          ))}
                      </View>
                  ) : (
                      <View style={styles.emptyStateContainer}>
                          <Text style={styles.emptyStateText}>You haven't replied to any posts yet</Text>
                          <Button
                              title="Explore Posts"
                              onPress={() => router.push('/(tabs)')}
                              style={styles.emptyStateButton}
                          />
                      </View>
                  )}
              </View>
          );
      default:
        return null;
    }
  };

  const renderHeaderForList = () => (
    <>
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {!displayUser ? (
            <SkeletonLoader width={80} height={80} borderRadius={40} />
          ) : (
            <Avatar source={displayUser.profileImage} name={displayUser.name} size={80} showBorder />
          )}
        </View>
        <View style={styles.profileInfo}>
          <View style={styles.nameContainer}>
            {!displayUser ? (
              <SkeletonLoader width={150} height={18} style={{ marginBottom: 6 }} />
            ) : (
              <>
                <Text style={styles.userName}>{displayUser.name}</Text>
                <TouchableOpacity onPress={handleEditProfile}><Edit2 size={16} color={Colors.dark.subtext} /></TouchableOpacity>
              </>
            )}
          </View>
          {!displayUser ? (
            <>
              <SkeletonLoader width={200} height={14} style={{ marginBottom: 8 }} />
              <SkeletonLoader width={120} height={12} />
            </>
          ) : (
            <>
              <Text style={styles.userBio}>{displayUser.headline || "Add a headline to your profile!"}</Text>
              <View style={styles.metadataContainer}>
                {displayUser.location && <View style={styles.locationContainer}><MapPin size={14} color={Colors.dark.subtext} /><Text style={styles.locationText}>{displayUser.location}</Text></View>}
                {displayUser.joinedDate && <View style={styles.joinedContainer}><Calendar size={14} color={Colors.dark.subtext} /><Text style={styles.joinedText}>Joined {new Date(displayUser.joinedDate).toLocaleDateString()}</Text></View>}
              </View>
            </>
          )}
        </View>
      </View>
      <View style={styles.actionButtonsContainer}>
        <View style={styles.profileViewsCard}>
          {!displayUser ? (
            <>
              <SkeletonLoader width={20} height={20} borderRadius={10} style={{ marginBottom: 4 }} />
              <SkeletonLoader width={30} height={18} style={{ marginBottom: 4 }} />
              <SkeletonLoader width={60} height={12} />
            </>
          ) : (
            <>
              <BarChart2 size={20} color={Colors.dark.text} />
              <Text style={styles.profileViewsNumber}>{displayUser.profileViews || 0}</Text>
              <Text style={styles.profileViewsText}>Profile Views</Text>
            </>
          )}
        </View>
        <View style={styles.actionButtons}>
          {!displayUser ? (
            <SkeletonLoader width="100%" height={44} borderRadius={12} />
          ) : (
            <View style={styles.followStatsContainer}>
              <TouchableOpacity style={styles.followStatButton} onPress={() => router.push('/profile/followers')}>
                <Text style={styles.followStatNumber}>{displayUser.followers || 0}</Text>
                <Text style={styles.followStatLabel}>Followers</Text>
              </TouchableOpacity>
              <View style={styles.followStatDivider} />
              <TouchableOpacity style={styles.followStatButton} onPress={() => router.push('/profile/following')}>
                <Text style={styles.followStatNumber}>{displayUser.following || 0}</Text>
                <Text style={styles.followStatLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      {!displayUser ? (
        <View style={styles.tabBarSkeleton}>
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonLoader 
              key={index} 
              width={60} 
              height={32} 
              borderRadius={16} 
              style={{ marginRight: 12 }} 
            />
          ))}
        </View>
      ) : (
        <TabBar
          tabs={[{ id: 'about', label: 'About' }, { id: 'portfolio', label: 'Portfolio' }, { id: 'posts', label: 'Posts' }, { id: 'replies', label: 'Replies' }, { id: 'ideas', label: 'Ideas' }]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          scrollable
          style={styles.tabBar}
        />
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'My Profile',
          headerStyle: {
            backgroundColor: Colors.dark.background,
          },
          headerTintColor: Colors.dark.text,
          headerTitleStyle: {
            color: Colors.dark.text,
            fontWeight: '600',
          },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={handleShare} style={[styles.headerButton, { marginRight: 8 }]}><Share2 size={22} color={Colors.dark.text} /></TouchableOpacity>
              <TouchableOpacity onPress={handleSettings} style={styles.headerButton}><Settings size={22} color={Colors.dark.text} /></TouchableOpacity>
            </View>
          ),
        }}
      />
      {activeTab === 'posts' ? (
        <FlatList
          data={userPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const shouldUseCommunityCard = item?.type === 'community' || item?.type === 'question' ||
              (item?.community && (item.community.id || item.community.name));
            return shouldUseCommunityCard ? (
              <CommunityCard post={item} />
            ) : (
              <PostCard
                post={item}
                onPress={() => router.push(`/post/${item.id}`)}
              />
            );
          }}
          ListHeaderComponent={renderHeaderForList}
          ListEmptyComponent={() => (
            <View style={styles.emptyStateContainer}>
              {loading ? (
                <PostCardSkeleton showImages={false} />
              ) : (
                <Text style={styles.emptyStateText}>You have no posts yet.</Text>
              )}
            </View>
          )}
          refreshing={refreshing}
          onRefresh={refresh}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.dark.tint} />}
        >
          {renderHeaderForList()}
          {renderTabContent()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  headerButton: { padding: 8, marginRight: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: Colors.dark.text, fontSize: 16, marginTop: 10 },
  scrollView: { flex: 1 },
  profileSection: { padding: 16, flexDirection: 'row', alignItems: 'flex-start' },
  avatarContainer: { position: 'relative', marginRight: 16 },
  profileInfo: { flex: 1 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  userName: { color: Colors.dark.text, fontSize: 22, fontWeight: 'bold' },
  userBio: { color: Colors.dark.text, fontSize: 14, marginBottom: 8 },
  metadataContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 },
  locationText: { color: Colors.dark.subtext, fontSize: 12, marginLeft: 4 },
  joinedContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  joinedText: { color: Colors.dark.subtext, fontSize: 12, marginLeft: 4 },
  actionButtonsContainer: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  profileViewsCard: { backgroundColor: Colors.dark.card, borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, width: 100 },
  profileViewsNumber: { color: Colors.dark.text, fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  profileViewsText: { color: Colors.dark.subtext, fontSize: 12, textAlign: 'center', marginTop: 4 },
  actionButtons: { flex: 1 },
  followStatsContainer: { flexDirection: 'row', backgroundColor: Colors.dark.card, borderRadius: 12, padding: 8, flex: 1 },
  followStatButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  followStatDivider: { width: 1, backgroundColor: Colors.dark.border, marginHorizontal: 8, alignSelf: 'stretch' },
  followStatNumber: { color: Colors.dark.text, fontSize: 16, fontWeight: 'bold' },
  followStatLabel: { color: Colors.dark.subtext, fontSize: 12, marginTop: 2 },
  tabBar: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.dark.border },
  tabBarSkeleton: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.dark.border 
  },
  tabContent: { padding: 16 },
  aboutSection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  aboutSectionTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '600' },
  addButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.dark.card, justifyContent: 'center', alignItems: 'center' },
  summaryText: { color: Colors.dark.text, fontSize: 14, lineHeight: 20 },
  emptySection: { backgroundColor: Colors.dark.card, borderRadius: 8, padding: 16, alignItems: 'center' },
  seeMoreText: {
  color: Colors.dark.text,
  marginTop: 4,
  fontWeight: "500",
},
  emptySectionText: { color: Colors.dark.subtext, fontSize: 14, textAlign: 'center' },
  experienceItem: { flexDirection: 'row', marginBottom: 16 },
  experienceContent: { marginLeft: 12, flex: 1 },
  experienceRole: { color: Colors.dark.text, fontSize: 16, fontWeight: '500' },
  experienceCompany: { color: Colors.dark.text, fontSize: 14 },
  experienceDuration: { color: Colors.dark.subtext, fontSize: 12 },
  experienceDescription: { color: Colors.dark.text, fontSize: 14, lineHeight: 20 },
  educationItem: { flexDirection: 'row', marginBottom: 16 },
  educationContent: { marginLeft: 12, flex: 1 },
  educationDegree: { color: Colors.dark.text, fontSize: 16, fontWeight: '500' },
  educationInstitution: { color: Colors.dark.text, fontSize: 14 },
  educationYears: { color: Colors.dark.subtext, fontSize: 12 },
  emptyStateContainer: { padding: 20, alignItems: 'center' },
  emptyStateText: { color: Colors.dark.subtext },
  emptyStateSubtext: { color: Colors.dark.subtext, fontSize: 12, marginTop: 8, textAlign: 'center' },
  emptyStateButton: { width: '80%', marginTop: 12 },
  repliesTabContent: { paddingHorizontal: 8, paddingVertical: 12 },
  repliesContainer: { gap: 8 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  skillChip: { backgroundColor: Colors.dark.card, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, marginRight: 8, marginBottom: 8 },
  skillText: { color: Colors.dark.text, fontSize: 14 },
  contactItem: { marginBottom: 10 },
  contactText: { color: Colors.dark.text },
});