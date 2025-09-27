import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import React from "react";

export const AddWorkout = ({ value, onChange, onCancel, onSave }) => {
  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Workout name"
        placeholderTextColor="#888"
        value={value}
        onChangeText={onChange}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSave}
        maxLength={30}
      />
      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtn} onPress={onCancel}>
          <Text style={styles.actionBtnText}>Cancel</Text>
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={onSave}>
          <Text style={styles.actionBtnText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    marginTop: 12,
    backgroundColor: "#111",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
  },

  actionRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 8 },
  actionBtn: {
    backgroundColor: "#222",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionBtnText: { color: "white", fontWeight: "600" },
});
