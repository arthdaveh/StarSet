import { View, Text, StyleSheet, Pressable } from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import WeekPills from "../../components/calendarstrip/WeekPills";
import AddExercise from "../../components/exercises/AddExercise";
import ExerciseList from "../../components/exercises/ExerciseList";
import WeekStrip from "../../components/calendarstrip/WeekStrip";
import { useRouter } from "expo-router";
import { EXERCISE_TYPES } from "../../components/general/exerciseTypes";
import {
  formatNum,
  convertWeight,
  summarizeSession,
  formatPrettyDate,
} from "../../components/general/metrics";
import { storage } from "../../storage/sqliteAdapter";
import { newId } from "../../storage/id";

//yeah this is a nightmare
export default function WorkoutScreen() {
  const [isReordering, setIsReordering] = useState(false);
  const [selectedReorderExId, setSelectedReorderExId] = useState(null);

  const { workoutId, name, selectedDate: sd } = useLocalSearchParams();
  const workoutName = name;

  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [draftExerciseName, setDraftExerciseName] = useState("");
  const [exercises, setExercises] = useState([]);

  const normalizeName = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

  const [sessionsByExercise, setSessionsByExercise] = useState({});

  const [exercisesById, setExercisesById] = useState({});

  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [all, rows] = await Promise.all([
          storage.getAllExercises(),
          storage.getWorkoutExercisesWithMeta(workoutId),
        ]);
        if (!alive) return;

        const globalMap = {};
        for (const r of all) {
          globalMap[r.exerciseId] = {
            name: r.name,
            type: r.type,
            unit: {
              quantityUnit: r.quantityUnit || "",
              countUnit: r.countUnit || "",
            },
            display: EXERCISE_TYPES[r.type]?.display,
            archived: false,
          };
        }

        const workoutMap = {};
        for (const r of rows) {
          workoutMap[r.exerciseId] = {
            name: r.name,
            type: r.type,
            unit: {
              quantityUnit: r.quantityUnit || "",
              countUnit: r.countUnit || "",
            },
            display: EXERCISE_TYPES[r.type]?.display,
            archived: false,
          };
        }

        setExercisesById((prev) => ({
          ...globalMap,
          ...prev,
          ...workoutMap,
        }));

        setExercises((prev) => {
          const fromDb = rows.map((r) => r.exerciseId);
          const optimistic = prev.filter((id) => !fromDb.includes(id));
          return [...optimistic, ...fromDb];
        });

        const mergedIds = Array.from(
          new Set([...rows.map((r) => r.exerciseId), ...exercises])
        );

        for (const eid of mergedIds) {
          const map = await storage.getSessionsMapForExercise(eid);
          if (!alive) return;
          setSessionsByExercise((prev) => ({
            ...prev,
            [eid]: { ...(prev[eid] ?? {}), ...map },
          }));
        }
      } catch (e) {
        console.warn("load exercises failed:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [workoutId, exercises.length]);

  function openHistory(exerciseId) {
    const ex = exercisesById[exerciseId];
    const name = ex?.name || "Exercise";
    const metaUnit = ex?.unit ?? ex?.units ?? {};
    const units = {
      qUnit: metaUnit.quantityUnit || "",
      cUnit: metaUnit.countUnit || "",
    };
    const data = JSON.stringify(sessionsByExercise[exerciseId] ?? {});
    router.push({
      pathname: "/history/[exerciseId]",
      params: {
        exerciseId,
        name,
        units: JSON.stringify(units),
        data,
        workoutId,
        workoutName,
      },
    });
  }

  // Selected Date Logic
  function formatLocalYYYYMMDD(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function localYMDToUtcKey(ymd) {
    //wrong function name but whatever
    return ymd;
  }

  function utcKeyToLocalYMD(iso) {
    //wrong function name but whatever
    return iso;
  }

  const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const initial = typeof sd === "string" ? sd : formatLocalYYYYMMDD();
  const [selectedDate, setSelectedDate] = useState(initial);

  useEffect(() => {
    if (typeof sd === "string" && sd !== selectedDate) {
      setSelectedDate(sd);
    }
  }, [sd]);

  function readSession(exerciseId) {
    const key = localYMDToUtcKey(selectedDate);
    return sessionsByExercise[exerciseId]?.[key] ?? null;
  }

  function readPrevSession(exerciseId) {
    const exMap = sessionsByExercise[exerciseId];
    if (!exMap) return null;

    const keys = Object.keys(exMap).sort();
    const currentKey = localYMDToUtcKey(selectedDate);
    const prevDates = keys.filter((k) => k < currentKey);

    if (!prevDates.length) return null;
    const lastKey = prevDates[prevDates.length - 1];
    return {
      date: utcKeyToLocalYMD(lastKey), // local YMD for display
      entry: exMap[lastKey],
    };
  }

  function persistSession(exerciseId, patch) {
    setSessionsByExercise((prev) => {
      const prevForEx = prev[exerciseId] ?? {};
      const key = localYMDToUtcKey(selectedDate);
      const prevForDate = prevForEx[key] ?? { sets: [], notes: "" };

      const nextForDate = {
        ...prevForDate,
        ...(patch.sets !== undefined ? { sets: patch.sets } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      };

      const next = {
        ...prev,
        [exerciseId]: {
          ...prevForEx,
          [key]: nextForDate,
        },
      };
      // save to DB
      storage
        .saveSession(exerciseId, key, {
          notes: nextForDate.notes,
          sets: nextForDate.sets,
        })
        .catch((e) => console.warn("saveSession failed:", e));

      return next;
    });
  }

  async function handleSaveExercise(
    nameRawFromChild,
    typeFromChild,
    unitFromChild = {}
  ) {
    const nameRaw = nameRawFromChild ?? draftExerciseName;
    const name = normalizeName(nameRaw);
    const idFormat = newId();

    // 1) No name or Already in workout
    if (!name) return;

    //const existsInWorkout = exercises.some((e) => normalizeName(e.name) === name);

    const existsInWorkout = exercises.some(
      (eid) => normalizeName(exercisesById[eid]?.name || "") === name
    );

    if (existsInWorkout) return;

    // 2) Already in global exercise list
    const existingId = Object.keys(exercisesById).find(
      (eid) => normalizeName(exercisesById[eid]?.name || "") === name
    );

    let exerciseId = existingId;
    // >> If there is no exercise Id, create a new exercise
    if (!exerciseId) {
      exerciseId = idFormat;
      setExercisesById((prev) => ({
        ...prev,
        [exerciseId]: {
          name: nameRaw.trim(),
          type: typeFromChild,
          unit: unitFromChild,
          display: EXERCISE_TYPES[typeFromChild]?.display,
          archived: false,
        },
      }));
    }

    setExercises((prev) => [exerciseId, ...prev]);

    // >> Cleanup
    setDraftExerciseName("");
    setIsAddingExercise(false);

    try {
      // ensure the exercise exists in DB
      const ensuredId = await storage.ensureExercise(
        exerciseId,
        nameRaw.trim(),
        typeFromChild,
        {
          quantityUnit: unitFromChild?.quantityUnit ?? "",
          countUnit: unitFromChild?.countUnit ?? "",
        }
      );

      // if db reused an existing exercise, fix state to match
      if (ensuredId !== exerciseId) {
        setExercises((prev) => [
          ensuredId,
          ...prev.filter((id) => id !== exerciseId),
        ]);
      }

      //link it to this workout
      await storage.addExerciseToWorkout(workoutId, ensuredId);
    } catch (e) {
      console.warn("persist new exercise/link failed:", e);
    }
  }

  function removeExerciseFromWorkout(exerciseId) {
    setExercises((prev) => prev.filter((id) => id !== exerciseId));

    storage
      .removeExerciseFromWorkout(workoutId, exerciseId)
      .catch((e) => console.warn("removeExerciseFromWorkout failed:", e));
  }

  function renameExercise(exerciseId, nameRaw) {
    const clean = String(nameRaw ?? "").trim();
    if (!clean) return;

    const norm = normalizeName(clean);

    const existsGlobally = Object.entries(exercisesById).some(
      ([eid, info]) =>
        eid !== exerciseId && normalizeName(info?.name || "") === norm
    );
    if (existsGlobally) return;

    setExercisesById((prev) => ({
      ...prev,
      [exerciseId]: { ...(prev[exerciseId] ?? {}), name: clean },
    }));

    storage
      .renameExercise(exerciseId, clean)
      .catch((e) => console.warn("renameExercise failed:", e));
  }

  const alreadyInWorkout = new Set(exercises);
  const query = normalizeName(draftExerciseName);
  const suggestions = query
    ? Object.entries(exercisesById)
        .filter(([eid, meta]) => {
          if (alreadyInWorkout.has(eid)) return false;
          const n = normalizeName(meta?.name || "");
          return n.includes(query);
        })
        .slice(0, 6)
    : [];

  async function addExerciseById(eid) {
    if (!eid || alreadyInWorkout.has(eid)) return;
    setExercises((prev) => [eid, ...prev]);
    setDraftExerciseName("");
    setIsAddingExercise(false);

    try {
      await storage.addExerciseToWorkout(workoutId, eid);
    } catch (e) {
      console.warn("link existing exercise failed:", e);
    }
  }

  function startReorderMode(exId) {
    setIsReordering(true);
    setSelectedReorderExId(exId);
  }

  function endReorderMode() {
    setIsReordering(false);
    setSelectedReorderExId(null);
  }

  function moveExercise(exerciseId, direction) {
    setExercises((prev) => {
      const idx = prev.findIndex((eid) => eid === exerciseId);
      if (idx < 0) return prev;

      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;

      const newArr = [...prev];
      const a = newArr[idx];
      const b = newArr[swapIdx];

      // swap in UI
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];

      // persist swap in DB (background)
      storage
        .swapExercisePositions(workoutId, a, b)
        .catch((e) => console.warn("swapExercisePositions failed:", e));

      return newArr;
    });
  }

  function setExerciseUnits(exerciseId, unitsPatch) {
    setExercisesById((prev) => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] ?? {}),
        unit: { ...(prev[exerciseId]?.unit ?? {}), ...unitsPatch },
      },
    }));

    storage
      .updateExerciseUnits(exerciseId, {
        quantityUnit: unitsPatch.quantityUnit,
        countUnit: unitsPatch.countUnit,
      })
      .catch((e) => console.warn("updateExerciseUnits failed:", e));
  }

  return (
    <View style={styles.screen}>
      <WeekStrip selectedDate={selectedDate} onChange={setSelectedDate} />
      {/* <WeekPills selectedDate={selectedDate} onChange={setSelectedDate} /> */}

      <Text style={styles.title}>{name ?? "Workout"}</Text>
      {/* Add Button : setIsAddingExercise = true */}
      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
        onPress={() => {
          setIsAddingExercise(true);
        }}
      >
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>

      {/* New Exercise Input */}
      {isAddingExercise && (
        <AddExercise
          value={draftExerciseName}
          onChange={setDraftExerciseName}
          onSave={handleSaveExercise}
          onCancel={() => setIsAddingExercise(false)}
          suggestions={suggestions}
          onPickSuggestion={addExerciseById}
        />
      )}

      {/* Display Exercise List */}
      <ExerciseList
        exercises={exercises}
        exercisesById={exercisesById}
        onRemove={removeExerciseFromWorkout}
        onReadSession={readSession}
        onPersistSession={persistSession}
        selectedDate={selectedDate}
        onRename={renameExercise}
        onMove={moveExercise}
        onReorder={startReorderMode}
        isReordering={isReordering}
        selectedReorderExId={selectedReorderExId}
        onSelectForReorder={setSelectedReorderExId}
        onChangeUnits={setExerciseUnits}
        onReadPrevSession={readPrevSession}
        onOpenHistory={openHistory}
        utils={{ formatNum, convertWeight, summarizeSession, formatPrettyDate }}
      />

      {isReordering && (
        <View style={styles.reorderBar}>
          <Pressable
            style={({ pressed }) => [
              styles.reorderBtn,
              pressed && styles.reorderBtnPressed,
            ]}
            onPress={() => {
              moveExercise(selectedReorderExId, "down");
            }}
          >
            <Text style={styles.reorderBtnText}>-</Text>
          </Pressable>

          <Pressable
            onPress={endReorderMode}
            style={({ pressed }) => [
              styles.reorderDoneBtn,
              pressed && styles.reorderBtnPressed,
            ]}
          >
            <Text style={styles.reorderDoneText}>Done</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.reorderBtn,
              pressed && styles.reorderBtnPressed,
            ]}
            onPress={() => {
              moveExercise(selectedReorderExId, "up");
            }}
          >
            <Text style={styles.reorderBtnText}>+</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 12,
    //paddingTop: 24
  },
  title: {
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
    marginBottom: 5,
  },
  addButtonPressed: { borderColor: "white" },
  addButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },

  // -- Reorder Bar --
  reorderBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 61,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.92)",
  },

  reorderBtn: {
    width: 56,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  reorderBtnText: {
    fontSize: 22,
    color: "white",
  },

  reorderDoneBtn: {
    flex: 1,
    marginHorizontal: 12,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  reorderDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },

  reorderBtnPressed: {
    backgroundColor: "rgba(0,0,0,0.35)",
    transform: [{ scale: 0.98 }],
  },
});
