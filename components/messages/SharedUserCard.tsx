import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import Avatar from '@/components/ui/Avatar';

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
  const router = useRouter();

  if (!user) {
    return null; // Don't render anything if user data is missing
  }

  const handlePress = () => {
    // Navigate to the full profile screen
    router.push(`/profile/${user._id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.8}>
      <View style={styles.userInfo}>
        <Avatar source={user.avatar || undefined} size={40} name={user.name} />
        <View style={styles.userDetails}>
          <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
          <Text style={styles.userHeadline} numberOfLines={1}>{user.headline || user.bio}</Text>
        </View>
      </View>
      <View style={styles.button}>
        <Text style={styles.buttonText}>View Profile</Text>
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
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userDetails: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  userHeadline: {
    color: Colors.dark.subtext,
    fontSize: 13,
    marginTop: 2,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SharedUserCard;