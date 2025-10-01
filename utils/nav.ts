// utils/nav.ts
import { router } from 'expo-router';

export type UserPreview = {
  id: string;
  name: string;
  avatar?: string;
  headline?: string;
  bio?: string;
};

/**
 * Centralized helper to navigate to a user's profile while passing preview data.
 * This allows the profile screen to render instantly and reconcile in background.
 */
export function pushProfile(user: UserPreview) {
  if (!user || !user.id) {
    // Fallback: do nothing if we don't have an id
    return;
  }
  const payload = {
    id: String(user.id),
    name: user.name || 'User',
    avatar: user.avatar || '',
    headline: user.headline || '',
    bio: user.bio || '',
  } as const;

  router.push({
    pathname: `/profile/${payload.id}` as any,
    params: { userData: JSON.stringify(payload) },
  });
}
