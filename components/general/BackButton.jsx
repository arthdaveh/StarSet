import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

function BackButton() {
  const router = useRouter();

  if (!router.canGoBack()) {
    return null; // don’t show if nothing to go back to
  }

  return (
    <Pressable
      onPress={() => router.back()}
      style={{ position: "absolute", top: 50, left: 16, zIndex: 10 }}
      hitSlop={12}
    >
      <Text style={{ color: "white", fontSize: 24 }}>‹</Text>
    </Pressable>
  );
}
