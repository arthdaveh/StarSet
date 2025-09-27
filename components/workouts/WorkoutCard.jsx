import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import React, { useState } from "react";

export const WorkoutCard = ({
  id,
  name,
  onPress,
  onRemove,
  onRename,
  onMove,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(name);

  const openMenu = () => {
    if (Platform.OS === "ios" && Alert.prompt) {
      Alert.alert(name, "What do you want to do?", [
        { text: "Move up", onPress: () => onMove?.(id, "up") },
        { text: "Move down", onPress: () => onMove?.(id, "down") },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemove?.(id),
        },
        {
          text: "Rename",
          onPress: () => {
            Alert.prompt(
              "Rename workout",
              undefined,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Save",
                  onPress: (text) => {
                    const next = String(text ?? "").trim();
                    if (next) onRename?.(id, next);
                  },
                },
              ],
              "plain-text",
              name
            );
          },
        },

        { text: "Cancel", style: "cancel" },
      ]);
    } else {
      setRenameDraft(name);
      setIsRenaming(true);
    }
  };

  const saveInlineRename = () => {
    const next = String(renameDraft ?? "").trim();
    if (next) onRename?.(id, next);
    setIsRenaming(false);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.baseCard, pressed && styles.pressedCard]}
      onPress={() => onPress?.(id, name)}
      onLongPress={openMenu}
      delayLongPress={300}
    >
      {isRenaming ? (
        <View style={styles.renameRow}>
          <TextInput
            style={styles.renameInput}
            value={renameDraft}
            onChangeText={setRenameDraft}
            placeholder="Workout name"
            placeholderTextColor="#888"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={saveInlineRename}
          />
          <Pressable
            style={styles.renameBtn}
            onPress={() => setIsRenaming(false)}
          >
            <Text style={styles.renameBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.renameBtn} onPress={saveInlineRename}>
            <Text style={styles.renameBtnText}>Save</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.row}>
          <Text style={styles.cardTitle}>{name}</Text>
          <Pressable hitSlop={8} onPress={openMenu}>
            <Text style={styles.kebab}>›››</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  //›   ⋯
  baseCard: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: "#666",
    minHeight: 100,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pressedCard: { borderColor: "white" },
  cardTitle: { color: "white", fontSize: 22, fontWeight: "600" },
  kebab: { color: "#aaa", fontSize: 20 },
  renameRow: { gap: 8 },
  renameInput: {
    backgroundColor: "#111",
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 8,
  },
  renameBtn: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#222",
    borderWidth: 1,
    borderColor: "#333",
    marginRight: 8,
    marginTop: 4,
  },
  renameBtnText: { color: "white", fontWeight: "600" },
});
