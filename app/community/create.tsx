import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Globe,
  Lock,
  MapPin,
  Tag,
  Image as ImageIcon,
  Camera,
  Upload,
} from 'lucide-react-native';
import { useCommunityStore } from '@/store/community-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const { createCommunity } = useCommunityStore();
  const { user, token } = useAuthStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [logo, setLogo] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Request permissions on component mount
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images.'
        );
      }
    }
  };

  const handleCreateCommunity = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a community');
      return;
    }

    if (!name.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      // Import safe utilities for tag processing
      const { parseTagsFromString } = require('@/utils/safeStringUtils');
      
      // Safe tag processing - handle undefined/null tags gracefully
      let tagsArray: string[] = [];
      try {
        tagsArray = parseTagsFromString(tags);
      } catch (tagError) {
        console.warn('Error processing tags:', tagError);
        tagsArray = [];
      }

      await createCommunity(token || '', {
        name: name.trim(),
        description: description.trim(),
        location: location.trim() || undefined,
        tags: tagsArray,
        logo: logo || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=200&h=200&fit=crop', // Default logo if none uploaded
        isPrivate,
        createdBy: user.id,
        coverImage: bannerImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=400&fit=crop',
      });

      Alert.alert(
        'Success',
        'Community created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create community. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logo
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await uploadLogo(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takeLogo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for logo
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await uploadLogo(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadLogo = async (imageUri: string) => {
    try {
      setIsUploadingLogo(true);
      
      // For now, we'll just set the local URI as the logo
      // In a real app, you'd upload this to your server
      setLogo(imageUri);
      
      Alert.alert('Success', 'Logo uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const pickBanner = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Banner aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await uploadBanner(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick banner image. Please try again.');
    }
  };

  const takeBanner = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9], // Banner aspect ratio
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        await uploadBanner(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take banner photo. Please try again.');
    }
  };

  const uploadBanner = async (imageUri: string) => {
    try {
      setIsUploadingBanner(true);
      
      // For now, we'll just set the local URI as the banner
      // In a real app, you'd upload this to your server
      setBannerImage(imageUri);
      
      Alert.alert('Success', 'Banner image uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload banner image. Please try again.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const showLogoOptions = () => {
    Alert.alert(
      'Community Logo',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => takeLogo(),
        },
        {
          text: 'Gallery',
          onPress: () => pickLogo(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const showBannerOptions = () => {
    Alert.alert(
      'Community Banner',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => takeBanner(),
        },
        {
          text: 'Gallery',
          onPress: () => pickBanner(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Create Community',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <Input
            label="Community Name *"
            placeholder="Enter community name"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          <Input
            label="Description *"
            placeholder="Describe your community's purpose and goals"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.textArea}
            maxLength={500}
          />

          <Input
            label="Location (Optional)"
            placeholder="City, Country"
            value={location}
            onChangeText={setLocation}
            leftIcon={<MapPin size={20} color={Colors.dark.subtext} />}
          />

          <Input
            label="Tags (comma separated)"
            placeholder="tech, startup, networking"
            value={tags}
            onChangeText={setTags}
            leftIcon={<Tag size={20} color={Colors.dark.subtext} />}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Logo</Text>
          <View style={styles.logoSection}>
            {logo ? (
              <View style={styles.logoPreviewContainer}>
                <Image source={{ uri: logo }} style={styles.logoPreview} />
                <TouchableOpacity 
                  style={styles.changeLogoButton}
                  onPress={showLogoOptions}
                  disabled={isUploadingLogo}
                >
                  <Text style={styles.changeLogoText}>Change Logo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadButton}
                onPress={showLogoOptions}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <ActivityIndicator size="small" color={Colors.dark.tint} />
                ) : (
                  <>
                    <Upload size={32} color={Colors.dark.tint} />
                    <Text style={styles.uploadButtonText}>Upload Logo</Text>
                    <Text style={styles.uploadButtonSubtext}>JPG, PNG • Square aspect ratio recommended</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Banner</Text>
          <View style={styles.bannerSection}>
            {bannerImage ? (
              <View style={styles.bannerPreviewContainer}>
                <Image source={{ uri: bannerImage }} style={styles.bannerPreview} />
                <TouchableOpacity 
                  style={styles.changeBannerButton}
                  onPress={showBannerOptions}
                  disabled={isUploadingBanner}
                >
                  <Text style={styles.changeBannerText}>Change Banner</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.uploadBannerButton}
                onPress={showBannerOptions}
                disabled={isUploadingBanner}
              >
                {isUploadingBanner ? (
                  <ActivityIndicator size="small" color={Colors.dark.tint} />
                ) : (
                  <>
                    <Upload size={32} color={Colors.dark.tint} />
                    <Text style={styles.uploadButtonText}>Upload Banner</Text>
                    <Text style={styles.uploadButtonSubtext}>JPG, PNG • 16:9 aspect ratio recommended</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          
          <View style={styles.privacyOptions}>
            <TouchableOpacity
              style={[
                styles.privacyOption,
                !isPrivate && styles.privacyOptionSelected
              ]}
              onPress={() => setIsPrivate(false)}
            >
              <Globe size={24} color={!isPrivate ? Colors.dark.tint : Colors.dark.subtext} />
              <View style={styles.privacyOptionContent}>
                <Text
                  style={[
                    styles.privacyOptionTitle,
                    !isPrivate && styles.privacyOptionTitleSelected
                  ]}
                >
                  Public
                </Text>
                <Text style={styles.privacyOptionDescription}>
                  Anyone can find and join this community
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.privacyOption,
                isPrivate && styles.privacyOptionSelected
              ]}
              onPress={() => setIsPrivate(true)}
            >
              <Lock size={24} color={isPrivate ? Colors.dark.tint : Colors.dark.subtext} />
              <View style={styles.privacyOptionContent}>
                <Text
                  style={[
                    styles.privacyOptionTitle,
                    isPrivate && styles.privacyOptionTitleSelected
                  ]}
                >
                  Private
                </Text>
                <Text style={styles.privacyOptionDescription}>
                  Only invited members can join
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.guidelinesTitle}>Community Guidelines</Text>
          <Text style={styles.guidelinesText}>
            By creating a community, you agree to:
            {'\n'}• Maintain a respectful and inclusive environment
            {'\n'}• Follow platform terms of service
            {'\n'}• Moderate content appropriately
            {'\n'}• Respect intellectual property rights
          </Text>
        </View>

        <Button
          title={isLoading ? 'Creating...' : 'Create Community'}
          onPress={handleCreateCommunity}
          disabled={isLoading || !name.trim() || !description.trim()}
          gradient
          style={styles.createButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: Colors.dark.tint,
    backgroundColor: `${Colors.dark.tint}20`,
  },
  iconText: {
    fontSize: 24,
  },
  privacyOptions: {
    gap: 12,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  privacyOptionSelected: {
    borderColor: Colors.dark.tint,
    backgroundColor: `${Colors.dark.tint}10`,
  },
  privacyOptionContent: {
    marginLeft: 16,
    flex: 1,
  },
  privacyOptionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyOptionTitleSelected: {
    color: Colors.dark.tint,
  },
  privacyOptionDescription: {
    color: Colors.dark.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
  guidelinesTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  guidelinesText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    lineHeight: 22,
  },
  createButton: {
    marginTop: 16,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoPreviewContainer: {
    alignItems: 'center',
    gap: 16,
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.dark.tint,
  },
  changeLogoButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.tint,
  },
  changeLogoText: {
    color: Colors.dark.tint,
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.tint,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: Colors.dark.tint,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    color: Colors.dark.subtext,
    fontSize: 12,
    textAlign: 'center',
  },
  bannerSection: {
    alignItems: 'center',
  },
  bannerPreviewContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  bannerPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: Colors.dark.tint,
  },
  changeBannerButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.tint,
  },
  changeBannerText: {
    color: Colors.dark.tint,
    fontSize: 16,
    fontWeight: '600',
  },
  uploadBannerButton: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.tint,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
});
