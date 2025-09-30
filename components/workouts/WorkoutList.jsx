import { StyleSheet, View, FlatList } from "react-native";
import React from "react";
import { WorkoutCard } from "./WorkoutCard";

export const WorkoutList = ({
  workouts,
  onPress,
  onRemove,
  onRename,
  onMove,
}) => {
  return (
    <FlatList
      data={workouts}
      style={styles.list}
      keyExtractor={(w) => w.id}
      renderItem={({ item }) => (
        <WorkoutCard
          id={item.id}
          name={item.name}
          onPress={onPress}
          onRemove={onRemove}
          onRename={onRename}
          onMove={onMove}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: { marginTop: 12, gap: 10, paddingBottom: 400 },
});
