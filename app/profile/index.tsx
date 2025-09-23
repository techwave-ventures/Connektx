import { Redirect } from "expo-router";
import { useAuthStore } from '@/store/auth-store';
import { ActivityIndicator, View } from "react-native";

export default function ProfileIndex() {
  const { user, isLoading } = useAuthStore(); // assuming your store exposes loading

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  return <Redirect href={`/profile/${user.id}`} />;
}

