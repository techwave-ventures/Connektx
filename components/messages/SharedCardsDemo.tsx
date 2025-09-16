// components/messages/SharedCardsDemo.tsx
// Demo file to showcase the modernized shared cards

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

import SharedPostCard from './SharedPostCard';
import SharedNewsCard from './SharedNewsCard';
import SharedUserCard from './SharedUserCard';
import SharedShowcaseCard from './SharedShowcaseCard';

export default function SharedCardsDemo() {
  // Mock data for demonstration
  const mockPost = {
    _id: '1',
    discription: 'Just launched my new React Native app! It features modern UI design with smooth animations and great UX. Check it out and let me know what you think! 🚀',
    media: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop']
  };

  const mockAuthor = {
    _id: '1',
    name: 'Sarah Chen',
    profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b1ab?w=150&h=150&fit=crop&crop=face'
  };

  const mockNews = {
    _id: '1',
    headline: 'Revolutionary AI breakthrough changes mobile app development forever',
    source: 'TechCrunch',
    bannerImage: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop'
  };

  const mockUser = {
    _id: '1',
    name: 'Alex Rodriguez',
    headline: 'Senior Full-Stack Developer at Google',
    bio: 'Passionate about creating beautiful and functional mobile apps with React Native and TypeScript.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  };

  const mockShowcase = {
    _id: '1',
    projectTitle: 'EcoTrack - Sustainability App',
    tagline: 'Track your environmental impact and make sustainable choices easier than ever before.',
    logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop',
    bannerImageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    images: []
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Modern Shared Cards</Text>
          <Text style={styles.subtitle}>Redesigned message cards with modern UI</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Post Card</Text>
          <SharedPostCard post={mockPost} author={mockAuthor} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>News Card</Text>
          <SharedNewsCard news={mockNews} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Profile Card</Text>
          <SharedUserCard user={mockUser} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Showcase Card</Text>
          <SharedShowcaseCard showcase={mockShowcase} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ✨ Modern cards with improved typography, gradients, animations, and visual hierarchy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    marginBottom: 20,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.dark.subtext,
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
