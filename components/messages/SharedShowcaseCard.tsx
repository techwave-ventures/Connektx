// components/messages/SharedShowcaseCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { Briefcase } from 'lucide-react-native'; // A relevant icon for a project/showcase

// --- Interfaces for the component's props, matching your data structure ---
interface ShowcaseData {
  _id: string;
  projectTitle: string;
  tagline?: string | null;
  logo?: string | null;
  // Use banner or first image for the card's visual
  bannerImageUrl?: string | null;
  images?: string[] | null;
}

interface SharedShowcaseCardProps {
  showcase: ShowcaseData;
}

const SharedShowcaseCard: React.FC<SharedShowcaseCardProps> = ({ showcase }) => {
  const router = useRouter();

  // If there's no showcase data, render nothing to avoid crashing.
  if (!showcase) {
    return null;
  }

  const handlePress = () => {
    // Navigate to the specific showcase screen when the card is pressed.
    router.push(`/showcase/${showcase._id}`);
  };

  // Determine the primary image to display at the top of the card.
  const cardImage = showcase.bannerImageUrl || (showcase.images && showcase.images.length > 0 ? showcase.images[0] : null);

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      {/* Display the banner/main image if available */}
      {cardImage && (
        <Image source={{ uri: cardImage }} style={styles.showcaseImage} />
      )}
      
      <View style={styles.showcaseContent}>
        {/* Header with Logo and Project Title */}
        <View style={styles.headerInfo}>
          {showcase.logo ? (
            <Image source={{ uri: showcase.logo }} style={styles.logoImage} />
          ) : (
            // A placeholder if no logo is available
            <View style={styles.logoPlaceholder}>
              <Briefcase size={14} color={Colors.dark.subtext} />
            </View>
          )}
          <Text style={styles.projectTitle} numberOfLines={1}>{showcase.projectTitle}</Text>
        </View>

        {/* Display the tagline, similar to a post's content or news headline */}
        {showcase.tagline && (
          <Text style={styles.taglineText} numberOfLines={2}>
            {showcase.tagline}
          </Text>
        )}
        
        {/* Call-to-action Text */}
        <Text style={styles.viewShowcaseText}>View Showcase</Text>
      </View>
    </TouchableOpacity>
  );
};

// Styles are designed to be consistent with your other shared cards.
const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  showcaseImage: {
    width: '100%',
    height: 120, // Consistent height with other cards
  },
  showcaseContent: {
    padding: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 24,
    height: 24,
    borderRadius: 4, // A slightly squared look for a logo
    marginRight: 8,
    backgroundColor: Colors.dark.background,
  },
  logoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: Colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  projectTitle: {
    flex: 1,
    color: Colors.dark.subtext, // Subtle color like author/source name
    fontSize: 13,
    fontWeight: '500',
  },
  taglineText: {
    color: Colors.dark.text,
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  viewShowcaseText: {
    color: Colors.dark.primary,
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4,
  },
});

export default SharedShowcaseCard;
