import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';

interface LoadMoreButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  disabled?: boolean;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onPress,
  isLoading = false,
  hasMore = true,
  disabled = false
}) => {
  if (!hasMore) {
    return (
      <View style={styles.endContainer}>
        <Text style={styles.endText}>No more posts to load</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          (isLoading || disabled) && styles.buttonDisabled
        ]}
        onPress={onPress}
        disabled={isLoading || disabled}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="small"
              color={Colors.dark.primary}
              style={styles.spinner}
            />
            <Text style={styles.loadingText}>Loading more posts...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Load More Posts</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  button: {
    backgroundColor: Colors.dark.cardBackground,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  loadingText: {
    color: Colors.dark.text,
    fontSize: 14,
  },
  endContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    opacity: 0.7,
  },
});

export default LoadMoreButton;
