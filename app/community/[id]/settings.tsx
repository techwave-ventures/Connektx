import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  StyleSheet,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Settings,
  Users,
  BarChart3,
  Globe,
  Lock,
  MessageSquare,
  Calendar,
  Shield,
  UserPlus,
  Crown,
  ChevronRight,
  Check,
  X,
  Ban,
  UserMinus,
  ArrowLeft,
  Image as ImageIcon,
  Camera,
  Tag,
  Plus,
  Upload,
  Search,
  MoreVertical,
  User
} from 'lucide-react-native';
import { useCommunityStore } from '../../../store/community-store';
import { useAuthStore } from '../../../store/auth-store';
import { getCommunityMembers } from '../../../api/community';
import Colors from '../../../constants/colors';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Avatar from '../../../components/ui/Avatar';

interface Member {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  joinedAt: string;
  bio?: string;
  userId?: string;
}

export default function CommunitySettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuthStore();
  const {
    communities,
    joinedCommunities,
    isOwner,
    isAdmin,
    updateCommunity,
    updateCommunitySettings,
    getUserRole,
    assignRole,
    removeRole,
    removeMember,
    banMember,
    unbanMember,
    transferOwnership,
    approveJoinRequest,
    rejectJoinRequest,
    getCommunityAnalytics,
  } = useCommunityStore();

  const [activeTab, setActiveTab] = useState('general');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  // Members functionality state
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const community = communities.find(c => c.id === id);
  const userRole = user ? getUserRole(id!, user.id) : null;
  const canManage = userRole === 'owner' || userRole === 'admin';

  const [formData, setFormData] = useState({
    name: community?.name || '',
    description: community?.description || '',
    location: community?.location || '',
    isPrivate: community?.isPrivate || false,
    requiresApproval: community?.requiresApproval || false,
  });

  const [settings, setSettings] = useState({
    allowMemberPosts: community?.settings.allowMemberPosts || true,
    allowMemberEvents: community?.settings.allowMemberEvents || true,
    autoApproveJoins: community?.settings.autoApproveJoins || true,
    allowExternalSharing: community?.settings.allowExternalSharing || true,
    moderationLevel: community?.settings.moderationLevel || 'medium',
    welcomeMessage: community?.settings.welcomeMessage || '',
  });

  // Visual elements states
  const [logoUrl, setLogoUrl] = useState(community?.logo || '');
  const [bannerUrl, setBannerUrl] = useState(community?.coverImage || '');
  const [communityTags, setCommunityTags] = useState(community?.tags || []);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (community) {
      setFormData({
        name: community.name,
        description: community.description,
        location: community.location || '',
        isPrivate: community.isPrivate,
        requiresApproval: community.requiresApproval,
      });
      setSettings(community.settings);
      setLogoUrl(community.logo || '');
      setBannerUrl(community.coverImage || '');
      setCommunityTags(community.tags || []);
    }
  }, [community]);

  if (!community || !canManage) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Shield size={48} color={Colors.dark.error} />
          <Text style={styles.errorText}>
            {!community ? 'Community not found' : 'You don\'t have permission to manage this community'}
          </Text>
        </View>
      </View>
    );
  }

  const analytics = getCommunityAnalytics(id!);

  // Fetch community members from API
  const fetchCommunityMembers = async () => {
    console.log('🚀 [Settings] Fetching community members...');
    if (!id || !token) {
      console.error('❌ Missing requirements:', { id: !!id, token: !!token });
      setMembersError('Authentication required');
      return;
    }

    try {
      setMembersLoading(true);
      setMembersError(null);
      
      const response = await getCommunityMembers(token, id);
      
      if (response.success && response.members) {
        console.log('✅ Members fetched successfully:', response.members.length);
        const mappedMembers: Member[] = response.members.map((member: any) => {
          const memberId = member.id || member._id || member.userId;
          
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
          
          console.log(`Member ${member.name}: role=${member.role}, actualRole=${actualRole}, isOwner=${actualRole === 'owner'}`);
          
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
        setMembers(mappedMembers);
      } else {
        console.warn('⚠️ No valid member data');
        setMembers([]);
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch members:', err);
      setMembersError(err.message || 'Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  };

  // Fetch members when activeTab is 'members'
  useEffect(() => {
    if (activeTab === 'members' && id && token) {
      fetchCommunityMembers();
    }
  }, [activeTab, id, token]);

  // Helper functions for members display
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

  const handleSaveGeneral = () => {
    updateCommunity(id!, formData);
    Alert.alert('Success', 'Community details updated successfully');
  };

  const handleSaveSettings = () => {
    updateCommunitySettings(id!, settings, user!.id);
    Alert.alert('Success', 'Community settings updated successfully');
  };

  const handleSaveVisuals = () => {
    // Update community with new visual elements
    updateCommunity(id!, {
      ...formData,
      logo: logoUrl,
      coverImage: bannerUrl,
      tags: communityTags
    });
    Alert.alert('Success', 'Visual elements updated successfully');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !communityTags.includes(newTag.trim())) {
      setCommunityTags([...communityTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCommunityTags(communityTags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = (type: 'logo' | 'banner') => {
    // In a real app, this would open image picker
    Alert.alert(
      'Upload Image',
      `Select ${type} image source`,
      [
        { text: 'Camera', onPress: () => mockImageUpload(type, 'camera') },
        { text: 'Gallery', onPress: () => mockImageUpload(type, 'gallery') },
        { text: 'URL', onPress: () => promptForImageUrl(type) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const mockImageUpload = (type: 'logo' | 'banner', source: 'camera' | 'gallery') => {
    // Mock image upload - in real app would use expo-image-picker
    const mockUrls = {
      logo: [
        'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=200&h=200&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&h=200&fit=crop&crop=center',
        'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=200&h=200&fit=crop&crop=center'
      ],
      banner: [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=300&fit=crop',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=300&fit=crop'
      ]
    };
    const randomUrl = mockUrls[type][Math.floor(Math.random() * mockUrls[type].length)];
    
    if (type === 'logo') {
      setLogoUrl(randomUrl);
    } else {
      setBannerUrl(randomUrl);
    }
    
    Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} updated!`);
  };

  const promptForImageUrl = (type: 'logo' | 'banner') => {
    Alert.prompt(
      'Image URL',
      `Enter ${type} image URL:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: (url) => {
            if (url && url.trim()) {
              if (type === 'logo') {
                setLogoUrl(url.trim());
              } else {
                setBannerUrl(url.trim());
              }
            }
          }
        }
      ],
      'plain-text',
      type === 'logo' ? logoUrl : bannerUrl
    );
  };

  const handleRoleAction = (memberId: string, action: 'promote' | 'demote' | 'remove' | 'ban') => {
    const memberRole = getUserRole(id!, memberId);
    
    switch (action) {
      case 'promote':
        if (memberRole === 'member') {
          assignRole(id!, memberId, 'moderator', user!.id);
        } else if (memberRole === 'moderator') {
          assignRole(id!, memberId, 'admin', user!.id);
        }
        break;
      case 'demote':
        if (memberRole === 'admin' || memberRole === 'moderator') {
          removeRole(id!, memberId, user!.id);
        }
        break;
      case 'remove':
        Alert.alert(
          'Remove Member',
          'Are you sure you want to remove this member?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeMember(id!, memberId, user!.id) }
          ]
        );
        break;
      case 'ban':
        Alert.alert(
          'Ban Member',
          'Are you sure you want to ban this member?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Ban', style: 'destructive', onPress: () => banMember(id!, memberId, user!.id) }
          ]
        );
        break;
    }
    setShowMemberModal(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Globe size={24} color={Colors.dark.primary} />
              <Text style={styles.sectionTitle}>Community Details</Text>
            </View>
            
            <View style={styles.card}>
              {/* Logo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Community Logo</Text>
                <View style={styles.visualPreviewContainer}>
                  <View style={styles.logoPreviewContainer}>
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
                    ) : (
                      <View style={styles.logoPlaceholder}>
                        <ImageIcon size={32} color={Colors.dark.subtext} />
                        <Text style={styles.placeholderText}>No Logo</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.visualActions}>
                    <Button
                      title="Change Logo"
                      onPress={() => handleImageUpload('logo')}
                      variant="outline"
                      size="small"
                      leftIcon={<Upload size={16} color={Colors.dark.primary} />}
                      style={styles.visualActionButton}
                    />
                    
                    {logoUrl && (
                      <Button
                        title="Remove"
                        onPress={() => setLogoUrl('')}
                        variant="ghost"
                        size="small"
                        leftIcon={<X size={16} color={Colors.dark.error} />}
                        style={[styles.visualActionButton, { borderColor: Colors.dark.error }]}
                        textStyle={{ color: Colors.dark.error }}
                      />
                    )}
                  </View>
                </View>
                <Text style={styles.visualDescription}>
                  Recommended size: 200x200px, PNG or JPG format.
                </Text>
              </View>

              {/* Banner */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Community Banner</Text>
                <View style={styles.bannerPreviewContainer}>
                  {bannerUrl ? (
                    <Image source={{ uri: bannerUrl }} style={styles.bannerPreview} />
                  ) : (
                    <View style={styles.bannerPlaceholder}>
                      <ImageIcon size={48} color={Colors.dark.subtext} />
                      <Text style={styles.placeholderText}>No Banner Image</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.bannerEditButton}
                    onPress={() => handleImageUpload('banner')}
                  >
                    <Camera size={20} color={Colors.dark.primary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.visualActions}>
                  <Button
                    title="Change Banner"
                    onPress={() => handleImageUpload('banner')}
                    variant="outline"
                    size="small"
                    leftIcon={<Upload size={16} color={Colors.dark.primary} />}
                    style={styles.visualActionButton}
                  />
                  
                  {bannerUrl && (
                    <Button
                      title="Remove"
                      onPress={() => setBannerUrl('')}
                      variant="ghost"
                      size="small"
                      leftIcon={<X size={16} color={Colors.dark.error} />}
                      style={[styles.visualActionButton, { borderColor: Colors.dark.error }]}
                      textStyle={{ color: Colors.dark.error }}
                    />
                  )}
                </View>
                <Text style={styles.visualDescription}>
                  Recommended size: 800x300px, PNG or JPG format.
                </Text>
              </View>

              {/* Community Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Community Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter community name"
                  placeholderTextColor={Colors.dark.subtext}
                />
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Enter community description"
                  placeholderTextColor={Colors.dark.subtext}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  placeholder="Enter location"
                  placeholderTextColor={Colors.dark.subtext}
                />
              </View>

              {/* Tags */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Community Tags</Text>
                <View style={styles.tagsContainer}>
                  {communityTags.length > 0 ? (
                    communityTags.map((tag, index) => (
                      <View key={index} style={styles.editableTag}>
                        <Badge
                          label={tag}
                          variant="secondary"
                          size="small"
                        />
                        <TouchableOpacity 
                          style={styles.removeTagButton}
                          onPress={() => handleRemoveTag(tag)}
                        >
                          <X size={12} color={Colors.dark.error} />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noTagsText}>No tags added yet</Text>
                  )}
                </View>
                
                <View style={styles.addTagContainer}>
                  <TextInput
                    style={styles.tagInput}
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="Add a tag..."
                    placeholderTextColor={Colors.dark.subtext}
                    maxLength={20}
                    onSubmitEditing={handleAddTag}
                  />
                  <TouchableOpacity 
                    style={[styles.addTagButton, !newTag.trim() && styles.addTagButtonDisabled]}
                    onPress={handleAddTag}
                    disabled={!newTag.trim()}
                  >
                    <Plus size={16} color={newTag.trim() ? Colors.dark.primary : Colors.dark.subtext} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.visualDescription}>
                  Tags help people discover your community. Add relevant topics and interests.
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionSubheader}>
                <Lock size={20} color={Colors.dark.primary} />
                <Text style={styles.subsectionTitle}>Privacy Settings</Text>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.label}>Private Community</Text>
                  <Text style={styles.sublabel}>Only members can see posts and content</Text>
                </View>
                <Switch
                  value={formData.isPrivate}
                  onValueChange={(value) => setFormData({ ...formData, isPrivate: value })}
                  trackColor={{ false: Colors.dark.border, true: `${Colors.dark.primary}50` }}
                  thumbColor={formData.isPrivate ? Colors.dark.primary : Colors.dark.subtext}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.label}>Requires Join Approval</Text>
                  <Text style={styles.sublabel}>Manually approve new member requests</Text>
                </View>
                <Switch
                  value={formData.requiresApproval}
                  onValueChange={(value) => setFormData({ ...formData, requiresApproval: value })}
                  trackColor={{ false: Colors.dark.border, true: `${Colors.dark.primary}50` }}
                  thumbColor={formData.requiresApproval ? Colors.dark.primary : Colors.dark.subtext}
                />
              </View>
            </View>

            <Button
              title="Save Changes"
              onPress={handleSaveVisuals}
              variant="primary"
              gradient
              style={styles.modernSaveButton}
            />
          </View>
        );

      case 'settings':
        return (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Settings size={24} color={Colors.dark.primary} />
              <Text style={styles.sectionTitle}>Community Settings</Text>
            </View>
            
            <View style={styles.card}>
              <View style={styles.sectionSubheader}>
                <MessageSquare size={20} color={Colors.dark.primary} />
                <Text style={styles.subsectionTitle}>Content Permissions</Text>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.label}>Allow Member Posts</Text>
                  <Text style={styles.sublabel}>Let members create and share posts</Text>
                </View>
                <Switch
                  value={settings.allowMemberPosts}
                  onValueChange={(value) => setSettings({ ...settings, allowMemberPosts: value })}
                  trackColor={{ false: Colors.dark.border, true: `${Colors.dark.primary}50` }}
                  thumbColor={settings.allowMemberPosts ? Colors.dark.primary : Colors.dark.subtext}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.label}>Allow Member Events</Text>
                  <Text style={styles.sublabel}>Let members create and organize events</Text>
                </View>
                <Switch
                  value={settings.allowMemberEvents}
                  onValueChange={(value) => setSettings({ ...settings, allowMemberEvents: value })}
                  trackColor={{ false: Colors.dark.border, true: `${Colors.dark.primary}50` }}
                  thumbColor={settings.allowMemberEvents ? Colors.dark.primary : Colors.dark.subtext}
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.label}>Allow External Sharing</Text>
                  <Text style={styles.sublabel}>Let members share content outside community</Text>
                </View>
                <Switch
                  value={settings.allowExternalSharing}
                  onValueChange={(value) => setSettings({ ...settings, allowExternalSharing: value })}
                  trackColor={{ false: Colors.dark.border, true: `${Colors.dark.primary}50` }}
                  thumbColor={settings.allowExternalSharing ? Colors.dark.primary : Colors.dark.subtext}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionSubheader}>
                <UserPlus size={20} color={Colors.dark.primary} />
                <Text style={styles.subsectionTitle}>Membership Settings</Text>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.label}>Auto-approve Joins</Text>
                  <Text style={styles.sublabel}>Automatically accept new member requests</Text>
                </View>
                <Switch
                  value={settings.autoApproveJoins}
                  onValueChange={(value) => setSettings({ ...settings, autoApproveJoins: value })}
                  trackColor={{ false: Colors.dark.border, true: `${Colors.dark.primary}50` }}
                  thumbColor={settings.autoApproveJoins ? Colors.dark.primary : Colors.dark.subtext}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionSubheader}>
                <Shield size={20} color={Colors.dark.primary} />
                <Text style={styles.subsectionTitle}>Moderation</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Moderation Level</Text>
                <View style={styles.modernRadioGroup}>
                  {[
                    { key: 'low', label: 'Low', description: 'Minimal oversight' },
                    { key: 'medium', label: 'Medium', description: 'Balanced moderation' },
                    { key: 'high', label: 'High', description: 'Strict oversight' }
                  ].map((level) => (
                    <TouchableOpacity
                      key={level.key}
                      style={[
                        styles.modernRadioButton,
                        settings.moderationLevel === level.key && styles.modernRadioButtonSelected
                      ]}
                      onPress={() => setSettings({ ...settings, moderationLevel: level.key as any })}
                    >
                      <View style={styles.radioButtonContent}>
                        <Text style={[
                          styles.modernRadioText,
                          settings.moderationLevel === level.key && styles.modernRadioTextSelected
                        ]}>
                          {level.label}
                        </Text>
                        <Text style={[
                          styles.radioDescription,
                          settings.moderationLevel === level.key && styles.radioDescriptionSelected
                        ]}>
                          {level.description}
                        </Text>
                      </View>
                      {settings.moderationLevel === level.key && (
                        <Check size={16} color={Colors.dark.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Welcome Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={settings.welcomeMessage}
                  onChangeText={(text) => setSettings({ ...settings, welcomeMessage: text })}
                  placeholder="Enter welcome message for new members"
                  placeholderTextColor={Colors.dark.subtext}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <Button
              title="Save Settings"
              onPress={handleSaveSettings}
              variant="primary"
              gradient
              style={styles.modernSaveButton}
            />
          </View>
        );

      case 'members':
        // Filter members based on search query
        const filteredMembers = members.filter(member =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (member.bio && member.bio.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        const owners = filteredMembers.filter(m => m.role === 'owner');
        const admins = filteredMembers.filter(m => m.role === 'admin');
        const moderators = filteredMembers.filter(m => m.role === 'moderator');
        const regularMembers = filteredMembers.filter(m => m.role === 'member');

        const renderMember = (member: Member) => (
          <TouchableOpacity
            key={member.id}
            style={styles.memberCard}
            onPress={() => {
              setSelectedMember({ id: member.userId || member.id, role: member.role });
              setShowMemberModal(true);
            }}
          >
            <Avatar source={member.avatar} name={member.name} size={50} />
            
            <View style={styles.memberCardInfo}>
              <View style={styles.memberCardHeader}>
                <Text style={styles.memberCardName}>{member.name}</Text>
                <View style={styles.memberRoleContainer}>
                  {getRoleIcon(member.role)}
                  <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                    {member.role}
                  </Text>
                </View>
              </View>
              
              {member.bio && (
                <Text style={styles.memberBio} numberOfLines={1}>
                  {member.bio}
                </Text>
              )}
              
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

        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Members ({members.length})</Text>
            
            {/* Join Requests */}
            {community.joinRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.subsectionTitle}>Join Requests ({community.joinRequests.length})</Text>
                {community.joinRequests.filter(r => r.status === 'pending').map((request) => (
                  <View key={request.id} style={styles.requestItem}>
                    <View style={styles.requestInfo}>
                      <Image 
                        source={{ uri: request.userAvatar || 'https://via.placeholder.com/40' }} 
                        style={styles.avatar} 
                      />
                      <View style={styles.requestDetails}>
                        <Text style={styles.requestName}>{request.userName}</Text>
                        <Text style={styles.requestMessage}>{request.message}</Text>
                      </View>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => approveJoinRequest(id!, request.id, user!.id)}
                      >
                        <Ionicons name="checkmark" size={16} color="white" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => rejectJoinRequest(id!, request.id, user!.id)}
                      >
                        <Ionicons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Search */}
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

            {/* Members List */}
            {membersLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.dark.tint} />
                <Text style={styles.loadingText}>Loading members...</Text>
              </View>
            ) : membersError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{membersError}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={fetchCommunityMembers}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filteredMembers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Users size={48} color={Colors.dark.subtext} />
                <Text style={styles.emptyText}>
                  {members.length === 0 ? 'No members found' : 'No members match your search'}
                </Text>
              </View>
            ) : (
              <View style={styles.membersContainer}>
                {/* Owners */}
                {owners.length > 0 && (
                  <View>
                    {renderSectionHeader('Owners', owners.length)}
                    {owners.map(renderMember)}
                  </View>
                )}
                
                {/* Admins */}
                {admins.length > 0 && (
                  <View>
                    {renderSectionHeader('Admins', admins.length)}
                    {admins.map(renderMember)}
                  </View>
                )}
                
                {/* Moderators */}
                {moderators.length > 0 && (
                  <View>
                    {renderSectionHeader('Moderators', moderators.length)}
                    {moderators.map(renderMember)}
                  </View>
                )}
                
                {/* Members */}
                {regularMembers.length > 0 && (
                  <View>
                    {renderSectionHeader('Members', regularMembers.length)}
                    {regularMembers.map(renderMember)}
                  </View>
                )}
              </View>
            )}

            {/* Banned Users */}
            {community.bannedUsers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.subsectionTitle}>Banned Users ({community.bannedUsers.length})</Text>
                {community.bannedUsers.map((userId) => (
                  <View key={userId} style={styles.memberItem}>
                    <View style={styles.memberInfo}>
                      <Image 
                        source={{ uri: 'https://via.placeholder.com/40' }} 
                        style={styles.avatar} 
                      />
                      <View style={styles.memberDetails}>
                        <Text style={styles.memberName}>User {userId}</Text>
                        <Text style={styles.memberRole}>Banned</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.unbanButton]}
                      onPress={() => unbanMember(id!, userId, user!.id)}
                    >
                      <Text style={styles.actionButtonText}>Unban</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'analytics':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Community Analytics</Text>
            
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.totalMembers}</Text>
                <Text style={styles.analyticsLabel}>Total Members</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.totalPosts}</Text>
                <Text style={styles.analyticsLabel}>Total Posts</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.totalComments}</Text>
                <Text style={styles.analyticsLabel}>Comments</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.totalLikes}</Text>
                <Text style={styles.analyticsLabel}>Total Likes</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.totalEvents}</Text>
                <Text style={styles.analyticsLabel}>Events</Text>
              </View>
              
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.engagementRate}%</Text>
                <Text style={styles.analyticsLabel}>Engagement Rate</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderMemberModal = () => {
    if (!selectedMember) return null;

    const memberRole = selectedMember.role;
    const canPromote = memberRole === 'member' || memberRole === 'moderator';
    const canDemote = memberRole === 'admin' || memberRole === 'moderator';

    return (
      <Modal visible={showMemberModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Member</Text>
            <Text style={styles.modalSubtitle}>User {selectedMember.id} - {memberRole}</Text>
            
            <View style={styles.modalActions}>
              {canPromote && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.promoteButton]}
                  onPress={() => handleRoleAction(selectedMember.id, 'promote')}
                >
                  <Text style={styles.modalButtonText}>
                    {memberRole === 'member' ? 'Make Moderator' : 'Make Admin'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {canDemote && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.demoteButton]}
                  onPress={() => handleRoleAction(selectedMember.id, 'demote')}
                >
                  <Text style={styles.modalButtonText}>Demote to Member</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.modalButton, styles.removeButton]}
                onPress={() => handleRoleAction(selectedMember.id, 'remove')}
              >
                <Text style={styles.modalButtonText}>Remove from Community</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.banButton]}
                onPress={() => handleRoleAction(selectedMember.id, 'ban')}
              >
                <Text style={styles.modalButtonText}>Ban User</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMemberModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const tabs = [
    { key: 'general', label: 'General', icon: Globe },
    { key: 'settings', label: 'Settings', icon: Settings },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Settings size={24} color={Colors.dark.primary} />
          <Text style={styles.headerTitle}>Community Settings</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <IconComponent 
                size={18} 
                color={isActive ? Colors.dark.primary : Colors.dark.subtext} 
              />
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {renderMemberModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.dark.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
    color: Colors.dark.text,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 12,
    margin: 4,
  },
  activeTab: {
    backgroundColor: `${Colors.dark.primary}15`,
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 12,
    color: Colors.dark.subtext,
    fontWeight: '500',
    marginTop: 4,
  },
  activeTabText: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  tabContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
    color: Colors.dark.text,
  },
  sectionSubheader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: Colors.dark.text,
  },
  card: {
    backgroundColor: Colors.dark.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  // Members styles
  searchContainer: {
    paddingHorizontal: 0,
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
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  retryButton: {
    backgroundColor: Colors.dark.tint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: Colors.dark.background,
    fontSize: 14,
    fontWeight: '600',
  },
  membersContainer: {
    gap: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberCardName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  memberRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  joinDate: {
    color: Colors.dark.subtext,
    fontSize: 12,
  },
  moreButton: {
    padding: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.dark.text,
  },
  sublabel: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginTop: 4,
    lineHeight: 20,
  },
  input: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.dark.text,
    minHeight: 52,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  modernSaveButton: {
    marginTop: 8,
    borderRadius: 16,
    minHeight: 52,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
  },
  radioButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radioText: {
    color: '#666',
  },
  radioTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  memberRole: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  requestDetails: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '500',
  },
  requestMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  unbanButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  analyticsCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: '45%',
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  promoteButton: {
    backgroundColor: '#34C759',
  },
  demoteButton: {
    backgroundColor: '#FF9500',
  },
  removeButton: {
    backgroundColor: '#FF3B30',
  },
  banButton: {
    backgroundColor: '#8E8E93',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  errorText: {
    textAlign: 'center',
    color: Colors.dark.error,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  modernRadioGroup: {
    gap: 12,
  },
  modernRadioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 16,
  },
  modernRadioButtonSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: `${Colors.dark.primary}08`,
  },
  radioButtonContent: {
    flex: 1,
  },
  modernRadioText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  modernRadioTextSelected: {
    color: Colors.dark.primary,
  },
  radioDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
  },
  radioDescriptionSelected: {
    color: Colors.dark.primary,
  },
  // Visual Elements Styles
  visualPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  logoPreviewContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: Colors.dark.background,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  logoPreview: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
  },
  bannerPreviewContainer: {
    position: 'relative',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.dark.background,
    borderWidth: 2,
    borderColor: Colors.dark.border,
    marginBottom: 16,
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
  },
  bannerEditButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: `${Colors.dark.background}90`,
    borderRadius: 20,
    padding: 8,
  },
  placeholderText: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginTop: 4,
  },
  visualActions: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  visualActionButton: {
    flex: 1,
  },
  visualDescription: {
    fontSize: 14,
    color: Colors.dark.subtext,
    lineHeight: 20,
    marginTop: 12,
  },
  // Tags Styles
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    minHeight: 40,
    alignItems: 'flex-start',
  },
  editableTag: {
    position: 'relative',
  },
  removeTagButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.error,
  },
  noTagsText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    fontStyle: 'italic',
  },
  addTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.dark.text,
    minHeight: 44,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.dark.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  addTagButtonDisabled: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
  },
  // Additional Members Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
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
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyText: {
    color: Colors.dark.subtext,
    fontSize: 16,
    textAlign: 'center',
  },
  // Cleanup unused styles
  membersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${Colors.dark.primary}15`,
    borderRadius: 8,
    gap: 4,
  },
  viewAllButtonText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
