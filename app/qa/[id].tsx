import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Share,
  Bookmark,
  MoreHorizontal,
  Send,
  Plus,
  Heart,
  Edit,
  Trash2,
  Flag,
  Copy
} from 'lucide-react-native';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { useCommunityStore } from '@/store/community-store';
import type { CommunityPost, CommunityComment } from '@/store/community-store';
import { useAuthStore } from '@/store/auth-store';
import Colors from '@/constants/colors';

export default function QADetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { communities, addComment, likePost, likeComment } = useCommunityStore();
  const { user, token } = useAuthStore();
  
  const [question, setQuestion] = useState<CommunityPost | null>(null);
  const [community, setCommunity] = useState<any>(null);
  const [answerText, setAnswerText] = useState('');
  const [quickAnswerText, setQuickAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [sortBy, setSortBy] = useState<'best' | 'newest' | 'oldest'>('best');
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [replyingToAnswer, setReplyingToAnswer] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    console.log('🔍 [QA Detail] useEffect triggered:', {
      questionId: id,
      communitiesCount: communities.length
    });
    
    if (id) {
      // Find the question across all communities
      for (const comm of communities) {
        console.log(`  🔍 Searching in community ${comm.name} (${comm.posts.length} posts)`);
        
        const foundQuestion = comm.posts.find((post: CommunityPost) => 
          post.id === id && (post.type === 'question' || (post as any).subtype === 'question')
        );
        
        if (foundQuestion) {
          console.log('  ✅ Found question:', {
            id: foundQuestion.id,
            type: foundQuestion.type,
            subtype: (foundQuestion as any).subtype,
            content: foundQuestion.content?.substring(0, 50) + '...'
          });
          setQuestion(foundQuestion);
          setCommunity(comm);
          break;
        }
      }
      
      // If we didn't find the question, log debugging info
      if (!question) {
        console.warn('⚠️ [QA Detail] Question not found. Available posts:');
        communities.forEach(comm => {
          console.log(`  Community ${comm.name}:`);
          comm.posts.forEach(post => {
            console.log(`    Post ${post.id}: type=${post.type}, subtype=${(post as any).subtype}`);
          });
        });
      }
    }
  }, [id, communities]);

  const handleBack = () => {
    router.back();
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  const handleLikeQuestion = async () => {
    if (!user || !token || !question) return;
    try {
      await likePost(token, question.id);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to like question');
    }
  };

  const handleLikeAnswer = (answerId: string) => {
    if (user) {
      likeComment(answerId, user.id);
    }
  };

  const isAnswerLiked = (answer: CommunityComment) => {
    return user && answer.likes && Array.isArray(answer.likes) && answer.likes.includes(user.id);
  };

  const handleSubmitAnswer = async () => {
    if (!user || !token || !question || !answerText.trim()) {
      Alert.alert('Error', 'Please enter your answer');
      return;
    }

    try {
      await addComment(token, question.id, answerText.trim());
      setAnswerText('');
      setShowAnswerModal(false);
      setIsAnswering(false);
      Alert.alert('Success', 'Your answer has been posted!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post answer');
    }
  };

  const handleQuickSubmitAnswer = async () => {
    if (!user || !token || !question || !quickAnswerText.trim()) {
      Alert.alert('Error', 'Please enter your answer');
      return;
    }

    try {
      await addComment(token, question.id, quickAnswerText.trim());
      setQuickAnswerText('');
      Alert.alert('Success', 'Your answer has been posted!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post answer');
    }
  };

  const getSortedAnswers = () => {
    if (!question || !question.comments) return [];
    
    const answers = [...question.comments];
    
    switch (sortBy) {
      case 'best':
        return answers.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
      case 'newest':
        return answers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return answers.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return answers;
    }
  };

  const isQuestionLiked = () => {
    return user && question && question.likes && Array.isArray(question.likes) && question.likes.includes(user.id);
  };

  const shareQuestion = () => {
    // Implement share functionality
    Alert.alert('Share', 'Share functionality would be implemented here');
  };

  const shareAnswer = (answerId: string, answerContent: string) => {
    Alert.alert(
      'Share Answer',
      'Choose how to share this answer:',
      [
        { text: 'Copy Link', onPress: () => Alert.alert('Copied', 'Answer link copied to clipboard') },
        { text: 'Share Text', onPress: () => Alert.alert('Share', `Answer: "${answerContent.substring(0, 50)}..."`) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleReplyToAnswer = (answerId: string) => {
    setReplyingToAnswer(answerId);
    setReplyText('');
  };

  const handleSubmitReply = async () => {
    if (!user || !token || !question || !replyText.trim() || !replyingToAnswer) {
      Alert.alert('Error', 'Please enter your reply');
      return;
    }

    try {
      // Add reply as a comment to the original question mentioning the answer
      const replyContent = `@${getSortedAnswers().find(a => a.id === replyingToAnswer)?.authorName} ${replyText.trim()}`;
      await addComment(token, question.id, replyContent);
      setReplyText('');
      setReplyingToAnswer(null);
      Alert.alert('Success', 'Your reply has been posted!');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post reply');
    }
  };

  const bookmarkQuestion = () => {
    // Implement bookmark functionality
    Alert.alert('Bookmark', 'Bookmark functionality would be implemented here');
  };

  if (!question || !community) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{
            headerShown: true,
            headerTitle: 'Question',
            headerStyle: { backgroundColor: Colors.dark.background },
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            ),
          }} 
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading question...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: '',
          headerStyle: { backgroundColor: Colors.dark.background },
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton} onPress={shareQuestion}>
                <Share size={20} color={Colors.dark.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton}>
                <MoreHorizontal size={20} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>
          ),
        }} 
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Community Info Header */}
        <View style={styles.communityHeader}>
          <View style={styles.communityInfo}>
            <Text style={styles.communityIcon}>{community.icon}</Text>
            <Text style={styles.communityName}>r/{community.name}</Text>
          </View>
          <Badge label="Q&A" variant="secondary" size="small" />
        </View>

        {/* Question Section */}
        <View style={styles.questionSection}>
          {/* Question Author */}
          <View style={styles.questionHeader}>
            <Avatar 
              source={question.authorAvatar} 
              name={question.authorName} 
              size={40} 
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>u/{question.authorName}</Text>
              <Text style={styles.timeAgo}>{formatTimeAgo(question.createdAt)}</Text>
            </View>
            <TouchableOpacity style={styles.menuButton}>
              <MoreHorizontal size={16} color={Colors.dark.subtext} />
            </TouchableOpacity>
          </View>

          {/* Question Content */}
          <View style={styles.questionContent}>
            <Text style={styles.questionText}>{question.content}</Text>
          </View>

          {/* Question Actions */}
          <View style={styles.questionActions}>
            <TouchableOpacity 
              style={styles.likeContainer}
              onPress={handleLikeQuestion}
              activeOpacity={0.7}
            >
              <Heart 
                size={20} 
                color={isQuestionLiked() ? Colors.dark.primary : Colors.dark.subtext}
                fill={isQuestionLiked() ? Colors.dark.primary : 'none'}
              />
              <Text style={styles.likeCount}>
                {(question.likes && Array.isArray(question.likes) && question.likes.length > 0) ? question.likes.length : '0'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setShowAnswerModal(true)}
            >
              <MessageSquare size={18} color={Colors.dark.subtext} />
              <Text style={styles.actionText}>
                {(question.comments && Array.isArray(question.comments)) ? question.comments.length : 0} {((question.comments && Array.isArray(question.comments)) ? question.comments.length : 0) === 1 ? 'Answer' : 'Answers'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={shareQuestion}>
              <Share size={18} color={Colors.dark.subtext} />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={bookmarkQuestion}>
              <Bookmark size={18} color={Colors.dark.subtext} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Answer Section */}
        <View style={styles.answersSection}>
          <View style={styles.answersHeader}>
            <Text style={styles.answersTitle}>
              {(question.comments && Array.isArray(question.comments)) ? question.comments.length : 0} {((question.comments && Array.isArray(question.comments)) ? question.comments.length : 0) === 1 ? 'Answer' : 'Answers'}
            </Text>
            
            {/* Sort Options */}
            <View style={styles.sortContainer}>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'best' && styles.sortButtonActive]}
                onPress={() => setSortBy('best')}
              >
                <Text style={[styles.sortText, sortBy === 'best' && styles.sortTextActive]}>
                  Best
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'newest' && styles.sortButtonActive]}
                onPress={() => setSortBy('newest')}
              >
                <Text style={[styles.sortText, sortBy === 'newest' && styles.sortTextActive]}>
                  Newest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.sortButton, sortBy === 'oldest' && styles.sortButtonActive]}
                onPress={() => setSortBy('oldest')}
              >
                <Text style={[styles.sortText, sortBy === 'oldest' && styles.sortTextActive]}>
                  Oldest
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Answers List */}
          <View style={styles.answersContainer}>
            {getSortedAnswers().length > 0 ? (
              getSortedAnswers().map((answer: CommunityComment, index) => (
                <View key={answer.id} style={styles.answerCard}>
                  {/* Answer Header */}
                  <View style={styles.answerHeader}>
                    <Avatar 
                      source={answer.authorAvatar} 
                      name={answer.authorName} 
                      size={36} 
                    />
                    <View style={styles.answerAuthorInfo}>
                      <Text style={styles.answerAuthorName}>u/{answer.authorName}</Text>
                      <Text style={styles.answerTimeAgo}>{formatTimeAgo(answer.createdAt)}</Text>
                    </View>
                    <TouchableOpacity style={styles.answerMenuButton}>
                      <MoreHorizontal size={14} color={Colors.dark.subtext} />
                    </TouchableOpacity>
                  </View>

                  {/* Answer Content */}
                  <View style={styles.answerContentContainer}>
                    <Text style={styles.answerText}>{answer.content}</Text>
                  </View>

                  {/* Answer Actions */}
                  <View style={styles.answerActions}>
                    <TouchableOpacity 
                      style={styles.answerLikeContainer}
                      onPress={() => handleLikeAnswer(answer.id)}
                      activeOpacity={0.7}
                    >
                      <Heart 
                        size={16} 
                        color={isAnswerLiked(answer) ? Colors.dark.primary : Colors.dark.subtext}
                        fill={isAnswerLiked(answer) ? Colors.dark.primary : 'none'}
                      />
                      <Text style={styles.answerLikeCount}>
                        {answer.likes?.length || 0}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.answerActionButton}
                      onPress={() => handleReplyToAnswer(answer.id)}
                      activeOpacity={0.7}
                    >
                      <MessageSquare size={14} color={Colors.dark.subtext} />
                      <Text style={styles.answerActionText}>Reply</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.answerActionButton}
                      onPress={() => shareAnswer(answer.id, answer.content)}
                      activeOpacity={0.7}
                    >
                      <Share size={14} color={Colors.dark.subtext} />
                      <Text style={styles.answerActionText}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  {index < getSortedAnswers().length - 1 && (
                    <View style={styles.answerSeparator} />
                  )}
                </View>
              ))
            ) : (
              <View style={styles.noAnswersContainer}>
                <MessageSquare size={48} color={Colors.dark.subtext} />
                <Text style={styles.noAnswersTitle}>No answers yet</Text>
                <Text style={styles.noAnswersSubtext}>
                  Be the first to answer this question!
                </Text>
                <Button
                  title="Write an Answer"
                  onPress={() => setShowAnswerModal(true)}
                  style={styles.firstAnswerButton}
                  size="small"
                />
              </View>
            )}
          </View>
        </View>
        
        {/* Bottom padding to ensure content is visible above input */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Quick Answer Input - Fixed at bottom */}
      {user && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.quickAnswerContainer}>
            <View style={styles.quickAnswerInputRow}>
              <Avatar 
                source={user.avatar} 
                name={user.name} 
                size={36} 
              />
              <TextInput
                style={styles.quickAnswerInput}
                placeholder="Write your answer..."
                placeholderTextColor={Colors.dark.subtext}
                value={quickAnswerText}
                onChangeText={setQuickAnswerText}
                multiline
                maxLength={500}
                onFocus={() => setIsAnswering(true)}
                onBlur={() => setIsAnswering(false)}
              />
              
              {quickAnswerText.trim() ? (
                <TouchableOpacity 
                  style={styles.quickSendButton}
                  onPress={handleQuickSubmitAnswer}
                >
                  <Send size={20} color={Colors.dark.primary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.quickExpandButton}
                  onPress={() => setShowAnswerModal(true)}
                >
                  <Plus size={20} color={Colors.dark.subtext} />
                </TouchableOpacity>
              )}
            </View>
            
            {isAnswering && quickAnswerText.length > 0 && (
              <View style={styles.quickAnswerMeta}>
                <Text style={styles.characterCount}>
                  {quickAnswerText.length}/500
                </Text>
                <TouchableOpacity 
                  style={styles.expandToModalButton}
                  onPress={() => {
                    setAnswerText(quickAnswerText);
                    setQuickAnswerText('');
                    setShowAnswerModal(true);
                  }}
                >
                  <Text style={styles.expandToModalText}>Expand</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Floating Answer Button */}
      <TouchableOpacity 
        style={styles.floatingAnswerButton}
        onPress={() => setShowAnswerModal(true)}
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>

      {/* Answer Modal */}
      <Modal
        visible={showAnswerModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAnswerModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAnswerModal(false)} 
              style={styles.modalBackButton}
            >
              <ArrowLeft size={24} color={Colors.dark.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Write Your Answer</Text>
            <TouchableOpacity 
              onPress={handleSubmitAnswer}
              disabled={!answerText.trim()}
              style={[
                styles.modalSubmitButton,
                !answerText.trim() && styles.modalSubmitButtonDisabled
              ]}
            >
              <Send size={20} color={answerText.trim() ? Colors.dark.primary : Colors.dark.subtext} />
            </TouchableOpacity>
          </View>

          {/* Question Context */}
          <View style={styles.questionContext}>
            <View style={styles.questionContextHeader}>
              <Avatar 
                source={question.authorAvatar} 
                name={question.authorName} 
                size={24} 
              />
              <Text style={styles.questionContextAuthor}>u/{question.authorName} asked:</Text>
            </View>
            <Text style={styles.questionContextContent}>{question.content}</Text>
          </View>

          {/* Answer Input */}
          <View style={styles.answerInputContainer}>
            <TextInput
              style={styles.answerInput}
              placeholder="Write your answer here..."
              placeholderTextColor={Colors.dark.subtext}
              value={answerText}
              onChangeText={setAnswerText}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>

          {/* Answer Tips */}
          <View style={styles.answerTips}>
            <Text style={styles.answerTipsTitle}>Tips for a great answer:</Text>
            <Text style={styles.answerTip}>• Be specific and provide details</Text>
            <Text style={styles.answerTip}>• Share your experience or knowledge</Text>
            <Text style={styles.answerTip}>• Be respectful and constructive</Text>
            <Text style={styles.answerTip}>• Use examples when possible</Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  
  // Community Header
  communityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.dark.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  communityIcon: {
    fontSize: 20,
  },
  communityName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // Question Section
  questionSection: {
    backgroundColor: Colors.dark.background,
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: Colors.dark.border,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600',
  },
  timeAgo: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    padding: 4,
  },
  questionContent: {
    marginBottom: 16,
  },
  questionText: {
    color: Colors.dark.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '500',
  },
  questionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  likeCount: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  actionText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    fontWeight: '500',
  },

  // Answers Section
  answersSection: {
    backgroundColor: Colors.dark.background,
    paddingTop: 16,
  },
  answersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  answersTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  sortContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 2,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sortButtonActive: {
    backgroundColor: Colors.dark.primary,
  },
  sortText: {
    color: Colors.dark.subtext,
    fontSize: 12,
    fontWeight: '500',
  },
  sortTextActive: {
    color: 'white',
  },
  answersContainer: {
    paddingHorizontal: 16,
  },

  // Answer Card
  answerCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerAuthorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  answerAuthorName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  answerTimeAgo: {
    color: Colors.dark.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  answerMenuButton: {
    padding: 4,
  },
  answerContentContainer: {
    marginBottom: 12,
  },
  answerText: {
    color: Colors.dark.text,
    fontSize: 16,
    lineHeight: 22,
  },
  answerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  answerLikeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  answerLikeCount: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 16,
    textAlign: 'center',
  },
  answerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  answerActionText: {
    color: Colors.dark.subtext,
    fontSize: 12,
  },
  answerSeparator: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginTop: 16,
    marginHorizontal: -16,
  },

  // No Answers State
  noAnswersContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    marginBottom: 20,
  },
  noAnswersTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noAnswersSubtext: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  firstAnswerButton: {
    minWidth: 140,
  },

  // Floating Button
  floatingAnswerButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalSubmitButton: {
    padding: 8,
    marginRight: -8,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.5,
  },

  // Question Context in Modal
  questionContext: {
    backgroundColor: `${Colors.dark.card}40`,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.primary,
  },
  questionContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  questionContextAuthor: {
    color: Colors.dark.subtext,
    fontSize: 13,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  questionContextContent: {
    color: Colors.dark.text,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Answer Input
  answerInputContainer: {
    flex: 1,
    margin: 16,
  },
  answerInput: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.dark.text,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },

  // Answer Tips
  answerTips: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 16,
    margin: 16,
    marginTop: 0,
  },
  answerTipsTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  answerTip: {
    color: Colors.dark.subtext,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },

  // Bottom Padding
  bottomPadding: {
    height: 100,
  },

  // Quick Answer Input
  quickAnswerContainer: {
    backgroundColor: Colors.dark.background,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickAnswerInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  quickAnswerInput: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.dark.text,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  quickSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.dark.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickExpandButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  quickAnswerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  characterCount: {
    color: Colors.dark.subtext,
    fontSize: 12,
  },
  expandToModalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  expandToModalText: {
    color: Colors.dark.primary,
    fontSize: 12,
    fontWeight: '500',
  },
});
