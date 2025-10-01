import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Pressable 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { pushProfile } from '@/utils/nav';
import { User, ArrowRight, MapPin, Briefcase } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Avatar from '@/components/ui/Avatar';
import { SharedCardStyles, AnimationValues, CardGradients } from './shared-card-styles';

// Define the shape of the user data this card will receive
interface UserData {
  _id: string;
  name: string;
  headline?: string;
  bio?: string;
  avatar?: string | null;
}

interface SharedUserCardProps {
  user: UserData;
}

const SharedUserCard: React.FC<SharedUserCardProps> = ({ user }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  if (!user) {
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
    pushProfile({
      id: user._id,
      name: user.name,
      avatar: user.avatar ?? undefined,
      headline: user.headline ?? undefined,
      bio: user.bio ?? undefined,
    });
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable 
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={SharedCardStyles.modernCardContainer}
      >
        <View style={SharedCardStyles.modernContent}>
          {/* User Profile Section */}
          <View style={SharedCardStyles.modernHeader}>
            <View style={SharedCardStyles.modernAvatar}>
              <Avatar source={user.avatar || undefined} size={48} name={user.name} />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.modernUserName} numberOfLines={1}>{user.name}</Text>
              {user.headline && (
                <View style={styles.headlineContainer}>
                  <Briefcase size={12} color={Colors.dark.subtext} />
                  <Text style={styles.modernHeadline} numberOfLines={1}>{user.headline}</Text>
                </View>
              )}
              {user.bio && !user.headline && (
                <Text style={SharedCardStyles.secondaryText} numberOfLines={2}>{user.bio}</Text>
              )}
            </View>
          </View>
          
          {/* Profile Type Badge */}
          <View style={styles.profileBadge}>
            <User size={10} color={Colors.dark.secondary} />
            <Text style={styles.profileBadgeText}>PROFILE</Text>
          </View>
          
          {/* Modern Gradient Button */}
          <LinearGradient
            colors={CardGradients.primary}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.modernButtonText}>View Profile</Text>
              <ArrowRight size={14} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  userDetails: {
    flex: 1,
  },
  modernUserName: {
    color: Colors.dark.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  headlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  modernHeadline: {
    color: Colors.dark.subtext,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.dark.secondary}15`,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 4,
  },
  profileBadgeText: {
    color: Colors.dark.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gradientButton: {
    borderRadius: 14,
    padding: 1,
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  modernButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default SharedUserCard;