import { Tabs } from "expo-router";
import Entypo from "@expo/vector-icons/Entypo";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MainLayout() {
  const size = 36;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#000" }}
      edges={["bottom"]}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            paddingTop: 5,
            backgroundColor: "#000",
            borderTopWidth: 1,
            borderTopColor: "transparent",
            elevation: 0,
            shadowOpacity: 0,
            position: "absolute",
            bottom: 0, // stick to screen bottom
            height: 60,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarShowLabel: false,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 144,
                  height: 48,

                  borderRadius: 24,
                  //backgroundColor: focused ? "blue" : "gray",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {focused ? (
                  <Entypo name="star" size={size} color="white" />
                ) : (
                  <Entypo name="star-outlined" size={size} color="white" />
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 144,
                  height: 48,
                  borderRadius: 24,
                  //backgroundColor: focused ? "blue" : "gray",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {focused ? (
                  <Entypo name="star" size={size} color="white" />
                ) : (
                  <Entypo name="star-outlined" size={size} color="white" />
                )}
              </View>
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
