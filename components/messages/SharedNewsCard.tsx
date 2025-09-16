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
import { Newspaper, Clock, ExternalLink } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { SharedCardStyles, AnimationValues, CardGradients } from './shared-card-styles';

// --- Interfaces for the component's props ---
interface NewsArticleData {
  _id: string;
  headline: string;
  bannerImage?: string | null;
  source?: string; // Optional: to show the news source
}

interface SharedNewsCardProps {
  news: NewsArticleData;
}

const SharedNewsCard: React.FC<SharedNewsCardProps> = ({ news }) => {
  const router = useRouter();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // If there's no news data, render nothing.
  if (!news) {
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
    router.push(`/news/${news._id}`);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={SharedCardStyles.modernCardContainer}
      >
        {/* News Image with Gradient Overlay */}
        {news.bannerImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: news.bannerImage }} style={SharedCardStyles.modernImage} resizeMode="cover" />
            <LinearGradient
              colors={CardGradients.overlay}
              style={styles.imageGradient}
            />
            {/* Floating news badge */}
            <View style={styles.floatingBadge}>
              <Newspaper size={12} color="#FFFFFF" />
              <Text style={styles.floatingBadgeText}>NEWS</Text>
            </View>
          </View>
        )}
        
        <View style={SharedCardStyles.modernContent}>
          {/* Source Info with Modern Badge */}
          {news.source && (
            <View style={styles.sourceBadge}>
              <Text style={SharedCardStyles.badgeText}>{news.source}</Text>
            </View>
          )}
          
          {/* News Headline */}
          <Text style={styles.modernHeadline} numberOfLines={3}>
            {news.headline}
          </Text>
          
          {/* Modern Footer with CTA */}
          <View style={styles.cardFooter}>
            <View style={styles.timeIndicator}>
              <Clock size={10} color={Colors.dark.subtext} />
              <Text style={SharedCardStyles.metaText}>Breaking News</Text>
            </View>
            <View style={styles.ctaContainer}>
              <Text style={SharedCardStyles.ctaText}>Read Article</Text>
              <ExternalLink size={12} color={Colors.dark.primary} />
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
  sourceBadge: {
    backgroundColor: `${Colors.dark.info}20`,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  modernHeadline: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  timeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default SharedNewsCard;