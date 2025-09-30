import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import React, { useState, useMemo, useEffect } from "react";
import { WorkoutList } from "../../components/workouts/WorkoutList";
import { AddWorkout } from "../../components/workouts/AddWorkout";
import WeekStrip from "../../components/calendarstrip/WeekStrip";
import { storage } from "../../storage/sqliteAdapter";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const Home = () => {
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [draftWorkoutName, setDraftWorkoutName] = useState("");
  const [workouts, setWorkouts] = useState([]);

  const [ready, setReady] = useState(false);

  const loadWorkouts = React.useCallback(async () => {
    try {
      if (!storage.ready) await storage.init(); // init once if needed
      const rows = await storage.getAllWorkouts(); // [{ workoutId, name }]
      setWorkouts(rows.map((r) => ({ id: r.workoutId, name: r.name })));
      setReady(true);
    } catch (e) {
      console.warn("loadWorkouts failed:", e);
    }
  }, []);

  React.useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  useFocusEffect(
    React.useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );

  function formatLocalYYYYMMDD(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const [selectedDate, setSelectedDate] = useState(formatLocalYYYYMMDD());

  const normalizeName = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

  const router = useRouter();
  const openWorkout = (workoutId, name) => {
    router.push({
      pathname: "../exercises/[workoutId]",
      params: { workoutId, name, selectedDate },
    });
  };

  async function handleSaveWorkout() {
    const nameRaw = draftWorkoutName;
    const name = normalizeName(nameRaw);

    if (!name) return;
    const exists = workouts.some((w) => normalizeName(w.name) === name);
    if (exists) return;

    const newWorkout = { id: Date.now().toString(), name: nameRaw.trim() };
    setWorkouts((prev) => [...prev, newWorkout]);
    setDraftWorkoutName("");
    setIsAddingWorkout(false);

    try {
      await storage.createWorkout(newWorkout.id, newWorkout.name);
    } catch (e) {
      // (optional) revert if you want; for now we’ll just log
      console.warn("createWorkout failed:", e);
    }
  }

  async function removeWorkout(workoutId) {
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));

    try {
      await storage.deleteWorkout(workoutId);
    } catch (e) {
      console.warn("deleteWorkout failed:", e);
    }
  }

  async function renameWorkout(workoutId, nameRaw) {
    const clean = String(nameRaw ?? "").trim();
    if (!clean) return;
    // prevent duplicates by normalized name (but ignore same ID)
    const dup = workouts.some(
      (w) =>
        w.id !== workoutId && normalizeName(w.name) === normalizeName(clean)
    );
    if (dup) return;
    setWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, name: clean } : w))
    );

    try {
      await storage.renameWorkout(workoutId, clean);
    } catch (e) {
      console.warn("renameWorkout failed:", e);
    }
  }

  function moveWorkout(workoutId, direction) {
    setWorkouts((prev) => {
      const idx = prev.findIndex((w) => w.id === workoutId);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;

      const next = [...prev];
      const a = next[idx].id;
      const b = next[swapIdx].id;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];

      // persist in background
      storage
        .swapWorkoutPositions(a, b)
        .catch((e) => console.warn("reorder failed:", e));
      return next;
    });
  }

  return (
    <View style={styles.screen}>
      <WeekStrip selectedDate={selectedDate} onChange={setSelectedDate} />
      {/* <WeekPills selectedDate={selectedDate} onChange={setSelectedDate} /> */}
      <Text style={styles.sectionTitle}>Workouts</Text>

      {/* Add Button*/}
      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
        onPress={() => {
          ready && setIsAddingWorkout(true);
        }}
      >
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>

      {/* New Workout Input */}
      {isAddingWorkout && (
        <AddWorkout
          value={draftWorkoutName}
          onChange={setDraftWorkoutName}
          onCancel={() => setIsAddingWorkout(false)}
          onSave={handleSaveWorkout}
        />
      )}

      {/* Workout List */}
      <WorkoutList
        workouts={workouts}
        onPress={(id, name) => openWorkout(id, name, selectedDate)}
        onRemove={removeWorkout}
        onRename={renameWorkout}
        onMove={moveWorkout}
      />
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000", // dark, spacey base
    paddingHorizontal: 12,
    //paddingTop: 24, // room for the header (safe-ish)
  },

  sectionTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 12,
  },

  addButton: {
    backgroundColor: "#111",
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#151515",
  },
  addButtonPressed: { borderColor: "white" },
  addButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
