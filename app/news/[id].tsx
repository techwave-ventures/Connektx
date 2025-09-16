import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNewsStore } from '@/store/news-store';
import AppHeader from '@/components/layout/AppHeader';
import SimpleInAppBrowser from '@/components/ui/SimpleInAppBrowser';
import Colors from '@/constants/colors';
import dayjs from 'dayjs';
import { Heart, Share2, Bookmark } from 'lucide-react-native';
import { ShareBottomSheet } from '@/components/ui/ShareBottomSheet';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { articles, bookmarkArticle, likeArticle} = useNewsStore();


  // const [showInAppBrowser, setShowInAppBrowser] = useState(false);
  const savedArticles = useNewsStore().savedArticles;

  // --- SOLUTION 2: Add state for the Share Bottom Sheet ---
  const [showInAppBrowser, setShowInAppBrowser] = useState(false);
  const [isShareVisible, setIsShareVisible] = useState(false);
  const [contentToShare, setContentToShare] = useState<{ id: string; type: 'post' | 'news' } | null>(null);


  let article = articles.find(item => item._id === id);
  if (!article) {
    article = savedArticles.find(item => item._id === id)
  }

  const handleBookmark = () => {
    if (article) {
      bookmarkArticle(article._id);
    }
  };

  // --- SOLUTION 3: Create handlers for sharing ---
  const handleShare = () => {
    if (article) {
      setContentToShare({ id: article._id, type: 'news' });
      setIsShareVisible(true);
    }
  };

   const handleCloseShareSheet = () => {
    setIsShareVisible(false);
    setContentToShare(null);
  };

  const handleLike = (articleId: string) => {
    likeArticle(articleId);
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>Article not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="News Detail" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {article.bannerImage && (
          <Image source={{ uri: article.bannerImage }} style={styles.image} />
        )}
        
        <Text style={styles.title}>{article.headline}</Text>

        <Text style={styles.date}>
          {dayjs(article.timestamp).format('MMMM D, YYYY')}
        </Text>

        <Text style={styles.description}>{article.article}</Text>

        <TouchableOpacity
          style={styles.readMoreContainer}
          onPress={() => {
            setShowInAppBrowser(true);
          }}
        >
          <Text style={styles.readMore}>Read More</Text>
        </TouchableOpacity>

        {/* Actions moved inside ScrollView for better layout */}
        <View style={styles.articleActions}>
           <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(article._id)}>
          <Heart 
            size={24} 
            color={article.isLiked ? 'red' : Colors.dark.text}
            fill={article.isLiked ? 'red' : 'none'}
          />
          <Text style={styles.actionCount}>{article.likes}</Text>
        </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Share2 size={24} color={Colors.dark.text} />
          </TouchableOpacity>

          {/* --- SOLUTION 4: Attach the handler to the Share button --- */}
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => handleBookmark()}>
            <Bookmark 
              size={24} 
              color={Colors.dark.text} 
              fill={article.isSaved ? Colors.dark.text : 'transparent'} 
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SimpleInAppBrowser
        visible={showInAppBrowser}
        url={article.ref || 'https://www.google.com'}
        title={article.headline}
        onClose={() => setShowInAppBrowser(false)}
      />

      {/* --- SOLUTION 5: Render the ShareBottomSheet --- */}
      <ShareBottomSheet
        visible={isShareVisible}
        onClose={handleCloseShareSheet}
        contentId={contentToShare?.id || null}
        contentType={contentToShare?.type || null}
      />


    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.dark.text,
    textAlign: 'justify',
    marginBottom: 16,
  },
  readMoreContainer: {
  alignItems: 'flex-end',
  marginTop: 8,
  },
  readMore: {
    color: Colors.light.text,
    backgroundColor: Colors.dark.secondary,
    borderRadius: 5,
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
    padding: 5,
    paddingLeft: 20,
    paddingRight: 20,
    alignItems:'flex-end'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  articleActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.background,
  },
  actionCount: {
    color: Colors.dark.text,
    marginTop: 4,
    fontSize: 12,
  },
  actionButton: {
    alignItems: 'center',
  },
});
