// store/auth-store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import { getUser } from '@/api/user';
import { mapUserFromApi } from '@/utils/mapUserFromApi';
import { registerForPushNotificationsAsync } from '@/services/push-notification.service';
import { socketService } from '@/services/socketService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://social-backend-y1rg.onrender.com';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  init: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUserData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      /**
       * NEW: Initializes the auth state.
       * Should be called once when the app starts.
       * It checks if a token exists in storage and connects the socket if so.
       */
      init: () => {
        const { token } = get();
        if (token) {
          console.log('[AuthStore] App started with existing token. Connecting socket...');
          set({ isAuthenticated: true });
          socketService.connect(token);
        } else {
          console.log('[AuthStore] App started with no token.');
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        //console.log('--- Initiating Login ---');

        try {
          if (!email || !password) {
            throw new Error('Email and password are required');
          }

          const cleanEmail = String(email).trim();
          const cleanPassword = String(password).trim();
          
          if (cleanEmail.length === 0 || cleanPassword.length === 0) {
            throw new Error('Email or password cannot be empty');
          }
          
          const requestBody = { email: cleanEmail, password: cleanPassword };
          //console.log('1. [Request] Sending login credentials:', requestBody.email);

          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          //console.log('2. [Response] Received status:', response.status);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Login API call failed');
          }
          
          //console.log('3. [Auth] Login successful. Token received:', data.token ? 'Yes' : 'No');

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });

          //console.log('4. [Socket] Connecting with token...');
          // Connect socket after successful login
          console.log('[AuthStore] Login successful. Connecting socket...');
          socketService.connect(data.token);
          
          try {
            //console.log('5. [Push Notifications] Attempting to register device...');
            await registerForPushNotificationsAsync(data.token);
            //console.log('...Push notification registration complete.');
          } catch(e: any) {
            //console.error('...Push notification registration failed:', e.message);
          }

          //console.log('6. [User Data] Fetching full user profile...');
          await get().refreshUserData();

        } catch (error: any) {
          //console.error('❌ LOGIN FAILED:', error.message);
          set({
            error: error.message,
            isLoading: false,
          });
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null });

        try {
          // Validate inputs first
          if (!name || !email || !password) {
            throw new Error('Name, email and password are required');
          }

          // Ensure all values are clean strings
          const cleanName = String(name).trim();
          const cleanEmail = String(email).trim();
          const cleanPassword = String(password).trim();
           
          // Validate after cleaning
          if (cleanName.length === 0) {
            throw new Error('Name cannot be empty');
          }
          if (cleanEmail.length === 0) {
            throw new Error('Email cannot be empty');
          }
          if (cleanPassword.length === 0) {
            throw new Error('Password cannot be empty');
          }
          if (cleanPassword.length < 6) {
            throw new Error('Password must be at least 6 characters long');
          }
          
          const requestBody = {
            name: cleanName,
            email: cleanEmail,
            password: cleanPassword,
            confirmPassword: cleanPassword,
          };
          
          
          
          // console.log('Request body:', JSON.stringify(requestBody, null, 2));
          
          const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
          }

          // Merge both: use data.user if present, otherwise construct user object
          // console.log('User Token:', data.token);

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });

          socketService.connect(data.token);

          // --- Register for push notifications after successful registration ---
          try {
              //console.log('Attempting to register for push notifications after registration...');
              await registerForPushNotificationsAsync(data.token);
              //console.log('Push notification registration process completed.');
          } catch(e) {
              console.error("Failed to register for push notifications during registration flow:", e);
          }

          await get().refreshUserData();

        } catch (error: any) {
          console.error('❌ Registration error:', error.message || error);
          set({
            error: error.message || 'Registration failed. Please try again.',
            isLoading: false,
          })
        }
      },

      logout: () => {
        //console.log('--- Logging out ---');
        //console.log('1. [Socket] Disconnecting socket.');
        console.log('[AuthStore] Logging out. Disconnecting socket.');
        socketService.disconnect();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        //console.log('2. [State] Auth state cleared.');
      },

      updateUser: (userData) => {
        set(state => ({
          user: state.user ? { ...state.user, ...userData } : null
        }));
      },

      refreshUserData: async () => {
        const state = get();
        if (!state.token) {
            //console.log('...Skipping refresh: No token found.');
            return;
        }

        try {
          //console.log('...[Refresh] Calling getUser API.');
          const userResponse = await getUser(state.token);
          
          let userData;
          if (userResponse.body) userData = userResponse.body;
          else if (userResponse.user) userData = userResponse.user;
          else userData = userResponse;
          
          if (!userData) {
            throw new Error('No user data structure found in API response');
          }

          //console.log('...[Refresh] Mapping API data to user object.');
          const mappedUser = mapUserFromApi(userData);
          
          set({ user: mappedUser });
          //console.log('✅ User data refreshed and state updated successfully.');

        } catch (error: any) {
          //console.error('❌ REFRESH FAILED:', error.message);
          // Optional: handle token expiration by logging out
          if (error.message.includes("Unauthorized") || error.message.includes("invalid")) {
              get().logout();
          }
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // IMPORTANT: This function runs after the store has been rehydrated from storage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // After the token is loaded from AsyncStorage, call init()
          state.init();
        }
      }
    }
  )
);