import { StyleSheet, View, FlatList, Keyboard } from "react-native";
import React from "react";
import ExerciseCard from "./ExerciseCard";
import { EXERCISE_TYPES } from "../general/exerciseTypes";

const ExerciseList = ({
  exercises,
  exercisesById,
  onRemove,
  onReadSession,
  onPersistSession,
  selectedDate,
  onRename,
  onMove,
  onChangeUnits,
  onReadPrevSession,
  onOpenHistory,
  utils,
}) => {
  return (
    <FlatList
      data={exercises} //
      keyExtractor={(id) => id}
      renderItem={({ item: id }) => (
        <ExerciseCard
          id={id}
          name={exercisesById[id]?.name || "Exercise"}
          onRemove={onRemove}
          onReadSession={onReadSession}
          onPersistSession={onPersistSession}
          selectedDate={selectedDate}
          onRename={onRename}
          onMove={onMove}
          unit={exercisesById[id]?.unit}
          onChangeUnits={onChangeUnits}
          onReadPrevSession={onReadPrevSession}
          onOpenHistory={onOpenHistory}
          display={exercisesById[id]?.display}
          unitOptions={EXERCISE_TYPES[exercisesById[id]?.type]?.unitOptions}
          utils={utils}
          type={exercisesById[id]?.type}
        />
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => Keyboard.dismiss()}
    />
  );
};

export default ExerciseList;

const styles = StyleSheet.create({
  list: {
    marginTop: 12,
    gap: 25,
    paddingBottom: 400,
  },
});
