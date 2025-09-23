import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, router } from 'expo-router';
import {
  Edit2,
  MapPin,
  Settings,
  Calendar,
  BarChart2,
  Share2,
} from 'lucide-react-native';
import TabBar from '@/components/ui/TabBar';
import PostCard from '@/components/home/PostCard';
import ShowcaseCard from '@/components/showcase/ShowcaseCard';
import PortfolioGrid from '@/components/portfolio/PortfolioGrid';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/store/auth-store';
import { useShowcaseStore } from '@/store/showcase-store';
import Colors from '@/constants/colors';
import { useFocusEffect } from '@react-navigation/native';
import { useUserCommentsStore } from '@/store/user-comments-store';
import useProfileData from '@/hooks/useProfileData';
import UserReply from '@/components/ui/UserReply';
import { PortfolioItem } from '@/store/portfolio-store';

// -------- ProfileScreen --------
export default function ProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user: currentUser, logout } = useAuthStore();
  const { deleteEntryApi, fetchEntries, entries: allShowcases } = useShowcaseStore();
  const { userComments, isLoading: commentsLoading } = useUserCommentsStore();

  const isOwnProfile = !userId || userId === currentUser?.id;

  const {
    user,
    posts,
    showcases,
    portfolioItems,
    loading,
    refreshing,
    refresh,
    smartRefresh,
  } = useProfileData({
    userId: userId || currentUser?.id || "",
    isOwnProfile,
    enableAutoRefresh: false,
    cacheTimeout: isOwnProfile ? 2 * 60 * 1000 : 5 * 60 * 1000,
  });

  const [activeTab, setActiveTab] = useState("about");

  // refs + focus refresh
  const smartRefreshRef = useRef(smartRefresh);
  smartRefreshRef.current = smartRefresh;

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
      smartRefreshRef.current();
    }, [fetchEntries])
  );

  // Memoized showcases
  const realTimeUserShowcases = useMemo(() => {
    if (!user?.id && !currentUser?.id) return [];
    const targetId = isOwnProfile ? currentUser?.id : user?.id;
    return allShowcases.filter((s: any) => {
      const showcaseUserId = s.user?.id || s.user?._id;
      return showcaseUserId === targetId;
    });
  }, [allShowcases, user?.id, currentUser?.id, isOwnProfile]);

  // Decide which user to display
  const displayUser: any = isOwnProfile ? user || currentUser : user;

  // Handlers
  const handleLogout = () => {
    logout();
    router.replace("/login");
  };
  const handleEditProfile = () => router.push("/profile/edit");
  const handleSettings = () => router.push("/settings" as any);
  const handleShare = () => Alert.alert("Share Profile", "Share your profile with others");
  const handleDeleteShowcase = async (showcase: any) => {
    Alert.alert("Delete Showcase", "Are you sure you want to delete?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await deleteEntryApi(showcase.id);
            if (success) {
              smartRefresh();
              Alert.alert("Deleted", "Showcase removed successfully");
            } else {
              Alert.alert("Error", "Failed to delete showcase.");
            }
          } catch (err) {
            console.error(err);
            Alert.alert("Error", "Something went wrong.");
          }
        },
      },
    ]);
  };

  if (loading && !displayUser) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.dark.background }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!loading && !displayUser) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.dark.background }}>
        <Text style={{ color: Colors.dark.text }}>User not found</Text>
      </SafeAreaView>
    );
  }

  // ---------- MAIN RENDER ----------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.dark.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: isOwnProfile ? "My Profile" : displayUser.name,
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
          headerTitleStyle: { color: Colors.dark.text, fontWeight: "600" },
          headerShadowVisible: false,
          headerRight: () =>
            isOwnProfile ? (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity onPress={handleShare} style={{ marginRight: 12 }}>
                  <Share2 size={22} color={Colors.dark.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSettings}>
                  <Settings size={22} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />

      {/** ---------- Tabs for FlatList-based content ---------- **/}
      {(activeTab === "posts" || activeTab === "replies" || activeTab === "ideas") && (
        <FlatList
          data={activeTab === "posts" ? posts : activeTab === "replies" ? userComments : realTimeUserShowcases.length ? realTimeUserShowcases : showcases}
          keyExtractor={(item) => item.id || item._id}
          renderItem={({ item }) => {
            if (activeTab === "posts") return <PostCard post={item} />;
            if (activeTab === "replies")
              return (
                <UserReply
                  comment={item}
                  onPress={() => item.post?._id && router.push(`/post/${item.post._id}`)}
                />
              );
            return (
              <ShowcaseCard
                entry={item}
                onPress={() => router.push(`/showcase/${item.id}`)}
                onDelete={isOwnProfile ? handleDeleteShowcase : undefined}
                showOwnerActions={isOwnProfile}
              />
            );
          }}
          ListEmptyComponent={
            <Text style={{ color: Colors.dark.subtext, textAlign: "center", marginTop: 16 }}>
              {activeTab === "posts"
                ? "No posts yet"
                : activeTab === "replies"
                ? "No replies yet"
                : "No ideas yet"}
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.dark.tint} />
          }
          ListHeaderComponent={<ProfileHeaderWithTabs displayUser={displayUser} isOwnProfile={isOwnProfile} activeTab={activeTab} setActiveTab={setActiveTab} />}
        />
      )}

      {/** ---------- Tabs for ScrollView-based content ---------- **/}
      {(activeTab === "about" || activeTab === "portfolio") && (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.dark.tint} />
          }
        >
          <ProfileHeaderWithTabs displayUser={displayUser} isOwnProfile={isOwnProfile} activeTab={activeTab} setActiveTab={setActiveTab} />
          {activeTab === "about" && <AboutSection user={displayUser} isOwnProfile={isOwnProfile} />}
          {activeTab === "portfolio" && <PortfolioSection items={portfolioItems} onDelete={() => {}} isOwnProfile={isOwnProfile} />}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// -------- Subcomponents --------
