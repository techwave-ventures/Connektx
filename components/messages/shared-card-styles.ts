import { StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

export const SharedCardStyles = StyleSheet.create({
  // Base card container with modern styling
  modernCardContainer: {
    marginTop: 12,
    marginHorizontal: 4,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // Modern image styling with subtle overlay
  modernImage: {
    width: '100%',
    height: 140,
  },

  // Gradient overlay for images
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },

  // Content area with improved padding and spacing
  modernContent: {
    padding: 16,
  },

  // Header section with better alignment
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  // Modern avatar/logo styling
  modernAvatar: {
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Enhanced text hierarchy
  primaryText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 6,
  },

  secondaryText: {
    color: Colors.dark.subtext,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },

  metaText: {
    color: Colors.dark.subtext,
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },

  // Modern button styles with gradient
  modernButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  modernButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Subtle call-to-action text
  ctaText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.3,
  },

  // Badge styling for categories/sources
  badge: {
    backgroundColor: `${Colors.dark.primary}20`,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },

  badgeText: {
    color: Colors.dark.primary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Info row for metadata
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  // Divider for visual separation
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: 12,
    opacity: 0.5,
  },

  // Footer area
  modernFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: `${Colors.dark.border}50`,
  },

  // Pill-shaped elements
  pill: {
    backgroundColor: `${Colors.dark.subtext}15`,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  pillText: {
    color: Colors.dark.subtext,
    fontSize: 12,
    fontWeight: '500',
  },

});

// Animation values for modern interactions
export const AnimationValues = {
  pressScale: 0.98,
  pressOpacity: 0.8,
  animationDuration: 150,
};

// Gradient colors for modern cards
export const CardGradients = {
  primary: ['#3B82F6', '#8B5CF6'] as const,
  secondary: ['#8B5CF6', '#EC4899'] as const,
  success: ['#22C55E', '#16A34A'] as const,
  warning: ['#EAB308', '#F59E0B'] as const,
  overlay: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)'] as const,
};
