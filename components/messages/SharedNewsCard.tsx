import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { Newspaper } from 'lucide-react-native'; // Using a relevant icon

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

  // If there's no news data, render nothing.
  if (!news) {
    return null;
  }

  const handlePress = () => {
    // Navigate to the specific news detail screen when the card is pressed.
    router.push(`/news/${news._id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      {/* Display the banner image if available */}
      {news.bannerImage && (
        <Image source={{ uri: news.bannerImage }} style={styles.newsImage} />
      )}
      <View style={styles.newsContent}>
        {/* Display the source if available */}
        {news.source && (
          <View style={styles.sourceInfo}>
            <Newspaper size={14} color={Colors.dark.subtext} />
            <Text style={styles.sourceText}>{news.source}</Text>
          </View>
        )}
        {/* Display the headline */}
        <Text style={styles.headlineText} numberOfLines={3}>
          {news.headline}
        </Text>
        <Text style={styles.viewNewsText}>View News</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  newsImage: {
    width: '100%',
    height: 120, // Same height as the post card image for consistency
  },
  newsContent: {
    padding: 12,
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceText: {
    marginLeft: 6,
    color: Colors.dark.subtext,
    fontSize: 12,
    fontWeight: '500',
  },
  headlineText: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 20,
  },
  viewNewsText: {
    color: Colors.dark.primary,
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4,
  },
});

export default SharedNewsCard;