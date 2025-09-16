// utils/token-utils.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Gets the authentication token from storage
 * This utility breaks the require cycle between auth-store and push-notification service
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('token');
  } catch (error) {
    console.error('[Token Utils] Error getting auth token:', error);
    return null;
  }
};

/**
 * Gets the authentication token synchronously from zustand store
 * Use this when you need immediate access to the token
 */
export const getAuthTokenSync = (): string | null => {
  try {
    // Dynamically import to avoid circular dependency
    const { useAuthStore } = require('../store/auth-store');
    return useAuthStore.getState().token;
  } catch (error) {
    console.error('[Token Utils] Error getting auth token sync:', error);
    return null;
  }
};

/**
 * Sets the authentication token in storage
 */
export const setAuthToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('token', token);
  } catch (error) {
    console.error('[Token Utils] Error setting auth token:', error);
  }
};

/**
 * Removes the authentication token from storage
 */
export const removeAuthToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('token');
  } catch (error) {
    console.error('[Token Utils] Error removing auth token:', error);
  }
};