const ProfileHeaderWithTabs = ({ displayUser, isOwnProfile, activeTab, setActiveTab }: any) => (
  <View>
    <View style={{ flexDirection: "row", padding: 16 }}>
      <Avatar source={displayUser.profileImage} name={displayUser.name} size={80} showBorder />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: Colors.dark.text, fontSize: 18, fontWeight: "600", flex: 1 }}>
            {displayUser.name}
          </Text>
          {isOwnProfile && <TouchableOpacity onPress={() => {}}><Edit2 size={16} color={Colors.dark.subtext} /></TouchableOpacity>}
        </View>
        <Text style={{ color: Colors.dark.subtext, marginTop: 2 }}>
          {displayUser.headline || "Add a headline to your profile!"}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          {displayUser.location && (
            <View style={{ flexDirection: "row", marginRight: 8 }}>
              <MapPin size={14} color={Colors.dark.subtext} />
              <Text style={{ color: Colors.dark.subtext, marginLeft: 4 }}>{displayUser.location}</Text>
            </View>
          )}
          {displayUser.joinedDate && (
            <View style={{ flexDirection: "row" }}>
              <Calendar size={14} color={Colors.dark.subtext} />
              <Text style={{ color: Colors.dark.subtext, marginLeft: 4 }}>
                Joined {new Date(displayUser.joinedDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>

    <View style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: 12 }}>
      <View style={{ alignItems: "center" }}>
        <BarChart2 size={20} color={Colors.dark.text} />
        <Text style={{ color: Colors.dark.text, fontWeight: "600" }}>{displayUser.profileViews || 0}</Text>
        <Text style={{ color: Colors.dark.subtext }}>Views</Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <Text style={{ color: Colors.dark.text, fontWeight: "600" }}>{displayUser.followers || 0}</Text>
        <Text style={{ color: Colors.dark.subtext }}>Followers</Text>
      </View>
      <View style={{ alignItems: "center" }}>
        <Text style={{ color: Colors.dark.text, fontWeight: "600" }}>{displayUser.following || 0}</Text>
        <Text style={{ color: Colors.dark.subtext }}>Following</Text>
      </View>
    </View>

    <TabBar
      tabs={[
        { id: 'about', label: 'About' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'posts', label: 'Posts' },
        { id: 'replies', label: 'Replies' },
        { id: 'ideas', label: 'Ideas' },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      scrollable
    />
  </View>
);

const AboutSection = React.memo(({ user, isOwnProfile }: any) => (
  <View style={{ padding: 16 }}>
    <Text style={{ color: Colors.dark.text, fontWeight: "600", fontSize: 16 }}>About</Text>
    <Text style={{ color: Colors.dark.subtext, marginTop: 8 }}>{user.bio || (isOwnProfile ? "Add a bio" : "No bio")}</Text>
  </View>
));

const PortfolioSection = React.memo(({ items, onDelete, isOwnProfile }: any) => (
  <View style={{ padding: 16 }}>
    <PortfolioGrid
      items={items}
      onCreatePress={() => isOwnProfile && router.push("/portfolio/create")}
      onDeleteItem={onDelete}
      onItemPress={() => {}}
    />
  </View>
));
