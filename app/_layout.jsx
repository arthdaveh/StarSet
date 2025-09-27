// app/_layout.jsx
import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#000" }}
      edges={["top", "left", "right"]}
    >
      <View style={styles.screen}>
        <StatusBar style="light" backgroundColor="#000" />
        {/* <Text style={{ color: "white" }}>Test</Text> */}
        <Stack
          screenOptions={{
            headerTransparent: true,
            headerTitle: "",
            headerTintColor: "#fff",
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 0,
    //paddingTop: 48,
  },
});
