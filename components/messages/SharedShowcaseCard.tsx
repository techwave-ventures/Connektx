// components/messages/SharedShowcaseCard.tsx

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Animated,
  Pressable 
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Briefcase, Star, ArrowUpRight, Palette } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { SharedCardStyles, AnimationValues, CardGradients } from './shared-card-styles';

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
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // If there's no showcase data, render nothing to avoid crashing.
  if (!showcase) {
    return null;
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: AnimationValues.pressScale,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 6,
    }).start();
  };

  const handlePress = () => {
    router.push(`/showcase/${showcase._id}`);
  };

  // Determine the primary image to display at the top of the card.
  const cardImage = showcase.bannerImageUrl || (showcase.images && showcase.images.length > 0 ? showcase.images[0] : null);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={SharedCardStyles.modernCardContainer}
      >
        {/* Showcase Image with Gradient Overlay and Floating Elements */}
        {cardImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: cardImage }} style={SharedCardStyles.modernImage} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']}
              style={styles.imageGradient}
            />
            {/* Floating showcase badge */}
            <View style={styles.floatingBadge}>
              <Palette size={12} color="#FFFFFF" />
              <Text style={styles.floatingBadgeText}>SHOWCASE</Text>
            </View>
            {/* Star rating indicator if applicable */}
            <View style={styles.ratingIndicator}>
              <Star size={12} color="#FFD700" fill="#FFD700" />
              <Text style={styles.ratingText}>Featured</Text>
            </View>
          </View>
        )}
        
        <View style={SharedCardStyles.modernContent}>
          {/* Project Header with Enhanced Design */}
          <View style={SharedCardStyles.modernHeader}>
            {showcase.logo ? (
              <View style={styles.modernLogo}>
                <Image source={{ uri: showcase.logo }} style={styles.logoImage} />
              </View>
            ) : (
              <View style={styles.logoPlaceholder}>
                <Briefcase size={16} color={Colors.dark.primary} />
              </View>
            )}
            <View style={styles.projectInfo}>
              <Text style={styles.modernProjectTitle} numberOfLines={1}>
                {showcase.projectTitle}
              </Text>
              <Text style={SharedCardStyles.metaText}>Portfolio Project</Text>
            </View>
          </View>

          {/* Project Tagline */}
          {showcase.tagline && (
            <Text style={SharedCardStyles.primaryText} numberOfLines={2}>
              {showcase.tagline}
            </Text>
          )}
          
          {/* Modern Footer with CTA */}
          <View style={styles.cardFooter}>
            <View style={styles.showcaseTypeIndicator}>
              <Briefcase size={12} color={Colors.dark.success} />
              <Text style={styles.showcaseBadgeText}>PORTFOLIO</Text>
            </View>
            <View style={styles.ctaContainer}>
              <Text style={SharedCardStyles.ctaText}>View Showcase</Text>
              <ArrowUpRight size={12} color={Colors.dark.primary} />
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  floatingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ratingIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  modernLogo: {
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
  },
  logoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: `${Colors.dark.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.dark.primary}30`,
  },
  projectInfo: {
    flex: 1,
  },
  modernProjectTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  showcaseTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.success}15`,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  showcaseBadgeText: {
    color: Colors.dark.success,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default SharedShowcaseCard;
