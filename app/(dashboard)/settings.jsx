import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { storage } from "../../storage/sqliteAdapter";
import { Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const settings = () => {
  //
  const onExport = useCallback(async () => {
    try {
      await storage.init();

      const dump = await storage.exportAll();
      const json = JSON.stringify(dump, null, 2);

      const ymd = new Date().toISOString().slice(0, 10);
      const filename = `starset-export-${ymd}.json`;
      const uri = FileSystem.documentDirectory + filename;

      await FileSystem.writeAsStringAsync(uri, json, { encoding: "utf8" });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "Export StarSet data",
        });
      }
    } catch (e) {
      console.warn("export failed:", e);
      Alert.alert("Export failed", String(e?.message ?? e));
    }
  }, []);

  const onImport = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;

      const file = res.assets?.[0];
      if (!file?.uri) {
        Alert.alert("Import", "No file selected.");
        return;
      }

      const raw = await FileSystem.readAsStringAsync(file.uri);

      await storage.importAll(raw);

      Alert.alert(
        "Import complete",
        "Exercises & sessions merged. If you don’t see updates immediately, back out and re-enter the screen."
      );

      // await refresh();
    } catch (e) {
      console.warn("import failed:", e);
      Alert.alert("Import failed", String(e?.message ?? e));
    }
  }, []);

  const [allExercises, setAllExercises] = React.useState([]);

  const loadExercises = React.useCallback(async () => {
    try {
      await storage.init();
      const rows = await storage.db.getAllAsync(
        `SELECT exerciseId, name, type, quantityUnit, countUnit
           FROM exercises
          ORDER BY name ASC`
      );
      setAllExercises(rows);
    } catch (e) {
      console.warn("load exercises for Settings failed:", e);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        await loadExercises();
      })();
    }, [loadExercises])
  );

  const [selectedExerciseId, setSelectedExerciseId] = React.useState(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const selectedExerciseName =
    allExercises.find((e) => e.exerciseId === selectedExerciseId)?.name ??
    "Select exercise";

  const [fromYMD, setFromYMD] = React.useState(""); // "2025-09-01"
  const [toYMD, setToYMD] = React.useState("");

  function localYMDToUtcKey(ymd) {
    const m = ymd?.match?.(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0, 0);
    return d.toISOString();
  }

  const onDeleteExerciseEverywhere = React.useCallback(() => {
    if (!selectedExerciseId) {
      Alert.alert("Pick exercise", "Please select an exercise first.");
      return;
    }
    const label =
      allExercises.find((e) => e.exerciseId === selectedExerciseId)?.name ??
      "this exercise";

    Alert.alert(
      "Delete exercise",
      `Remove "${label}" from all workouts and delete ALL its history?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await storage.deleteExerciseEverywhere(selectedExerciseId);
              Alert.alert("Done", "Exercise and all its data were deleted.");
            } catch (e) {
              console.warn("deleteExerciseEverywhere failed:", e);
              Alert.alert("Failed", String(e?.message ?? e));
            }
          },
        },
      ]
    );
  }, [selectedExerciseId, allExercises]);

  const onDeleteExerciseRange = React.useCallback(() => {
    if (!selectedExerciseId) {
      Alert.alert("Pick exercise", "Please select an exercise first.");
      return;
    }
    const fromKey = localYMDToUtcKey(fromYMD);
    const toKey = localYMDToUtcKey(toYMD);
    if (!fromKey || !toKey) {
      Alert.alert("Bad dates", "Please enter dates as YYYY-MM-DD.");
      return;
    }
    if (fromKey > toKey) {
      Alert.alert("Bad range", "From-date must be before or equal to To-date.");
      return;
    }

    const label =
      allExercises.find((e) => e.exerciseId === selectedExerciseId)?.name ??
      "this exercise";

    Alert.alert(
      "Delete in date range",
      `Delete history for "${label}" between ${fromYMD} and ${toYMD}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await storage.deleteExerciseHistoryInRange(
                selectedExerciseId,
                fromKey,
                toKey
              );
              Alert.alert(
                "Done",
                "Selected range was deleted for this exercise."
              );
            } catch (e) {
              console.warn("deleteExerciseHistoryInRange failed:", e);
              Alert.alert("Failed", String(e?.message ?? e));
            }
          },
        },
      ]
    );
  }, [selectedExerciseId, fromYMD, toYMD, allExercises]);

  return (
    //
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#000" }}
      edges={["bottom", "left", "right"]}
    >
      <ScrollView
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 360 }}
      >
        <View style={styles.screen}>
          <Text style={styles.title}>Settings</Text>

          {/* Import / Export */}
          <Text style={styles.sectionHeader}>Import / Export</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
              ]}
              onPress={onExport}
            >
              <Text style={styles.btnText}>Export JSON</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
              ]}
              onPress={onImport}
            >
              <Text style={styles.btnText}>Import JSON</Text>
            </Pressable>
          </View>

          {/* Data management */}
          <Text style={styles.sectionHeader}>Data management</Text>
          <View style={styles.card}>
            {/* RESET ALL DATA */}
            <Pressable
              style={({ pressed }) => [
                styles.btnWarn,
                pressed && styles.btnPressed,
              ]}
              onPress={() => {
                Alert.alert(
                  "Confirm Reset",
                  "This will permanently delete all workouts, exercises, and history. Continue?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Reset",
                      style: "destructive",
                      onPress: async () => {
                        await storage.resetAllData();
                        Alert.alert("Done", "All data cleared.");
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.btnText}>Reset All Data</Text>
            </Pressable>

            {/* Delete/Reset — single exercise */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Exercise</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.select,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => setPickerOpen(true)}
              >
                <Text style={styles.selectText}>{selectedExerciseName}</Text>
              </Pressable>

              {/* The modal “dropdown” */}
              <Modal
                visible={pickerOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setPickerOpen(false)}
              >
                <View style={styles.modalBackdrop}>
                  <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>Select exercise</Text>
                    <ScrollView style={{ maxHeight: 320 }}>
                      {allExercises.map((e) => (
                        <Pressable
                          key={e.exerciseId}
                          style={({ pressed }) => [
                            styles.row,
                            pressed && { backgroundColor: "#151515" },
                          ]}
                          onPress={() => {
                            setSelectedExerciseId(e.exerciseId);
                            setPickerOpen(false);
                          }}
                        >
                          <Text style={styles.rowText}>{e.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <Pressable
                      style={({ pressed }) => [
                        styles.btn,
                        pressed && styles.btnPressed,
                        { marginTop: 12 },
                      ]}
                      onPress={() => setPickerOpen(false)}
                    >
                      <Text style={styles.btnText}>Close</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>

              <Pressable
                style={({ pressed }) => [
                  styles.btnWarn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onDeleteExerciseEverywhere}
              >
                <Text style={styles.btnText}>Delete exercise everywhere</Text>
              </Pressable>

              <View style={{ height: 8 }} />

              <Text style={styles.label}>Delete range (YYYY-MM-DD)</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="From"
                  placeholderTextColor="#666"
                  value={fromYMD}
                  onChangeText={setFromYMD}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="To"
                  placeholderTextColor="#666"
                  value={toYMD}
                  onChangeText={setToYMD}
                  autoCapitalize="none"
                />
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  pressed && styles.btnPressed,
                ]}
                onPress={onDeleteExerciseRange}
              >
                <Text style={styles.btnText}>Delete history in range</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default settings;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 12,
    //paddingTop: 24,
  },

  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
  },
  sectionHeader: {
    color: "#9aa0a6",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },

  btn: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  btnWarn: {
    backgroundColor: "#160b0b",
    borderWidth: 1,
    borderColor: "#3a1f1f",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  btnPressed: { opacity: 0.85, borderColor: "#555" },
  btnText: { color: "#fff", fontWeight: "600" },

  cardTitle: {
    color: "#fff",
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 16,
  },
  label: {
    color: "#bbb",
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#0e0e0e",
    borderWidth: 1,
    borderColor: "#222",
    color: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  select: {
    backgroundColor: "#0e0e0e",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  selectText: { color: "#fff", fontWeight: "600" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#0b0b0b",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    padding: 12,
  },
  modalTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  rowText: { color: "#fff" },
});
