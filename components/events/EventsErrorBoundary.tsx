import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from '@/components/ui/Button';

interface EventsErrorBoundaryProps {
  error: Error | null;
  retry: () => void;
  isLoading?: boolean;
}

export default function EventsErrorBoundary({ error, retry, isLoading = false }: EventsErrorBoundaryProps) {
  if (!error) return null;

  const getErrorMessage = (error: Error) => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return {
        title: 'Connection Error',
        description: 'Please check your internet connection and try again.',
        action: 'Retry'
      };
    }
    
    if (message.includes('401') || message.includes('unauthorized')) {
      return {
        title: 'Authentication Error', 
        description: 'Please log in again to continue.',
        action: 'Login'
      };
    }
    
    if (message.includes('404')) {
      return {
        title: 'Not Found',
        description: 'The requested event could not be found.',
        action: 'Go Back'
      };
    }
    
    if (message.includes('500')) {
      return {
        title: 'Server Error',
        description: 'Something went wrong on our end. Please try again later.',
        action: 'Retry'
      };
    }
    
    return {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Please try again.',
      action: 'Retry'
    };
  };

  const errorInfo = getErrorMessage(error);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={48} color={Colors.dark.error} />
        </View>
        
        <Text style={styles.title}>{errorInfo.title}</Text>
        <Text style={styles.description}>{errorInfo.description}</Text>
        
        <Button
          title={errorInfo.action}
          onPress={retry}
          isLoading={isLoading}
          style={styles.retryButton}
          leftIcon={<RefreshCw size={18} color="#fff" />}
        />
        
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>{error.message}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    color: Colors.dark.subtext,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    width: '100%',
    marginBottom: 20,
  },
  debugContainer: {
    backgroundColor: Colors.dark.card,
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginTop: 16,
  },
  debugTitle: {
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  debugText: {
    color: Colors.dark.subtext,
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
